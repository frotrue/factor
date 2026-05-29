import { CONFIG } from '../config';
import { DEFAULT_LANGUAGE, isLanguage } from '../i18n';
import { SaveData } from '../types';
import { normalizeDefenseModelState } from './modelTrainingProgress';

export const CURRENT_SAVE_VERSION = '1.2.0';

export function migrateSaveData(rawData: unknown, fallbackDifficulty: string = 'NORMAL'): SaveData {
    const data = (rawData && typeof rawData === 'object') ? rawData as Record<string, any> : {};
    const version = data.version || '1.0.0';

    if (version === '1.0.0' || version === '1.1.0') {
        data.version = CURRENT_SAVE_VERSION;
    }

    data.timestamp = data.timestamp || Date.now();
    data.wave = {
        currentWave: data.wave?.currentWave ?? 0,
        waveTimer: data.wave?.waveTimer ?? CONFIG.TIMING.INITIAL_WAVE_DELAY_MS,
        enemiesSpawned: data.wave?.enemiesSpawned ?? 0,
        enemiesToSpawn: data.wave?.enemiesToSpawn ?? 0,
        enemies: data.wave?.enemies ?? [],
        hpMultiplier: data.wave?.hpMultiplier ?? 1,
        enemyIdCounter: data.wave?.enemyIdCounter ?? 0
    };
    data.core = {
        hp: data.core?.hp ?? CONFIG.BUILDINGS.CORE.HP ?? 1000,
        totalDataReceived: data.core?.totalDataReceived ?? 0
    };
    data.buildings = (data.buildings || []).map((building: any) => ({
        ...building,
        rotation: building.rotation ?? 0,
        inputBuffer: building.inputBuffer || [],
        outputBuffer: building.outputBuffer || [],
        hp: typeof building.hp === 'number' ? building.hp : undefined
    }));
    data.defenseModelStates = Object.fromEntries(
        Object.entries(data.defenseModelStates || {}).map(([type, state]) => [
            type,
            normalizeDefenseModelState(state as any)
        ])
    );
    data.labJobProgress = data.labJobProgress || {};
    data.items = data.items || [];
    data.cables = data.cables || [];
    data.settings = {
        gameSpeed: data.settings?.gameSpeed ?? 1,
        showPowerGrid: data.settings?.showPowerGrid ?? false,
        showDefenseRange: data.settings?.showDefenseRange ?? false,
        difficulty: data.settings?.difficulty ?? fallbackDifficulty,
        language: isLanguage(data.settings?.language) ? data.settings.language : DEFAULT_LANGUAGE,
        masterVolume: data.settings?.masterVolume ?? 0.6,
        muted: data.settings?.muted ?? false,
        tutorialCompleted: data.settings?.tutorialCompleted ?? false,
        tutorialStep: data.settings?.tutorialStep ?? 0,
        mapType: data.settings?.mapType === 'tutorial' ? 'tutorial' : 'random',
        mapPresetId: data.settings?.mapPresetId === 'tutorial' ? 'tutorial' : 'standard',
        mapSeed: typeof data.settings?.mapSeed === 'number' ? data.settings.mapSeed : undefined
    };
    data.resourceMap = data.resourceMap || [];
    data.terrainMap = data.terrainMap || [];
    data.research = data.research || [];

    return data as SaveData;
}
