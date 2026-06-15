import EventBus from '../managers/EventBus';
import type MainScene from '../scenes/MainScene';
import { getLanguage, isLanguage, setLanguage, t } from '../i18n';
import {
    getLegacySettingsRefs,
    guardLegacySettingsRefs,
    setLegacySettingsOpen,
    syncLegacySettingsInputs,
    type LegacySettingsRefs
} from './legacySettings';
import {
    DEFAULT_FPS_LIMIT,
    DEFAULT_VOLUME_PERCENT,
    createSettingsDisplayPayload,
    normalizeFpsLimit,
    normalizeVolumePercent
} from './settingsDisplay';
import { guardDomPointer, restoreGameCanvasFocus } from './domEnvironment';
import {
    RENDER_RESOLUTION_STORAGE_KEY,
    applyRenderResolution as applyGameRenderResolution,
    normalizeRenderResolutionPreset,
    readStoredRenderResolutionPreset
} from './renderResolution';
import type { RenderResolutionPreset } from '../types';

const OWNER = 'SettingsController';

export default class SettingsController {
    private volumeInput: HTMLInputElement | null = null;
    private mutedInput: HTMLInputElement | null = null;
    private bloomInput: HTMLInputElement | null = null;
    private settingsRefs: LegacySettingsRefs | null = null;
    private currentFps: number = DEFAULT_FPS_LIMIT;
    private currentVolume: number = DEFAULT_VOLUME_PERCENT;
    private currentMuted: boolean = false;
    private currentBloomEnabled: boolean = true;
    private currentRenderResolutionPreset: RenderResolutionPreset = 'auto';
    private settingsOpen: boolean = false;
    private readonly handleLanguageChange = (): void => {
        this.syncLanguageButtons();
        this.publishSnapshot(this.isOpen());
    };

    constructor(private scene: MainScene) {}

    setup(): void {
        EventBus.offAll(OWNER);
        window.removeEventListener('languagechange', this.handleLanguageChange);

        const refs = getLegacySettingsRefs();
        const audioSettings = this.scene.soundManager?.getSettings?.();
        this.settingsRefs = refs;
        this.volumeInput = refs.volumeInput;
        this.mutedInput = refs.mutedInput;
        this.bloomInput = refs.bloomInput;
        this.currentVolume = audioSettings
            ? normalizeVolumePercent(audioSettings.masterVolume * 100)
            : this.currentVolume;
        this.currentMuted = audioSettings?.muted ?? this.currentMuted;
        this.currentBloomEnabled = this.scene.bloomEnabled;

        guardLegacySettingsRefs(refs, guardDomPointer);
        syncLegacySettingsInputs(refs, {
            bloomEnabled: this.currentBloomEnabled,
            fps: this.currentFps,
            language: getLanguage(),
            muted: this.currentMuted,
            volume: this.currentVolume
        });

        if (refs.btnSettings && refs.modalSettings) {
            refs.btnSettings.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                this.openModal();
            };
        }

