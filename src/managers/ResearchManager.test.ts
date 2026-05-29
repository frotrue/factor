import { describe, expect, test } from 'vitest';
import ResearchManager from './ResearchManager';

function createManager(): ResearchManager {
    return new ResearchManager({
        uiManager: {
            logMessage: () => {}
        }
    } as any);
}

describe('ResearchManager lab jobs', () => {
    test('adds progress but does not immediately unlock without training', () => {
        const manager = createManager();

        manager.addJobProgress('TECH_EFFICIENT_MINING', 74);
        expect(manager.isUnlocked('TECH_EFFICIENT_MINING')).toBe(false);
        expect(manager.getJobProgress('TECH_EFFICIENT_MINING')).toMatchObject({
            progress: 74,
            completed: false
        });

        // Reaching the cost (75) does not immediately unlock anymore.
        // It remains completed: false, isTraining undefined/false.
        manager.addJobProgress('TECH_EFFICIENT_MINING', 1);
        expect(manager.isUnlocked('TECH_EFFICIENT_MINING')).toBe(false);
        expect(manager.getJobProgress('TECH_EFFICIENT_MINING')).toMatchObject({
            progress: 75,
            completed: false
        });
    });

    test('manages timed training phase and completes available system protocol jobs', () => {
        const manager = createManager();

        manager.addJobProgress('TECH_EFFICIENT_MINING', 75);
        expect(manager.isUnlocked('TECH_EFFICIENT_MINING')).toBe(false);

        // Start training with duration 10 ticks
        manager.startJobTraining('TECH_EFFICIENT_MINING', 10);
        expect(manager.getJobProgress('TECH_EFFICIENT_MINING')).toMatchObject({
            progress: 75,
            completed: false,
            isTraining: true,
            trainingProgressTicks: 0,
            trainingDurationTicks: 10
        });

        // Advance 5 ticks
        for (let i = 0; i < 5; i++) {
            manager.advanceJobTraining('TECH_EFFICIENT_MINING');
        }
        expect(manager.getJobProgress('TECH_EFFICIENT_MINING')).toMatchObject({
            progress: 75,
            completed: false,
            isTraining: true,
            trainingProgressTicks: 5
        });
        expect(manager.isUnlocked('TECH_EFFICIENT_MINING')).toBe(false);

        // Advance remaining 5 ticks
        for (let i = 0; i < 5; i++) {
            manager.advanceJobTraining('TECH_EFFICIENT_MINING');
        }
        expect(manager.getJobProgress('TECH_EFFICIENT_MINING')).toMatchObject({
            progress: 75,
            completed: true,
            isTraining: false
        });
        expect(manager.isUnlocked('TECH_EFFICIENT_MINING')).toBe(true);
    });

    test('does not progress jobs until prerequisite protocols are complete', () => {
        const manager = createManager();

        manager.addJobProgress('TECH_STREAMLINED_PROCESSING', 500);
        expect(manager.getJobProgress('TECH_STREAMLINED_PROCESSING').progress).toBe(0);

        // Complete prerequisite protocol
        manager.addJobProgress('TECH_EFFICIENT_MINING', 75);
        manager.startJobTraining('TECH_EFFICIENT_MINING', 1);
        manager.advanceJobTraining('TECH_EFFICIENT_MINING');
        expect(manager.isUnlocked('TECH_EFFICIENT_MINING')).toBe(true);

        manager.addJobProgress('TECH_STREAMLINED_PROCESSING', 3);
        expect(manager.getJobProgress('TECH_STREAMLINED_PROCESSING').progress).toBe(3);
    });

    test('restores completed legacy research as completed job progress', () => {
        const manager = createManager();

        manager.loadUnlockedResearch(['TECH_FAST_CONVEYOR']);
        manager.loadJobProgress({});

        expect(manager.isUnlocked('TECH_FAST_CONVEYOR')).toBe(true);
        expect(manager.getJobProgress('TECH_FAST_CONVEYOR')).toMatchObject({
            progress: 50,
            completed: true
        });
    });
});
