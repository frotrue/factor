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
                CLASSIFIER: { modelConfidence: 55, modelVersion: 2, inferenceCharge: 0 },
                FILTER: { modelConfidence: 72, modelVersion: 3, inferenceCharge: 0 },
                FIREWALL: { modelConfidence: 40, modelVersion: 1, inferenceCharge: 0 }
            },
            getModelName: type => type
        });

        expect(summary.coreHpPercent).toBe(24);
        expect(summary.bestModelName).toBe('FILTER');
        expect(summary.bestModelConfidence).toBe(72);
        expect(summary.lines).toEqual([
            'Reached Wave 9',
            'Core integrity 24%',
            'Total Confidence earned 180.50',
            'Research unlocked 3',
            'Best model FILTER 72% v3'
        ]);
    });
});
