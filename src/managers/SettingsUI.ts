import EventBus from './EventBus';
import type MainScene from '../scenes/MainScene';
import type UIManager from './UIManager';
import { getLanguage, isLanguage, setLanguage, t } from '../i18n';

export default class SettingsUI {
    constructor(
        private scene: MainScene,
        private uiManager: UIManager
    ) {}

    setup(): void {
        const btnSettings = document.getElementById('btn-settings');
        const modalSettings = document.getElementById('settings-modal');
        const btnClose = document.getElementById('btn-close-settings');
        const btnSave = document.getElementById('btn-save');
        const btnLoad = document.getElementById('btn-load');
        const volumeInput = document.getElementById('audio-volume') as HTMLInputElement | null;
        const mutedInput = document.getElementById('audio-muted') as HTMLInputElement | null;
        const bloomInput = document.getElementById('settings-bloom') as HTMLInputElement | null;
        const btnResetTutorial = document.getElementById('btn-reset-tutorial');
        const languageButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-language]'));
        const audioSettings = this.scene.soundManager?.getSettings?.();

        [
            btnSettings,
            modalSettings,
            btnClose,
            btnSave,
            btnLoad,
            volumeInput,
            mutedInput,
            bloomInput,
            btnResetTutorial,
            ...languageButtons
        ].forEach(element => this.uiManager.guardDomPointer(element));

        if (volumeInput && audioSettings) volumeInput.value = String(Math.round(audioSettings.masterVolume * 100));
        if (mutedInput && audioSettings) mutedInput.checked = audioSettings.muted;
        if (bloomInput) bloomInput.checked = this.scene.bloomEnabled;

        if (btnSettings && modalSettings) {
            btnSettings.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalSettings.style.display = 'flex';

                // Sync values when modal is opened
                const currentAudio = this.scene.soundManager?.getSettings?.();
                if (volumeInput && currentAudio) volumeInput.value = String(Math.round(currentAudio.masterVolume * 100));
                if (mutedInput && currentAudio) mutedInput.checked = currentAudio.muted;
                if (bloomInput) bloomInput.checked = this.scene.bloomEnabled;
            };
        }

        if (btnClose && modalSettings) {
            btnClose.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalSettings.style.display = 'none';
                this.uiManager.restoreCanvasFocus();
            };
        }

        if (btnSave) btnSave.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            EventBus.emit('SAVE_REQUESTED');
        };
        if (btnLoad) btnLoad.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            EventBus.emit('LOAD_REQUESTED');
        };
        if (btnResetTutorial) {
            btnResetTutorial.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                localStorage.setItem('gradium_tutorial_completed', 'false');
                localStorage.setItem('gradium_tutorial_step', '0');
                this.uiManager.logMessage(t('log.tutorialRestarted'));
                this.scene.scene.start('MainScene', {
                    mode: 'tutorial',
                    difficulty: this.scene.difficultyId
                });
            };
        }

        const updateLanguageButtons = () => {
            languageButtons.forEach(button => {
                button.classList.toggle('active', button.dataset.language === getLanguage());
            });
        };
        languageButtons.forEach(button => {
            button.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                const language = button.dataset.language;
                if (isLanguage(language)) {
                    setLanguage(language);
                    updateLanguageButtons();
                }
            };
        });
        window.addEventListener('languagechange', updateLanguageButtons);
        updateLanguageButtons();

        const emitAudioSettings = () => {
            const volume = volumeInput ? Number(volumeInput.value) / 100 : audioSettings?.masterVolume ?? 0.6;
            const muted = mutedInput ? mutedInput.checked : audioSettings?.muted ?? false;
            EventBus.emit('AUDIO_SETTINGS_CHANGED', { masterVolume: volume, muted });
        };
        if (volumeInput) volumeInput.oninput = emitAudioSettings;
        if (mutedInput) mutedInput.onchange = emitAudioSettings;

        if (bloomInput) {
            bloomInput.onchange = () => {
                this.scene.setBloomEnabled(bloomInput.checked);
            };
        }

        [1, 2, 3].forEach(speed => {
            const btn = document.getElementById(`btn-speed-${speed}`);
            if (btn) {
                this.uiManager.guardDomPointer(btn);
                btn.onclick = event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.scene.setGameSpeed(speed);
                };
            }
        });
    }
}
