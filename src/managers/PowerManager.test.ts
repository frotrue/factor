import { afterEach, describe, expect, it } from 'vitest';
import PowerManager from './PowerManager';
import type BuildingManager from './BuildingManager';
import EventBus from './EventBus';

function createEmptyBuildingManager(): BuildingManager {
    return {
        forEach: () => {},
        getByTypes: () => [],
        get: () => null
    } as unknown as BuildingManager;
}

describe('PowerManager dirty updates', () => {
    afterEach(() => {
        EventBus.offAll('PowerManager');
    });

    it('rebuilds once while dirty and skips stable full ticks', () => {
        const manager = new PowerManager({} as any, createEmptyBuildingManager());
        let rebuilds = 0;
        const originalUpdate = manager.updatePowerGrid.bind(manager);
        manager.updatePowerGrid = () => {
            rebuilds++;
            originalUpdate();
        };

        manager.updateIfDirty();
        manager.updateIfDirty();

        expect(rebuilds).toBe(1);

        manager.markDirty();
        manager.updateIfDirty();

        expect(rebuilds).toBe(2);
    });
});
