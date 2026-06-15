import { describe, expect, test } from 'vitest';
import { getObjectiveState, shouldHideEarlyAdvancedSystem } from './progressionGates';

describe('getObjectiveState', () => {
    test('preserves the first-loop objective order', () => {
        expect(getObjectiveState({
            hasDownloader: false,
            hasProcessor: false,
            hasDefense: false,
            firstDefenseDone: false,
            productionCount: 0,
            defenseCount: 0,
            hasModelTrainingLab: false,
            hasModelTrainingTarget: false
        }).key).toBe('data');

        expect(getObjectiveState({
            hasDownloader: true,
            hasProcessor: false,
            hasDefense: false,
            firstDefenseDone: false,
            productionCount: 1,
            defenseCount: 0,
            hasModelTrainingLab: false,
            hasModelTrainingTarget: false
        }).key).toBe('processing');

        expect(getObjectiveState({
            hasDownloader: true,
            hasProcessor: true,
            hasDefense: false,
            firstDefenseDone: false,
            productionCount: 2,
            defenseCount: 0,
            hasModelTrainingLab: false,
            hasModelTrainingTarget: false
        }).key).toBe('defense');
    });

    test('uses expand-vs-defend objectives after first defense', () => {
        expect(getObjectiveState({
            hasDownloader: true,
            hasProcessor: true,
            hasDefense: true,
            firstDefenseDone: true,
            productionCount: 2,
            defenseCount: 1,
            hasModelTrainingLab: false,
            hasModelTrainingTarget: false
        }).key).toBe('expand');

        expect(getObjectiveState({
            hasDownloader: true,
            hasProcessor: true,
            hasDefense: true,
            firstDefenseDone: true,
            productionCount: 4,
            defenseCount: 1,
            hasModelTrainingLab: false,
            hasModelTrainingTarget: false
        }).key).toBe('defendInvestment');

        expect(getObjectiveState({
            hasDownloader: true,
            hasProcessor: true,
            hasDefense: true,
            firstDefenseDone: true,
            productionCount: 4,
            defenseCount: 2,
            hasModelTrainingLab: true,
            hasModelTrainingTarget: false
        }).key).toBe('modelTarget');
    });
});

describe('shouldHideEarlyAdvancedSystem', () => {
    test('hides advanced logistics before the first defense success', () => {
        expect(shouldHideEarlyAdvancedSystem('ACCESS_POINT', false)).toBe(true);
        expect(shouldHideEarlyAdvancedSystem('FIBER', false)).toBe(true);
        expect(shouldHideEarlyAdvancedSystem('BASIC', false)).toBe(false);
        expect(shouldHideEarlyAdvancedSystem('DATA_CACHE', false)).toBe(false);
        expect(shouldHideEarlyAdvancedSystem('ACCESS_POINT', true)).toBe(false);
        expect(shouldHideEarlyAdvancedSystem('FIBER', true)).toBe(false);
    });
});
