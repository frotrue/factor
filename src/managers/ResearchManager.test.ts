import { describe, expect, test } from 'vitest';
import ResearchManager from './ResearchManager';

function createManager(): ResearchManager {
    const scene: any = {
        buildingManager: {
            getByType: () => []
        }
    };
    return new ResearchManager(scene);
}

describe('ResearchManager global research', () => {
    test('consumes Insight from the active slot and unlocks completed research', () => {
        const manager = createManager();

        expect(manager.assignResearch('CORE_BASIC_RESEARCH')).toBe(true);
        manager.addInsight('material', 20);
        manager.addInsight('tactical', 20);
        manager.addInsight('system', 20);

        for (let i = 0; i < 20; i++) manager.onTick();

        expect(manager.isUnlocked('CORE_BASIC_RESEARCH')).toBe(true);
        expect(manager.getJobProgress('CORE_BASIC_RESEARCH')).toMatchObject({
            completed: true,
            progress: 60
        });
    });

    test('does not assign or progress locked research until prerequisites complete', () => {
        const manager = createManager();

        expect(manager.assignResearch('TECH_STREAMLINED_PROCESSING')).toBe(false);
        manager.addJobProgress('TECH_STREAMLINED_PROCESSING', 500);
        expect(manager.getJobProgress('TECH_STREAMLINED_PROCESSING').progress).toBe(0);

        manager.loadUnlockedResearch(['CORE_BASIC_RESEARCH', 'TECH_EFFICIENT_MINING', 'TECH_RECYCLING', 'CORE_RESEARCH_SLOT_I', 'CORE_THROUGHPUT_I', 'CORE_TIER_2_GATE']);
        expect(manager.assignResearch('TECH_STREAMLINED_PROCESSING')).toBe(true);
        manager.addJobProgress('TECH_STREAMLINED_PROCESSING', 3);
        expect(manager.getJobProgress('TECH_STREAMLINED_PROCESSING').progress).toBe(3);
    });

    test('preserves progress when research is paused or reassigned', () => {
        const manager = createManager();

        manager.loadUnlockedResearch(['CORE_BASIC_RESEARCH']);
        manager.addInsight('material', 80);
        manager.assignResearch('TECH_EFFICIENT_MINING');
        manager.onTick();

        const progress = manager.getJobProgress('TECH_EFFICIENT_MINING').progress;
        expect(progress).toBeGreaterThan(0);

        manager.clearResearch('TECH_EFFICIENT_MINING');
        manager.assignResearch('TECH_EFFICIENT_MINING');
        expect(manager.getJobProgress('TECH_EFFICIENT_MINING').progress).toBe(progress);
    });

    test('restores saved research state', () => {
        const manager = createManager();

        manager.loadState({
            completed: ['TECH_FIBER_OPTIC'],
            activeSlots: [{ id: 'slot-1', researchId: 'CORE_BASIC_RESEARCH' }],
            progressById: { CORE_BASIC_RESEARCH: { progress: 12 } },
            insightBuffers: { material: 10, tactical: 11, system: 12 },
            unlockedSlots: 1
        });

        expect(manager.isUnlocked('TECH_FIBER_OPTIC')).toBe(true);
        expect(manager.getJobProgress('TECH_FIBER_OPTIC')).toMatchObject({
            progress: 130,
            completed: true
        });
        expect(manager.getSavedState().insightBuffers).toEqual({ material: 10, tactical: 11, system: 12 });
        expect(manager.getJobProgress('CORE_BASIC_RESEARCH').progress).toBe(12);
    });
});
