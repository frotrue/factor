import { describe, expect, test } from 'vitest';
import { summarizeTrainingTarget } from './modelTrainingSummary';
import { createDefaultDefenseModelState } from './modelTrainingProgress';

describe('modelTrainingSummary', () => {
    test('summarizes accuracy-stage model training progress', () => {
        const state = createDefaultDefenseModelState();
        state.accumulatedTrainingData = 45;

        expect(summarizeTrainingTarget({
            displayName: 'Classifier',
            state,
            onlineCount: 3
        })).toEqual({
            title: 'Classifier',
            modelLine: '40% accuracy | +0% damage | 3 online',
            dataLine: 'Training data: 45 / 100',
            trainingLine: 'Waiting for data',
            effectLine: 'Next reward: accuracy +10%'
        });
    });

    test('summarizes damage-stage active training progress', () => {
        const state = createDefaultDefenseModelState();
        state.modelAccuracy = 100;
        state.damageBonus = 15;
        state.trainingRewardPreference = 'damage';
        state.isTraining = true;
        state.trainingProgressTicks = 30;
        state.trainingDurationTicks = 120;

        expect(summarizeTrainingTarget({
            displayName: 'Firewall',
            state,
            onlineCount: 1
        }).trainingLine).toBe('Training 25%');
        expect(summarizeTrainingTarget({
            displayName: 'Firewall',
            state,
            onlineCount: 1
        }).effectLine).toBe('Next reward: damage +5%');
    });
});
