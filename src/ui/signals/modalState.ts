import { signal } from '@preact/signals';
import type { GameOverSnapshot, ResearchPanelSnapshot, SettingsModalSnapshot } from '../../types';

export const settingsModal = signal<SettingsModalSnapshot>({
    open: false,
    speed: 1,
    fps: 60,
    renderResolutionPreset: 'auto',
    volume: 60,
    muted: false,
    bloomEnabled: true,
    language: 'ko',
    labels: {
        aria: '',
        kicker: '',
        title: '',
        close: '',
        tabs: {
            game: '',
            audio: '',
            graphics: '',
            system: ''
        },
        speed: '',
        language: '',
        languageKo: '',
        languageEn: '',
        masterVolume: '',
        muted: '',
        graphics: '',
        fps: '',
        renderResolution: '',
        renderResolutionOptions: {
            auto: '',
            '1920x1080': '',
            '2560x1440': '',
            '3840x2160': ''
        },
        saveData: '',
        save: '',
        load: '',
        tutorial: '',
        restartTutorial: '',
        note: '',
        bloomOn: '',
        bloomOff: ''
    }
});

export const researchPanel = signal<ResearchPanelSnapshot>({
    open: false,
    title: 'Research',
    closeLabel: 'Close',
    throughputText: '',
    queueText: '',
    dataBalances: [],
    activeResearch: null,
    researchQueue: [],
    blockedData: {
        blocked: false,
        researchId: null,
        missing: [],
        message: ''
    },
    axes: [],
    nodes: [],
    selectedId: null
});

export const gameOverScreen = signal<GameOverSnapshot>({
    open: false,
    kicker: '',
    title: '',
    failureCode: '',
    integrityLabel: '',
    restartLabel: '',
    mainMenuLabel: '',
    stats: [],
    wave: 0,
    coreHpPercent: 0,
    totalDataReceived: 0,
    unlockedResearchCount: 0
});
