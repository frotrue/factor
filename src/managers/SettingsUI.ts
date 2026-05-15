import EventBus from './EventBus';
import type MainScene from '../scenes/MainScene';
import type UIManager from './UIManager';

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
        const btnResetTutorial = document.getElementById('btn-reset-tutorial');
        const audioSettings = this.scene.soundManager?.getSettings?.();

        [
            btnSettings,
            modalSettings,
            btnClose,
            btnSave,
            btnLoad,
            volumeInput,
            mutedInput,
            btnResetTutorial
        ].forEach(element => this.uiManager.guardDomPointer(element));

        if (volumeInput && audioSettings) volumeInput.value = String(Math.round(audioSettings.masterVolume * 100));
        if (mutedInput && audioSettings) mutedInput.checked = audioSettings.muted;

        if (btnSettings && modalSettings) {
            btnSettings.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalSettings.style.display = 'flex';
            };
        }

        if (btnClose && modalSettings) {
            btnClose.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalSettings.style.display = 'none';
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
                EventBus.emit('TUTORIAL_RESET');
                this.uiManager.logMessage('Tutorial: guide restarted.');
            };
        }

        const emitAudioSettings = () => {
            const volume = volumeInput ? Number(volumeInput.value) / 100 : audioSettings?.masterVolume ?? 0.6;
            const muted = mutedInput ? mutedInput.checked : audioSettings?.muted ?? false;
            EventBus.emit('AUDIO_SETTINGS_CHANGED', { masterVolume: volume, muted });
        };
        if (volumeInput) volumeInput.oninput = emitAudioSettings;
        if (mutedInput) mutedInput.onchange = emitAudioSettings;

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
