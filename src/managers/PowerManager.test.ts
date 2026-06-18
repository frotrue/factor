import { afterEach, describe, expect, it } from 'vitest';
import PowerManager from './PowerManager';
import type BuildingManager from './BuildingManager';
import EventBus from './EventBus';
import { CONFIG } from '../config';

function createEmptyBuildingManager(): BuildingManager {
    return {
        forEach: () => {},
        getByTypes: () => [],
        get: () => null
    } as unknown as BuildingManager;
}

function createBuilding(type: string, tileX: number, tileY: number): any {
    return {
        type,
        x: tileX * CONFIG.GRID_SIZE,
        y: tileY * CONFIG.GRID_SIZE,
        hasPower: true,
        powerEfficiency: 1
    };
}

function createBuildingManager(buildings: any[]): BuildingManager {
    return {
        forEach: (callback: (building: any) => void) => buildings.forEach(callback),
        getByTypes: (types: string[]) => buildings.filter(building => types.includes(building.type)),
        get: (key: string) => buildings.find(building => `${building.x},${building.y}` === key) ?? null
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

    it('assigns partial power efficiency instead of blacking out supported networks', () => {
        const core = createBuilding('CORE', 0, 0);
        const consumers = Array.from({ length: 10 }, (_, index) => createBuilding('DATA_DOWNLOADER', index % 5, Math.floor(index / 5)));
        const manager = new PowerManager({} as any, createBuildingManager([core, ...consumers]));

        manager.updatePowerGrid();

        expect(manager.networks[0].satisfaction).toBeCloseTo(50 / 60);
        expect(manager.networks[0].lowPower).toBe(true);
        expect(manager.networks[0].isBlackout).toBe(false);
        consumers.forEach(building => {
            expect(building.hasPower).toBe(true);
            expect(building.powerEfficiency).toBeCloseTo(50 / 60);
        });
    });
});
