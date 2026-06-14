import { describe, expect, it } from 'vitest';
import type { DefenseModelState, LabJobProgress, ResearchNode } from '../types';
import {
    createTrainingLabDefenseRowSnapshots,
    createTrainingLabDefenseRows,
    createTrainingLabSystemRowSnapshots,
    createTrainingLabSystemRows,
    normalizeTrainingPercent
} from './trainingLabDisplay';

describe('trainingLabDisplay', () => {
    it('normalizes display percentages into a finite 0-100 range', () => {
        expect(normalizeTrainingPercent(50, 100)).toBe(50);
        expect(normalizeTrainingPercent(150, 100)).toBe(100);
        expect(normalizeTrainingPercent(-10, 100)).toBe(0);
        expect(normalizeTrainingPercent(10, 0)).toBe(0);
        expect(normalizeTrainingPercent(Number.NaN, 100)).toBe(0);
    });

    it('keeps defense row progress finite for legacy rows and Preact snapshots', () => {
        const state: DefenseModelState = {
            accumulatedTrainingData: Number.NaN,
            currentRequirement: 0,
            damageBonus: 12,
            inferenceCharge: 0,
            isTraining: true,
            modelAccuracy: 40,
            modelVersion: 1,
            trainingDurationTicks: 0,
            trainingProgressTicks: 12,
            trainingRewardPreference: 'accuracy'
        };
        const rows = createTrainingLabDefenseRows({
            activeJobId: 'job-FIREWALL',
            getDefenseJobId: type => `job-${type}`,
            getDefenseModelState: () => state,
            targetTypes: ['FIREWALL']
        });
        const snapshots = createTrainingLabDefenseRowSnapshots(rows);

        expect(rows[0].dataPercent).toBe(0);
        expect(rows[0].trainingPercent).toBe(0);
        expect(snapshots[0].progress).toBe('0% / 0%');
        expect(snapshots[0].active).toBe(true);
    });

    it('keeps system row progress finite for legacy rows and Preact snapshots', () => {
        const node: ResearchNode = {
            COST: 0,
            DESCRIPTION: 'Test protocol',
            ID: 'TEST_PROTOCOL',
            NAME: 'Test Protocol',
            UNLOCKS: {}
        };
        const progress: LabJobProgress = {
            completed: false,
            isTraining: true,
            progress: 500,
            trainingDurationTicks: 0,
            trainingProgressTicks: 8
        };
        const rows = createTrainingLabSystemRows({
            activeJobId: 'TEST_PROTOCOL',
            getJobProgress: () => progress,
            isJobAvailable: () => true,
            researchNodes: [node]
        });
        const snapshots = createTrainingLabSystemRowSnapshots(rows);

        expect(rows[0].progressPercent).toBe(0);
        expect(rows[0].trainingPercent).toBe(0);
        expect(snapshots[0].progress).toBe('0% / 0%');
        expect(snapshots[0].active).toBe(true);
        expect(snapshots[0].disabled).toBe(false);
    });
});
