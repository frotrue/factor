import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
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

        expect(mapManager.isTerrainBlocked(0, 0)).toBe(false);
        expect(mapManager.isTerrainBlocked(2 * CONFIG.GRID_SIZE, 2 * CONFIG.GRID_SIZE)).toBe(false);
        expect(mapManager.isTerrainBlocked(-5 * CONFIG.GRID_SIZE, -3 * CONFIG.GRID_SIZE)).toBe(false);
        expect(mapManager.getTerrainMap().size).toBeGreaterThan(0);
    });
});
