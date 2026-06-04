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

    it('keeps enemy lanes reachable and free of blockers across standard seeds', () => {
        for (let seed = 0; seed < 100; seed++) {
            const mapManager = new MapManager();
            mapManager.generateMap({ presetId: 'standard', seed });

            const core = mapManager.getCoreTileForTest();
            for (const spawn of mapManager.getStandardEnemyLaneStartsForTest()) {
                expect(mapManager.hasEnemyPathForTest(spawn, core)).toBe(true);
            }

            mapManager.getReservedEnemyPathTilesForTest().forEach(tileKey => {
                const [tileX, tileY] = tileKey.split(',').map(Number);
                const pixelKey = `${tileX * CONFIG.GRID_SIZE},${tileY * CONFIG.GRID_SIZE}`;
                expect(mapManager.getTerrainMap().has(pixelKey)).toBe(false);
            });
        }
    }, 30000);

    it('generates standard blockers as broken clusters instead of long one-tile walls', () => {
        const mapManager = new MapManager();

        mapManager.generateMap({ presetId: 'standard', seed: 12345 });

        const { maxHorizontal, maxVertical } = getMaxStraightBlockerRuns(mapManager);
        expect(maxHorizontal).toBeLessThanOrEqual(9);
        expect(maxVertical).toBeLessThanOrEqual(9);
        expect(getSmallestBlockerClusterSize(mapManager)).toBeGreaterThanOrEqual(4);
    });

    it('uses blockers to form denser irregular outer terrain while keeping the core area open', () => {
        const mapManager = new MapManager();

        mapManager.generateMap({ presetId: 'standard', seed: 12345 });

        const outerBand = countBlockersInDistanceBand(mapManager, 52, 90);
        const midBand = countBlockersInDistanceBand(mapManager, 24, 44);
        const coreBand = countBlockersInDistanceBand(mapManager, 0, 20);
        expect(outerBand).toBeGreaterThan(midBand);
        expect(outerBand).toBeGreaterThan(350);
        expect(coreBand).toBe(0);
    });

    it('generates standard resource patches with irregular organic edges', () => {
        const mapManager = new MapManager();

        mapManager.generateMap({ presetId: 'standard', seed: 12345 });

        const squareTiles = countResourceTilesInArea(mapManager, 'SILICON', -10, -46, 5, 5);
        const surroundingTiles = countResourceTilesInArea(mapManager, 'SILICON', -13, -49, 11, 11);
        expect(squareTiles).toBeLessThan(25);
        expect(surroundingTiles).toBeGreaterThan(squareTiles);
    });

    it('concentrates campaign random resources in the midgame ring', () => {
        const mapManager = new MapManager();

        mapManager.generateMap({ presetId: 'standard', seed: 12345 });

        const earlyTiles = countResourcesInDistanceBand(mapManager, 17, 23);
        const midTiles = countResourcesInDistanceBand(mapManager, 24, 44);
        const outerTiles = countResourcesInDistanceBand(mapManager, 45, 60);

        expect(midTiles).toBeGreaterThan(earlyTiles);
        expect(midTiles).toBeGreaterThan(outerTiles);
        expect(midTiles).toBeGreaterThanOrEqual(150);
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

function countResourcesInDistanceBand(mapManager: MapManager, minDistance: number, maxDistance: number): number {
    let count = 0;
    mapManager.getResourceMap().forEach((_resourceType, key) => {
        const [x, y] = key.split(',').map(Number);
        const tileX = x / CONFIG.GRID_SIZE;
        const tileY = y / CONFIG.GRID_SIZE;
        const distance = Math.hypot(tileX, tileY);
        if (distance >= minDistance && distance <= maxDistance) {
            count++;
        }
    });
    return count;
}

function countBlockersInDistanceBand(mapManager: MapManager, minDistance: number, maxDistance: number): number {
    let count = 0;
    mapManager.getTerrainMap().forEach((_terrainType, key) => {
        const [x, y] = key.split(',').map(Number);
        const tileX = x / CONFIG.GRID_SIZE;
        const tileY = y / CONFIG.GRID_SIZE;
        const distance = Math.hypot(tileX, tileY);
        if (distance >= minDistance && distance <= maxDistance) {
            count++;
        }
    });
    return count;
}

function countResourceTilesInArea(
    mapManager: MapManager,
    type: string,
    startTileX: number,
    startTileY: number,
    width: number,
    height: number
): number {
    let count = 0;
    for (let x = startTileX; x < startTileX + width; x++) {
        for (let y = startTileY; y < startTileY + height; y++) {
            if (mapManager.getResourceAt(x * CONFIG.GRID_SIZE, y * CONFIG.GRID_SIZE) === type) {
                count++;
            }
        }
    }
    return count;
}

function getMaxStraightBlockerRuns(mapManager: MapManager): { maxHorizontal: number; maxVertical: number } {
    const blockerTiles = new Set<string>();
    mapManager.getTerrainMap().forEach((_terrainType, key) => {
        const [x, y] = key.split(',').map(Number);
        blockerTiles.add(`${x / CONFIG.GRID_SIZE},${y / CONFIG.GRID_SIZE}`);
    });

    let maxHorizontal = 0;
    let maxVertical = 0;
    blockerTiles.forEach(key => {
        const [tileX, tileY] = key.split(',').map(Number);
        if (!blockerTiles.has(`${tileX - 1},${tileY}`)) {
            let length = 0;
            while (blockerTiles.has(`${tileX + length},${tileY}`)) {
                length++;
            }
            maxHorizontal = Math.max(maxHorizontal, length);
        }
        if (!blockerTiles.has(`${tileX},${tileY - 1}`)) {
            let length = 0;
            while (blockerTiles.has(`${tileX},${tileY + length}`)) {
                length++;
            }
            maxVertical = Math.max(maxVertical, length);
        }
    });

    return { maxHorizontal, maxVertical };
}

function getSmallestBlockerClusterSize(mapManager: MapManager): number {
    const blockerTiles = new Set<string>();
    mapManager.getTerrainMap().forEach((_terrainType, key) => {
        const [x, y] = key.split(',').map(Number);
        blockerTiles.add(`${x / CONFIG.GRID_SIZE},${y / CONFIG.GRID_SIZE}`);
    });

    const visited = new Set<string>();
    let smallest = Number.POSITIVE_INFINITY;
    blockerTiles.forEach(startKey => {
        if (visited.has(startKey)) return;
        const queue = [startKey];
        visited.add(startKey);
        let size = 0;

        for (let index = 0; index < queue.length; index++) {
            const key = queue[index];
            size++;
            const [tileX, tileY] = key.split(',').map(Number);
            CONFIG.DIRECTIONS.forEach(direction => {
                const nextKey = `${tileX + direction.x},${tileY + direction.y}`;
                if (!blockerTiles.has(nextKey) || visited.has(nextKey)) return;
                visited.add(nextKey);
                queue.push(nextKey);
            });
        }

        smallest = Math.min(smallest, size);
    });

    return smallest === Number.POSITIVE_INFINITY ? 0 : smallest;
}