        if (refs.btnClose && refs.modalSettings) {
            refs.btnClose.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                this.closeModal();
            };
        }

        if (refs.btnSave) refs.btnSave.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            EventBus.emit('SAVE_REQUESTED');
        };
        if (refs.btnLoad) refs.btnLoad.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            EventBus.emit('LOAD_REQUESTED');
        };
        if (refs.btnResetTutorial) {
            refs.btnResetTutorial.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                this.resetTutorial();
            };
        }

        refs.languageButtons.forEach(button => {
            button.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                const language = button.dataset.language;
                if (isLanguage(language)) {
                    setLanguage(language);
                    this.syncLanguageButtons();
                    this.publishSnapshot(this.isOpen());
                }
            };
        });
        window.addEventListener('languagechange', this.handleLanguageChange);
        this.scene.events.once('shutdown', () => this.teardown());
        this.syncLanguageButtons();

        const emitAudioSettings = () => {
            this.currentVolume = this.volumeInput
                ? normalizeVolumePercent(Number(this.volumeInput.value))
                : this.currentVolume;
            this.currentMuted = this.mutedInput ? this.mutedInput.checked : this.currentMuted;
            EventBus.emit('AUDIO_SETTINGS_CHANGED', { masterVolume: this.currentVolume / 100, muted: this.currentMuted });
            this.publishSnapshot(this.isOpen());
        };
        if (this.volumeInput) this.volumeInput.oninput = emitAudioSettings;
        if (this.mutedInput) this.mutedInput.onchange = emitAudioSettings;

        if (this.bloomInput) {
            this.bloomInput.onchange = () => {
                this.currentBloomEnabled = this.bloomInput!.checked;
                this.scene.setBloomEnabled(this.currentBloomEnabled);
                this.publishSnapshot(this.isOpen());
            };
        }

        [1, 2, 3].forEach(speed => {
            const btn = refs.speedButtons.find(button => button.id === `btn-speed-${speed}`);
            if (btn) {
                btn.onclick = event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.setSpeed(speed);
                };
            }
        });

        const savedFps = parseInt(localStorage.getItem('gradium_fps_limit') || String(DEFAULT_FPS_LIMIT), 10);
        const initialFps = normalizeFpsLimit(savedFps);
        this.applyFpsLimit(initialFps);
        this.applyRenderResolution(readStoredRenderResolutionPreset());
        this.publishSnapshot(false);

        refs.fpsButtons.forEach(btn => {
            btn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                const requestedFps = parseInt(btn.dataset.fps || String(DEFAULT_FPS_LIMIT), 10);
                const fps = normalizeFpsLimit(requestedFps);
                this.applyFpsLimit(fps);
                localStorage.setItem('gradium_fps_limit', String(fps));
                this.publishSnapshot(this.isOpen());
            };
        });

        EventBus.on('SETTINGS_CLOSE_REQUESTED', () => {
            this.closeModal();
        }, OWNER);
        EventBus.on('SETTINGS_OPEN_REQUESTED', () => {
            this.openModal();
        }, OWNER);
        EventBus.on('SETTINGS_SPEED_REQUESTED', ({ speed }: { speed: number }) => {
            this.setSpeed(speed);
        }, OWNER);
        EventBus.on('SETTINGS_FPS_REQUESTED', ({ fps }: { fps: number }) => {
            const clamped = normalizeFpsLimit(fps);
            this.applyFpsLimit(clamped);
            localStorage.setItem('gradium_fps_limit', String(clamped));
            this.publishSnapshot(this.isOpen());
        }, OWNER);
        EventBus.on('SETTINGS_RENDER_RESOLUTION_REQUESTED', ({ preset }: { preset: string }) => {
            const normalized = normalizeRenderResolutionPreset(preset);
            this.applyRenderResolution(normalized);
            localStorage.setItem(RENDER_RESOLUTION_STORAGE_KEY, normalized);
            this.publishSnapshot(this.isOpen());
        }, OWNER);
        EventBus.on('SETTINGS_AUDIO_REQUESTED', ({ volume, muted }: { volume: number; muted: boolean }) => {
            const clampedVolume = normalizeVolumePercent(volume);
            this.currentVolume = clampedVolume;
            this.currentMuted = muted;
            if (this.volumeInput) this.volumeInput.value = String(clampedVolume);
            if (this.mutedInput) this.mutedInput.checked = muted;
            EventBus.emit('AUDIO_SETTINGS_CHANGED', { masterVolume: clampedVolume / 100, muted });
            this.publishSnapshot(this.isOpen());
        }, OWNER);
        EventBus.on('SETTINGS_BLOOM_REQUESTED', ({ enabled }: { enabled: boolean }) => {
            this.currentBloomEnabled = enabled;
            if (this.bloomInput) this.bloomInput.checked = enabled;
            this.scene.setBloomEnabled(enabled);
            this.publishSnapshot(this.isOpen());
        }, OWNER);
        EventBus.on('SETTINGS_LANGUAGE_REQUESTED', ({ language }: { language: string }) => {
            if (!isLanguage(language)) return;
            setLanguage(language);
            this.syncLanguageButtons();
            this.publishSnapshot(this.isOpen());
        }, OWNER);
        EventBus.on('SETTINGS_RESET_TUTORIAL_REQUESTED', () => {
            this.resetTutorial();
        }, OWNER);
    }

    openModal(): void {
        this.settingsOpen = true;
        if (this.settingsRefs) setLegacySettingsOpen(this.settingsRefs, true);

        const currentAudio = this.scene.soundManager?.getSettings?.();
        if (this.volumeInput && currentAudio) this.volumeInput.value = String(normalizeVolumePercent(currentAudio.masterVolume * 100));
        if (this.mutedInput && currentAudio) this.mutedInput.checked = currentAudio.muted;
        if (this.bloomInput) this.bloomInput.checked = this.scene.bloomEnabled;
        this.currentVolume = currentAudio
            ? normalizeVolumePercent(currentAudio.masterVolume * 100)
            : this.currentVolume;
        this.currentMuted = currentAudio?.muted ?? this.currentMuted;
        this.currentBloomEnabled = this.scene.bloomEnabled;
        this.publishSnapshot(true);
    }

    private closeModal(): void {
        this.settingsOpen = false;
        if (this.settingsRefs) setLegacySettingsOpen(this.settingsRefs, false);
        this.publishSnapshot(false);
        restoreGameCanvasFocus();
    }

    private setSpeed(speed: number): void {
        this.scene.setGameSpeed(speed);
        this.publishSnapshot(this.isOpen());
    }

    private applyFpsLimit(fps: number): void {
        this.currentFps = fps;
        const game = this.scene.game;
        if (game?.loop) {
            (game.loop as any).targetFps = fps;
        }
        if (this.settingsRefs) {
            syncLegacySettingsInputs(this.settingsRefs, {
                bloomEnabled: this.currentBloomEnabled,
                fps
            });
        }
    }

    private applyRenderResolution(preset: RenderResolutionPreset): void {
        this.currentRenderResolutionPreset = normalizeRenderResolutionPreset(preset);
        applyGameRenderResolution(this.scene.game, this.currentRenderResolutionPreset);
    }

    private resetTutorial(): void {
        localStorage.setItem('gradium_tutorial_completed', 'false');
        localStorage.setItem('gradium_tutorial_step', '0');
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', { message: t('log.tutorialRestarted') });
        this.publishSnapshot(false);
        this.scene.scene.start('MainScene', {
            mode: 'tutorial',
            difficulty: this.scene.difficultyId
        });
    }

    private isOpen(): boolean {
        return this.settingsOpen;
    }

    private syncLanguageButtons(): void {
        if (!this.settingsRefs) return;
        syncLegacySettingsInputs(this.settingsRefs, {
            bloomEnabled: this.currentBloomEnabled,
            fps: this.currentFps,
            language: getLanguage()
        });
    }

    private publishSnapshot(open: boolean): void {
        const payload = createSettingsDisplayPayload({
            open,
            speed: this.scene.gameSpeed,
            fps: this.currentFps,
            renderResolutionPreset: this.currentRenderResolutionPreset,
            volume: this.currentVolume,
            muted: this.currentMuted,
            bloomEnabled: this.currentBloomEnabled,
            language: getLanguage()
        });
        if (this.settingsRefs) {
            setLegacySettingsOpen(this.settingsRefs, payload.legacySettings.open);
            syncLegacySettingsInputs(this.settingsRefs, payload.legacySettings.inputs);
        }
        EventBus.emit('SETTINGS_MODAL_UPDATED', payload.snapshot);
    }

    private teardown(): void {
        window.removeEventListener('languagechange', this.handleLanguageChange);
        EventBus.offAll(OWNER);
    }
}
