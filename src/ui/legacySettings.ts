import { getLanguage } from '../i18n';

export type LegacySettingsRefs = {
    btnSettings: HTMLElement | null;
    modalSettings: HTMLElement | null;
    btnClose: HTMLElement | null;
    btnSave: HTMLElement | null;
    btnLoad: HTMLElement | null;
    volumeInput: HTMLInputElement | null;
    mutedInput: HTMLInputElement | null;
    bloomInput: HTMLInputElement | null;
    btnResetTutorial: HTMLElement | null;
    languageButtons: HTMLButtonElement[];
    speedButtons: HTMLElement[];
    fpsButtons: HTMLButtonElement[];
};

export function getLegacySettingsRefs(): LegacySettingsRefs {
    return {
        btnSettings: document.getElementById('btn-settings'),
        modalSettings: document.getElementById('settings-modal'),
        btnClose: document.getElementById('btn-close-settings'),
        btnSave: document.getElementById('btn-save'),
        btnLoad: document.getElementById('btn-load'),
        volumeInput: document.getElementById('audio-volume') as HTMLInputElement | null,
        mutedInput: document.getElementById('audio-muted') as HTMLInputElement | null,
        bloomInput: document.getElementById('settings-bloom') as HTMLInputElement | null,
        btnResetTutorial: document.getElementById('btn-reset-tutorial'),
        languageButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-language]')),
        speedButtons: [1, 2, 3]
            .map(speed => document.getElementById(`btn-speed-${speed}`))
            .filter((button): button is HTMLElement => Boolean(button)),
        fpsButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-fps]'))
    };
}

export function guardLegacySettingsRefs(
    refs: LegacySettingsRefs,
    guardDomPointer: (element: HTMLElement | null) => void
): void {
    [
        refs.btnSettings,
        refs.modalSettings,
        refs.btnClose,
        refs.btnSave,
        refs.btnLoad,
        refs.volumeInput,
        refs.mutedInput,
        refs.bloomInput,
        refs.btnResetTutorial,
        ...refs.languageButtons,
        ...refs.speedButtons,
        ...refs.fpsButtons
    ].forEach(element => guardDomPointer(element));
}

export function syncLegacySettingsInputs(
    refs: LegacySettingsRefs,
    state: {
        bloomEnabled: boolean;
        fps: number;
        language?: string;
        muted?: boolean;
        volume?: number;
    }
): void {
    if (refs.volumeInput && typeof state.volume === 'number') refs.volumeInput.value = String(state.volume);
    if (refs.mutedInput && typeof state.muted === 'boolean') refs.mutedInput.checked = state.muted;
    if (refs.bloomInput) refs.bloomInput.checked = state.bloomEnabled;

    const language = state.language ?? getLanguage();
    refs.languageButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.language === language);
    });
    refs.fpsButtons.forEach(button => {
        button.classList.toggle('active', parseInt(button.dataset.fps || '0', 10) === state.fps);
    });
}

export function setLegacySettingsOpen(refs: LegacySettingsRefs, open: boolean): void {
    const modal = refs.modalSettings;
    if (!modal) return;

    modal.style.display = open ? 'flex' : 'none';
    if (open) {
        modal.dataset.preactShadow = 'true';
        modal.setAttribute('aria-hidden', 'true');
        return;
    }

    delete modal.dataset.preactShadow;
    modal.removeAttribute('aria-hidden');
}

export function isLegacySettingsOpen(refs: LegacySettingsRefs): boolean {
    return refs.modalSettings?.style.display === 'flex';
}
