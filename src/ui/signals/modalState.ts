import { signal } from '@preact/signals';
import type { GameOverSnapshot, ResearchPanelSnapshot, SettingsModalSnapshot, TrainingLabSnapshot } from '../../types';

export const settingsModal = signal<SettingsModalSnapshot>({
    open: false,
    speed: 1,
    fps: 60,
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

export const trainingLabModal = signal<TrainingLabSnapshot>({
    open: false,
    title: 'Neural Operations Lab',
    kicker: '',
    closeLabel: '',
    overview: '',
    plannerStatus: '',
    plannerReason: '',
    autoToggleLabel: '',
    autoEnabled: false,
    activeTab: 'DEFENSE',
    tabs: {
        defense: '',
        system: ''
    },
    rewardModeLabel: '',
    rewardAccuracyShortLabel: '',
    rewardDamageShortLabel: '',
    dataProgressLabel: '',
    workProgressLabel: '',
    toneLabels: {
        active: '',
        complete: '',
        training: '',
        locked: '',
        idle: ''
    },
    duration: '',
    rows: []
});

export const researchPanel = signal<ResearchPanelSnapshot>({
    open: false,
    title: 'Research',
    closeLabel: 'Close',
    throughputText: '',
    slotsText: '',
    buffers: [],
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
    bestModelLabel: '',
    bestModelDetail: '',
    restartLabel: '',
    mainMenuLabel: '',
    stats: [],
    wave: 0,
    coreHpPercent: 0,
    totalDataReceived: 0,
    unlockedResearchCount: 0,
    bestModelName: '',
    bestModelAccuracy: 0,
    bestModelDamageBonus: 0,
    bestModelVersion: 0
});
