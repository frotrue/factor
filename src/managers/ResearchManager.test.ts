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
    test('adds shared progress and completes available system protocol jobs', () => {
        const manager = createManager();

        manager.addJobProgress('TECH_EFFICIENT_MINING', 74);
        expect(manager.isUnlocked('TECH_EFFICIENT_MINING')).toBe(false);
        expect(manager.getJobProgress('TECH_EFFICIENT_MINING')).toMatchObject({
            progress: 74,
            completed: false
        });

        manager.addJobProgress('TECH_EFFICIENT_MINING', 1);
        expect(manager.isUnlocked('TECH_EFFICIENT_MINING')).toBe(true);
        expect(manager.getJobProgress('TECH_EFFICIENT_MINING')).toMatchObject({
            progress: 75,
            completed: true
        });
    });

    test('does not progress jobs until prerequisite protocols are complete', () => {
        const manager = createManager();

        manager.addJobProgress('TECH_STREAMLINED_PROCESSING', 500);
        expect(manager.getJobProgress('TECH_STREAMLINED_PROCESSING').progress).toBe(0);

        manager.addJobProgress('TECH_EFFICIENT_MINING', 75);
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
