import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { findGridPath } from './gridPath';

const directions = CONFIG.DIRECTIONS.map(direction => ({ x: direction.x, y: direction.y }));

describe('findGridPath', () => {
    it('returns centered world steps when a route is reachable', () => {
        const path = findGridPath({
            startWorld: { x: 0, y: 0 },
            targetWorld: { x: CONFIG.GRID_SIZE * 2, y: 0 },
            gridSize: CONFIG.GRID_SIZE,
            directions,
            isBlocked: () => false
        });

        expect(path[0]).toEqual({ x: CONFIG.GRID_SIZE * 1.5, y: CONFIG.GRID_SIZE * 0.5 });
        expect(path.at(-1)).toEqual({ x: CONFIG.GRID_SIZE * 2.5, y: CONFIG.GRID_SIZE * 0.5 });
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
});
