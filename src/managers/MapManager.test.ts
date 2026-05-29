import { describe, expect, it } from 'vitest';
import { CONFIG, CORE_PIXEL_X, CORE_PIXEL_Y } from '../config';
import MapManager from './MapManager';

describe('MapManager terrain blockers', () => {
    it('adds and queries blocker terrain by world tile', () => {
        const mapManager = new MapManager();

        mapManager.addTerrainBlocker(-10, -20);

        expect(mapManager.isTerrainBlocked(-10 * CONFIG.GRID_SIZE, -20 * CONFIG.GRID_SIZE)).toBe(true);
        expect(mapManager.getTerrainAt(-10 * CONFIG.GRID_SIZE, -20 * CONFIG.GRID_SIZE)).toBe('BLOCKER');
        expect(mapManager.isTerrainBlocked(0, 0)).toBe(false);
    });

    it('generates early lane blockers without blocking the core or guaranteed resource patches', () => {
        const mapManager = new MapManager();

        mapManager.generateResourcePatches();

        expect(mapManager.isTerrainBlocked(CORE_PIXEL_X, CORE_PIXEL_Y)).toBe(false);
        expect(mapManager.getTerrainMap().size).toBeGreaterThan(0);
        expect(countResourceNearCore(mapManager, 'SILICON')).toBeGreaterThanOrEqual(9);
        expect(countResourceNearCore(mapManager, 'ENERGY')).toBeGreaterThanOrEqual(9);
    });

    it('generates deterministic campaign resources for a preset seed', () => {
        const first = new MapManager();
        const second = new MapManager();

        first.generateMap({ presetId: 'standard', seed: 12345 });
        second.generateMap({ presetId: 'standard', seed: 12345 });

        expect(first.mapType).toBe('random');
        expect(first.mapPresetId).toBe('standard');
        expect(first.mapSeed).toBe(12345);
        expect(Array.from(first.getResourceMap().entries())).toEqual(Array.from(second.getResourceMap().entries()));
        expect(Array.from(first.getTerrainMap().entries())).toEqual(Array.from(second.getTerrainMap().entries()));
        expect(countResourceNearCore(first, 'SILICON')).toBeGreaterThanOrEqual(9);
        expect(countResourceNearCore(first, 'ENERGY')).toBeGreaterThanOrEqual(9);
        expect(first.getResourceAt(CORE_PIXEL_X, CORE_PIXEL_Y)).toBeNull();
        expect(first.getResourceAt(CORE_PIXEL_X + CONFIG.GRID_SIZE, CORE_PIXEL_Y + CONFIG.GRID_SIZE)).toBeNull();
    });

    it('generates a compact standalone tutorial arena with expected resource patches and walls', () => {
        const mapManager = new MapManager();

        mapManager.generateTutorialMap();

        expect(mapManager.mapType).toBe('tutorial');
        expect(mapManager.mapPresetId).toBe('tutorial');
        expect(mapManager.mapSeed).toBeNull();
        expect(mapManager.getResourceAt(-5 * CONFIG.GRID_SIZE, -3 * CONFIG.GRID_SIZE)).toBe('SILICON');
        expect(mapManager.getResourceAt(-1 * CONFIG.GRID_SIZE, -1 * CONFIG.GRID_SIZE)).toBeNull();
        expect(mapManager.getResourceAt(-2 * CONFIG.GRID_SIZE, -6 * CONFIG.GRID_SIZE)).toBe('SILICON');
        expect(mapManager.getResourceAt(2 * CONFIG.GRID_SIZE, 2 * CONFIG.GRID_SIZE)).toBe('ENERGY');
        expect(mapManager.isTerrainBlocked(-9 * CONFIG.GRID_SIZE, 0)).toBe(true);
        expect(mapManager.isTerrainBlocked(8 * CONFIG.GRID_SIZE, 0)).toBe(true);
        expect(mapManager.isTerrainBlocked(-8 * CONFIG.GRID_SIZE, -9 * CONFIG.GRID_SIZE)).toBe(true);
        expect(mapManager.isTerrainBlocked(0, -9 * CONFIG.GRID_SIZE)).toBe(false);
        expect(mapManager.getTerrainMap().size).toBeLessThan(80);
    });

    it('keeps tutorial and random campaign maps as separate generation paths', () => {
        const mapManager = new MapManager();

        mapManager.generateTutorialMap();
        const tutorialResources = new Map(mapManager.getResourceMap());
        const tutorialTerrain = new Map(mapManager.getTerrainMap());

        mapManager.generateResourcePatches();

        expect(mapManager.mapType).toBe('random');
        expect(mapManager.mapPresetId).toBe('standard');
        expect(mapManager.mapSeed).not.toBeNull();
        expect(mapManager.getResourceMap()).not.toEqual(tutorialResources);
        expect(mapManager.getTerrainMap()).not.toEqual(tutorialTerrain);
        expect(mapManager.getResourceAt(-2 * CONFIG.GRID_SIZE, -6 * CONFIG.GRID_SIZE)).toBeNull();
        expect(countResourceNearCore(mapManager, 'SILICON')).toBeGreaterThanOrEqual(9);
        expect(countResourceNearCore(mapManager, 'ENERGY')).toBeGreaterThanOrEqual(9);
    });
});

function countResourceNearCore(mapManager: MapManager, type: string): number {
    const radius = CONFIG.MAP_PRESETS.standard.STARTER_VALIDATION?.radius ?? 8;
    let count = 0;
    mapManager.getResourceMap().forEach((resourceType, key) => {
        if (resourceType !== type) return;
        const [x, y] = key.split(',').map(Number);
        const tileX = x / CONFIG.GRID_SIZE;
        const tileY = y / CONFIG.GRID_SIZE;
        if (Math.abs(tileX) <= radius && Math.abs(tileY) <= radius) {
            count++;
        }
    });
    return count;
}
