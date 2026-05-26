import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { findGridPath } from './gridPath';
import MapManager from '../managers/MapManager';
import { getFootprintCenter } from './geometry';
import { getSpawnPointForRoute } from './waveSimulation';

const directions = CONFIG.DIRECTIONS.map(direction => ({ x: direction.x, y: direction.y }));

describe('findGridPath', () => {
    it('returns centered world steps when a route is reachable', () => {
        const path = findGridPath({
            startWorld: { x: 0, y: 0 },
            targetWorld: { x: CONFIG.GRID_SIZE * 2 + CONFIG.GRID_SIZE / 2, y: CONFIG.GRID_SIZE / 2 },
            gridSize: CONFIG.GRID_SIZE,
            directions,
            isBlocked: () => false
        });

        expect(path[0]).toEqual({ x: CONFIG.GRID_SIZE * 1.5, y: CONFIG.GRID_SIZE * 0.5 });
        expect(path[path.length - 1]).toEqual({ x: CONFIG.GRID_SIZE * 2.5, y: CONFIG.GRID_SIZE * 0.5 });
    });

    it('returns no path when blockers fully separate the target', () => {
        const path = findGridPath({
            startWorld: { x: 0, y: 0 },
            targetWorld: { x: CONFIG.GRID_SIZE * 2, y: 0 },
            gridSize: CONFIG.GRID_SIZE,
            directions,
            maxDistanceFromStart: 2,
            isBlocked: (worldX, _worldY, isTarget) => !isTarget && worldX === CONFIG.GRID_SIZE
        });

        expect(path).toEqual([]);
    });

    it('does not treat blocked target tiles as invalid endpoints', () => {
        const path = findGridPath({
            startWorld: { x: 0, y: 0 },
            targetWorld: { x: CONFIG.GRID_SIZE, y: 0 },
            gridSize: CONFIG.GRID_SIZE,
            directions,
            isBlocked: (_worldX, _worldY, isTarget) => !isTarget
        });

        expect(path).toHaveLength(1);
    });

    it('finds a north-port route through generated early lane blockers to the core center', () => {
        const mapManager = new MapManager();
        mapManager.addGuaranteedSpawnPatches();
        mapManager.addEarlyLaneBlockers();
        const coreConfig = CONFIG.BUILDINGS.CORE;
        const coreCenter = getFootprintCenter(0, 0, coreConfig.WIDTH || 1, coreConfig.HEIGHT || 1, CONFIG.GRID_SIZE);

        const path = findGridPath({
            startWorld: getSpawnPointForRoute('NORTH', 0.5),
            targetWorld: coreCenter,
            gridSize: CONFIG.GRID_SIZE,
            directions,
            maxReturnedSteps: 200,
            isBlocked: (worldX, worldY, isTarget) => Boolean(!isTarget && mapManager.blocksEnemyAt(worldX, worldY))
        });

        expect(path.length).toBeGreaterThan(0);
        expect(path[path.length - 1]).toEqual(coreCenter);
    });
});
