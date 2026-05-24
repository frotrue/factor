import { describe, expect, test } from 'vitest';
import { getTrainingItemEffect, summarizeTrainingTarget } from './modelTrainingSummary';

describe('modelTrainingSummary', () => {
    test('describes each permanent training input effect', () => {
        expect(getTrainingItemEffect('WEIGHT_UPDATE')).toEqual({
            confidenceGain: 2,
            versionGain: 0,
            inferenceChargeGain: 0
        });
        expect(getTrainingItemEffect('TRAINED_MODEL')).toEqual({
            confidenceGain: 10,
            versionGain: 1,
            inferenceChargeGain: 0
        });
        expect(getTrainingItemEffect('INFERENCE_UNIT')).toEqual({
            confidenceGain: 0,
            versionGain: 0,
            inferenceChargeGain: 5
        });
    });

    test('summarizes target model state and available input', () => {
        const summary = summarizeTrainingTarget({
            displayName: 'Classifier',
            confidence: 47,
            version: 2,
            onlineCount: 3,
            inputCounts: {
                WEIGHT_UPDATE: 4,
                TRAINED_MODEL: 0,
                INFERENCE_UNIT: 1
            }
        });

        expect(summary).toEqual({
            title: 'Classifier',
            modelLine: '47% confidence | v2 | 3 online',
            inputLine: 'Training input: 4 Weight Updates, 0 Trained Models, 1 Inference Units',
            effectLine: 'Permanent growth: Weight Update +2% confidence, Trained Model +10% and +1 version'
        });
    });
});
