import { describe, expect, test } from 'vitest';
import ResearchManager from './ResearchManager';

function createManager(buildingsByType: Record<string, any[]> = {}): ResearchManager {
    const scene: any = {
        buildingManager: {
            getByType: (type: string) => buildingsByType[type] ?? []
        }
    };
    return new ResearchManager(scene);
}

function getProgress(manager: ResearchManager, researchId: string): number {
    return manager.getSavedState().progressById[researchId]?.progress ?? 0;
}

function createMockBuilding(type: string, x: number, y: number, hasPower = true, powerEfficiency = 1): any {
    return {
        type,
        x,
        y,
        hasPower,
        getPowerEfficiency: () => powerEfficiency
    };
}

describe('ResearchManager data research', () => {
    test('deposits data into the research data store', () => {
        const manager = createManager();

        expect(manager.depositData('material', 25)).toBe(25);
        expect(manager.depositData('material', 500)).toBe(275);
        expect(manager.getSavedState().dataStore.material).toBe(300);
    });

    test('consumes data costs proportionally as active research progresses', () => {
        const manager = createManager();

        expect(manager.assignResearch('CORE_BASIC_RESEARCH')).toBe(true);
        manager.depositData('material', 20);

        manager.onTick();

        expect(getProgress(manager, 'CORE_BASIC_RESEARCH')).toBe(6);
        expect(manager.getSavedState().dataStore.material).toBeCloseTo(14);
        expect(manager.getSavedState().dataStore.tactical).toBeCloseTo(0);
        expect(manager.getSavedState().dataStore.system).toBeCloseTo(0);
    });

    test('blocks active research when data is missing and resumes when data is deposited', () => {
        const manager = createManager();

        manager.assignResearch('CORE_BASIC_RESEARCH');
        manager.onTick();

        expect(getProgress(manager, 'CORE_BASIC_RESEARCH')).toBe(0);
        expect(manager.createPanelSnapshot(true).blockedData).toMatchObject({
            blocked: true,
            researchId: 'CORE_BASIC_RESEARCH'
        });
        expect(manager.createPanelSnapshot(true).blockedData.missing.map(item => item.id)).toContain('material');

        manager.depositData('material', 6);
        manager.onTick();

        expect(getProgress(manager, 'CORE_BASIC_RESEARCH')).toBe(6);
    });

    test('completes active research and promotes the first queued research', () => {
        const manager = createManager();
        manager.loadUnlockedResearch(['CORE_BASIC_RESEARCH']);

        expect(manager.assignResearch('TECH_EFFICIENT_MINING')).toBe(true);
        expect(manager.assignResearch('TECH_SOLAR_POWER')).toBe(true);
        manager.depositData('material', 200);

        for (let i = 0; i < 14; i++) manager.onTick();

        expect(manager.isUnlocked('TECH_EFFICIENT_MINING')).toBe(true);
        expect(manager.getSavedState()).toMatchObject({
            activeResearch: 'TECH_SOLAR_POWER',
            researchQueue: []
        });
    });

    test('uses default queue limit and increases it through queue-limit research', () => {
        const manager = createManager();
        manager.loadUnlockedResearch(['CORE_BASIC_RESEARCH']);

        expect(manager.assignResearch('TECH_EFFICIENT_MINING')).toBe(true);
        expect(manager.assignResearch('TECH_SOLAR_POWER')).toBe(true);
        expect(manager.assignResearch('TECH_PRECISION_INFERENCE')).toBe(true);
        expect(manager.assignResearch('TECH_DATASET_ENCODING')).toBe(true);
        expect(manager.assignResearch('TECH_AUTO_QUEUE')).toBe(false);
        expect(manager.createPanelSnapshot(true).queueText).toBe('Queue 3/3');

        manager.loadUnlockedResearch(['CORE_BASIC_RESEARCH', 'CORE_RESEARCH_SLOT_I']);

        expect(manager.createPanelSnapshot(true).queueText).toBe('Queue 3/4');
        expect(manager.assignResearch('TECH_AUTO_QUEUE')).toBe(true);
        expect(manager.createPanelSnapshot(true).queueText).toBe('Queue 4/4');
    });

    test('exposes data balances, active research, queue, and blocked data in panel snapshots', () => {
        const manager = createManager();
        manager.loadUnlockedResearch(['CORE_BASIC_RESEARCH']);
        manager.assignResearch('TECH_EFFICIENT_MINING');
        manager.assignResearch('TECH_SOLAR_POWER');

        const snapshot = manager.createPanelSnapshot(true);

        expect(snapshot.dataBalances.map(balance => balance.id)).toEqual(['material', 'tactical', 'system']);
        expect(snapshot.activeResearch).toMatchObject({
            id: 'TECH_EFFICIENT_MINING',
            blocked: true
        });
        expect(snapshot.researchQueue).toEqual([
            expect.objectContaining({ id: 'TECH_SOLAR_POWER' })
        ]);
        expect(snapshot.blockedData).toMatchObject({
            blocked: true,
            researchId: 'TECH_EFFICIENT_MINING'
        });
        expect('buffers' in snapshot).toBe(false);
        expect('slotsText' in snapshot).toBe(false);
    });

    test('adds the first powered Research Operations Center as a 20% throughput bonus', () => {
        const manager = createManager({
            RESEARCH_OPERATIONS_CENTER: [createMockBuilding('RESEARCH_OPERATIONS_CENTER', 0, 0)]
        });

        expect(manager.getResearchThroughput()).toBeCloseTo(7.2);
    });

    test('uses diminishing Research Operations Center returns and caps total contribution at 50%', () => {
        const centers = Array.from({ length: 11 }, (_, index) =>
            createMockBuilding('RESEARCH_OPERATIONS_CENTER', index * 128, 0));
        const manager = createManager({
            RESEARCH_OPERATIONS_CENTER: centers
        });

        expect(manager.getResearchThroughput()).toBeCloseTo(9);
    });

    test('boosts a powered Research Operations Center contribution for adjacent powered GPU clusters', () => {
        const manager = createManager({
            RESEARCH_OPERATIONS_CENTER: [createMockBuilding('RESEARCH_OPERATIONS_CENTER', 0, 0)],
            GPU_CLUSTER: [
                createMockBuilding('GPU_CLUSTER', 64, 0),
                createMockBuilding('GPU_CLUSTER', 0, 64),
                createMockBuilding('GPU_CLUSTER', 96, 96, false),
                createMockBuilding('GPU_CLUSTER', -32, 0, false)
            ]
        });

        expect(manager.getResearchThroughput()).toBeCloseTo(11.7);
    });
});
