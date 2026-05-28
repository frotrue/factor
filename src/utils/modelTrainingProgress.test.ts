import { describe, expect, test } from 'vitest';
import {
    applyCompletedTraining,
    createDefaultDefenseModelState,
    getGpuTrainingSpeedMultiplier,
    getNextTrainingRequirement,
    getTrainingDataValue,
    getTrainingDurationTicks,
    isGpuUnlocked,
    normalizeDefenseModelState
} from './modelTrainingProgress';
import { CONFIG } from '../config';

describe('modelTrainingProgress', () => {
    test('maps training data values', () => {
        expect(getTrainingDataValue('RAW_DATA')).toBe(1);
        expect(getTrainingDataValue('LABELED_DATA')).toBe(3);
        expect(getTrainingDataValue('WEIGHT_UPDATE')).toBe(5);
        expect(getTrainingDataValue('TRAINED_MODEL')).toBe(0);
    });

    test('scales requirements by 1.3x rounded up', () => {
        expect(getNextTrainingRequirement(100)).toBe(130);
        expect(getNextTrainingRequirement(130)).toBe(169);
    });

    test('starts default models at 40 accuracy with the first requirement', () => {
        expect(createDefaultDefenseModelState()).toMatchObject({
            modelAccuracy: 40,
            damageBonus: 0,
            currentRequirement: 100,
            isTraining: false
        });
    });

    test('maps legacy modelConfidence to modelAccuracy', () => {
        expect(normalizeDefenseModelState({ modelConfidence: 55 }).modelAccuracy).toBe(55);
    });

    test('rewards accuracy before 100 and damage after 100 without a cap', () => {
        const state = createDefaultDefenseModelState();
        state.modelAccuracy = 95;
        expect(applyCompletedTraining(state)).toEqual({ kind: 'accuracy', accuracyGain: 5, damageGain: 0 });
        expect(state.modelAccuracy).toBe(100);

        expect(applyCompletedTraining(state)).toEqual({ kind: 'damage', accuracyGain: 0, damageGain: 5 });
        expect(state.damageBonus).toBe(5);
        state.damageBonus = 995;
        applyCompletedTraining(state);
        expect(state.damageBonus).toBe(1000);
    });

    test('caps active GPU speed bonus at four accelerators', () => {
        expect(getGpuTrainingSpeedMultiplier(0)).toBe(1);
        expect(getGpuTrainingSpeedMultiplier(1)).toBe(0.8);
        expect(getGpuTrainingSpeedMultiplier(4)).toBeCloseTo(0.2);
        expect(getGpuTrainingSpeedMultiplier(9)).toBeCloseTo(0.2);
        expect(getTrainingDurationTicks(4)).toBe(Math.ceil(CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS * 0.2));
    });

    test('unlocks GPU when any model reaches 100 accuracy', () => {
        const classifier = createDefaultDefenseModelState();
        const filter = createDefaultDefenseModelState();
        expect(isGpuUnlocked({ CLASSIFIER: classifier, FILTER: filter })).toBe(false);
        filter.modelAccuracy = 100;
        expect(isGpuUnlocked({ CLASSIFIER: classifier, FILTER: filter })).toBe(true);
    });
});
