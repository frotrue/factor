import { t } from '../i18n';
import type { HudSnapshot, PowerUpdateData, TopHudLabels } from '../types';
import type { LegacyPowerDisplay } from './legacyTopHud';

export interface PowerHudDisplayPayload {
    legacyPower: LegacyPowerDisplay;
    snapshot: HudSnapshot;
}

export interface ResourceHudDisplayPayload {
    legacyValue: number;
    snapshot: HudSnapshot;
}

export interface WaveStartedHudDisplayPayload {
    legacyWave: number;
    legacyWaveTimer: string;
    snapshot: HudSnapshot;
}

export interface WaveTimerHudDisplayPayload {
    legacyWaveTimer: string;
    snapshot: HudSnapshot;
}

export function createTopHudLabels(): TopHudLabels {
    return {
        aria: t('top.statusHud'),
        runtimeStats: t('top.runtimeStats'),
        shortcuts: t('top.shortcuts'),
        settings: t('top.settings'),
        research: t('top.research'),
        lab: t('top.lab'),
        stats: {
            dataReceived: t('hud.dataReceived'),
            power: t('hud.power'),
            silicon: t('hud.silicon'),
            packets: t('hud.packets'),
            wave: t('hud.wave'),
            nextWave: t('hud.nextWave')
        }
    };
}

export function createTopHudLabelSnapshot(): HudSnapshot {
    return {
        labels: createTopHudLabels()
    };
}

export function createPowerHudDisplayPayload(data: PowerUpdateData): PowerHudDisplayPayload {
    return {
        legacyPower: createLegacyPowerDisplay(data),
        snapshot: createPowerHudSnapshot(data)
    };
}

export function createWaveStartedHudDisplayPayload(wave: number): WaveStartedHudDisplayPayload {
    const snapshot = createWaveStartedHudSnapshot(wave);

    return {
        legacyWave: wave,
        legacyWaveTimer: snapshot.waveTimer ?? '',
        snapshot
    };
}

export function createWaveTimerHudDisplayPayload(timerMs: number): WaveTimerHudDisplayPayload {
    const snapshot = createWaveTimerHudSnapshot(timerMs);

    return {
        legacyWaveTimer: snapshot.waveTimer ?? '',
        snapshot
    };
}

export function createScoreHudDisplayPayload(score: number): ResourceHudDisplayPayload {
    return {
        legacyValue: score,
        snapshot: createScoreHudSnapshot(score)
    };
}

export function createPacketsHudDisplayPayload(packets: number): ResourceHudDisplayPayload {
    return {
        legacyValue: packets,
        snapshot: createPacketsHudSnapshot(packets)
    };
}

export function createSiliconHudDisplayPayload(silicon: number): ResourceHudDisplayPayload {
    return {
        legacyValue: silicon,
        snapshot: createSiliconHudSnapshot(silicon)
    };
}

export function createLegacyPowerDisplay(data: PowerUpdateData): LegacyPowerDisplay {
    return {
        production: data.production,
        consumption: data.consumption,
        isDeficit: data.isBlackout || data.net < 0,
        networks: data.networks
    };
}

export function createPowerHudSnapshot(data: PowerUpdateData): HudSnapshot {
    return { power: data };
}

export function createScoreHudSnapshot(score: number): HudSnapshot {
    return { score };
}

export function createPacketsHudSnapshot(packets: number): HudSnapshot {
    return { packets };
}

export function createSiliconHudSnapshot(silicon: number): HudSnapshot {
    return { silicon };
}

export function createWaveStartedHudSnapshot(wave: number): HudSnapshot {
    return {
        wave,
        waveTimer: t('hud.waveActive')
    };
}

export function createWaveTimerHudSnapshot(timerMs: number): HudSnapshot {
    return {
        waveTimer: `${Math.max(0, Math.ceil(timerMs / 1000))}s`
    };
}
