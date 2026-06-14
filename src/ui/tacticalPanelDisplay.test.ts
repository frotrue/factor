import { describe, expect, it } from 'vitest';
import type { DefenseModelState, PowerUpdateData } from '../types';
import type { WaveBriefing } from '../utils/waveSimulation';
import {
    createLegacyDefenseStatusDisplay,
    createLegacyPowerStatusDisplay,
    createLegacyWavePanelDisplay,
    createTacticalPanelDisplayPayload,
    formatTacticalWaveTimer
} from './tacticalPanelDisplay';

function createPowerData(overrides: Partial<PowerUpdateData> = {}): PowerUpdateData {
    return {
        consumption: 10,
        isBlackout: false,
        net: 5,
        production: 15,
        networks: [],
        ...overrides
    };
}

function createDefenseState(overrides: Partial<DefenseModelState> = {}): DefenseModelState {
    return {
        accumulatedTrainingData: 0,
        currentRequirement: 100,
        damageBonus: 12,
        inferenceCharge: 0,
        isTraining: false,
        modelAccuracy: 64,
        modelVersion: 2,
        trainingDurationTicks: 1,
        trainingProgressTicks: 0,
        trainingRewardPreference: 'accuracy',
        ...overrides
    };
}

function createBriefing(overrides: Partial<WaveBriefing> = {}): WaveBriefing {
    return {
        difficultyId: 'NORMAL',
        recommendedDefense: 'Add a Filter near North Port',
        routeNames: ['North Port', 'East Port'],
        routes: [
            { id: 'NORTH', label: 'North Port' },
            { id: 'EAST', label: 'East Port' }
        ],
        special: 'DDoS risk',
        threat: 'High',
        wave: 9,
        ...overrides
    };
}

describe('tacticalPanelDisplay', () => {
    it('formats tactical wave timers with the same clamp as Preact-facing snapshots', () => {
        expect(formatTacticalWaveTimer(0)).toBe('0s');
        expect(formatTacticalWaveTimer(1)).toBe('1s');
        expect(formatTacticalWaveTimer(1500)).toBe('2s');
        expect(formatTacticalWaveTimer(-1000)).toBe('0s');

        expect(createLegacyWavePanelDisplay(null, -1000)).toEqual({ timer: '0s' });
    });

    it('creates wave display text from briefing metadata without changing the briefing', () => {
        const briefing = createBriefing();
        const display = createLegacyWavePanelDisplay(briefing, 2500);

        expect(display).toEqual({
            timer: '3s',
            title: 'Wave 9',
            detail: 'North Port + East Port | High | DDoS risk',
            recommendation: briefing.recommendedDefense
        });
    });

    it('keeps tactical legacy payloads and Preact snapshot aligned', () => {
        const briefing = createBriefing();
        const wave = createLegacyWavePanelDisplay(briefing, 2500);
        const objective = { title: 'Objective', detail: 'Build a processor' };
        const defense = { title: '2 defenses ready', detail: 'Classifier x2 | 64% | DMG +12%' };
        const powerStatus = createLegacyPowerStatusDisplay(createPowerData({ net: -3 }));
        const payload = createTacticalPanelDisplayPayload({
            objective,
            wave,
            defense,
            powerStatus,
            briefing
        });

        expect(payload.legacyObjective).toBe(objective);
        expect(payload.legacyWave).toBe(wave);
        expect(payload.legacyDefense).toBe(defense);
        expect(payload.legacyPowerStatus).toBe(powerStatus);
        expect(payload.snapshot.objective).toEqual(objective);
        expect(payload.snapshot.threat.title).toBe(wave?.title);
        expect(payload.snapshot.threat.detail).toBe(wave?.detail);
        expect(payload.snapshot.threat.recommendation).toBe(wave?.recommendation);
        expect(payload.snapshot.threat.routeNames).toEqual(briefing.routeNames);
        expect(payload.snapshot.threat.threatLevel).toBe(briefing.threat);
        expect(payload.snapshot.threat.special).toBe(briefing.special);
        expect(payload.snapshot.defense).toEqual(defense);
        expect(payload.snapshot.powerStatus).toEqual(powerStatus);
    });

    it('classifies power and defense display state at the display boundary', () => {
        expect(createLegacyPowerStatusDisplay(null).tone).toBe('warning');
        expect(createLegacyPowerStatusDisplay(createPowerData({ isBlackout: true, net: 2 })).tone).toBe('danger');
        expect(createLegacyPowerStatusDisplay(createPowerData({ net: -1 })).tone).toBe('danger');
        expect(createLegacyPowerStatusDisplay(createPowerData({ net: 4 })).tone).toBe('default');

        const emptyDefense = createLegacyDefenseStatusDisplay([], null);
        expect(emptyDefense.title).toBeTruthy();

        const readyDefense = createLegacyDefenseStatusDisplay(
            [{ count: 2, name: 'Classifier', state: createDefenseState() }],
            { name: 'Firewall', state: createDefenseState({ modelAccuracy: 88, modelVersion: 5 }) }
        );
        expect(readyDefense.title).toContain('2');
        expect(readyDefense.detail).toContain('Classifier x2');
        expect(readyDefense.detail).toContain('Firewall');
    });
});
