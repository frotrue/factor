import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { getCableDistanceTiles, getTouchedCableTiles } from './cablePath';

describe('cablePath', () => {
    it('calculates cable distance in charged grid tiles', () => {
        expect(getCableDistanceTiles({ x: 16, y: 16 }, { x: 16 + CONFIG.GRID_SIZE * 8, y: 16 })).toBe(8);
        expect(getCableDistanceTiles({ x: 16, y: 16 }, { x: 16 + CONFIG.GRID_SIZE * 2, y: 16 + CONFIG.GRID_SIZE * 2 })).toBe(3);
    });

    it('returns all sampled grid tiles touched by a free-angle line', () => {
        const tiles = getTouchedCableTiles(
            { x: CONFIG.GRID_SIZE / 2, y: CONFIG.GRID_SIZE / 2 },
            { x: CONFIG.GRID_SIZE * 4.5, y: CONFIG.GRID_SIZE * 2.5 }
        );

        expect(tiles.map(tile => `${tile.x},${tile.y}`)).toContain(`${CONFIG.GRID_SIZE * 2},${CONFIG.GRID_SIZE}`);
        expect(tiles.map(tile => `${tile.x},${tile.y}`)).toContain(`${CONFIG.GRID_SIZE * 4},${CONFIG.GRID_SIZE * 2}`);
    });
});
