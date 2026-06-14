import { describe, expect, it } from 'vitest';
import type { PowerUpdateData } from '../types';
import {
    createPacketsHudDisplayPayload,
    createPowerHudDisplayPayload,
    createScoreHudDisplayPayload,
    createSiliconHudDisplayPayload,
    createTopHudLabelSnapshot,
    createWaveStartedHudDisplayPayload,
    createWaveTimerHudDisplayPayload,
    formatWaveTimer
} from './topHudDisplay';

function createPowerData(overrides: Partial<PowerUpdateData> = {}): PowerUpdateData {
    return {
        consumption: 8,
        isBlackout: false,
        net: 4,
        production: 12,
        networks: [],
        ...overrides
    };
}

describe('topHudDisplay', () => {
    it('keeps resource legacy values and Preact snapshots aligned', () => {
        expect(createScoreHudDisplayPayload(42)).toEqual({
            legacyValue: 42,
            snapshot: { score: 42 }
        });
        expect(createPacketsHudDisplayPayload(7)).toEqual({
            legacyValue: 7,
            snapshot: { packets: 7 }
        });
        expect(createSiliconHudDisplayPayload(3)).toEqual({
            legacyValue: 3,
            snapshot: { silicon: 3 }
        });
    });

    it('mirrors power data into legacy display and Preact snapshot', () => {
        const network = {
            buildings: [],
            color: 0xffffff,
            consumption: 0,
            id: 1,
            isBlackout: false,
            net: 0,
            production: 0,
            tiles: new Set<string>()
        };
        const data = createPowerData({ net: -2, isBlackout: false, networks: [network] });
        const payload = createPowerHudDisplayPayload(data);

        expect(payload.snapshot.power).toBe(data);
        expect(payload.legacyPower).toEqual({
            production: data.production,
            consumption: data.consumption,
            isDeficit: true,
            networks: data.networks
        });
    });

    it('formats wave timer once for legacy and Preact HUD surfaces', () => {
        expect(formatWaveTimer(0)).toBe('0s');
        expect(formatWaveTimer(1)).toBe('1s');
        expect(formatWaveTimer(1500)).toBe('2s');
        expect(formatWaveTimer(-250)).toBe('0s');

        const timerPayload = createWaveTimerHudDisplayPayload(1500);
        expect(timerPayload.legacyWaveTimer).toBe('2s');
        expect(timerPayload.snapshot.waveTimer).toBe(timerPayload.legacyWaveTimer);

        const startedPayload = createWaveStartedHudDisplayPayload(5);
        expect(startedPayload.legacyWave).toBe(5);
        expect(startedPayload.snapshot.wave).toBe(5);
        expect(startedPayload.legacyWaveTimer).toBe(startedPayload.snapshot.waveTimer);
    });

    it('creates localized label snapshots without gameplay state', () => {
        const snapshot = createTopHudLabelSnapshot();

        expect(snapshot.labels?.stats.dataReceived).toBeTruthy();
        expect(snapshot.labels?.stats.power).toBeTruthy();
        expect(snapshot.score).toBeUndefined();
        expect(snapshot.power).toBeUndefined();
    });
});
