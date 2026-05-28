import { describe, expect, test } from 'vitest';
import { createRunResultSummary } from './runResultSummary';

describe('createRunResultSummary', () => {
    test('summarizes reached wave, core integrity, research, and best model', () => {
        const summary = createRunResultSummary({
            wave: 9,
            coreHp: 240,
            coreMaxHp: 1000,
            totalConfidenceEarned: 180.5,
            unlockedResearchCount: 3,
            modelStates: {
                CLASSIFIER: { modelAccuracy: 55, damageBonus: 0, modelVersion: 2, inferenceCharge: 0, accumulatedTrainingData: 0, currentRequirement: 100, isTraining: false, trainingProgressTicks: 0, trainingDurationTicks: 120 },
                FILTER: { modelAccuracy: 72, damageBonus: 0, modelVersion: 3, inferenceCharge: 0, accumulatedTrainingData: 0, currentRequirement: 100, isTraining: false, trainingProgressTicks: 0, trainingDurationTicks: 120 },
                FIREWALL: { modelAccuracy: 100, damageBonus: 15, modelVersion: 8, inferenceCharge: 0, accumulatedTrainingData: 0, currentRequirement: 100, isTraining: false, trainingProgressTicks: 0, trainingDurationTicks: 120 }
            },
            getModelName: type => type
        });

        expect(summary.coreHpPercent).toBe(24);
        expect(summary.bestModelName).toBe('FIREWALL');
        expect(summary.bestModelAccuracy).toBe(100);
        expect(summary.bestModelDamageBonus).toBe(15);
        expect(summary.lines).toEqual([
            'Reached Wave 9',
            'Core integrity 24%',
            'Total Confidence earned 180.50',
            'Research unlocked 3',
            'Best model FIREWALL 100% accuracy / +15% damage'
        ]);
    });
});
