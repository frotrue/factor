import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { getCenteredCoverageTiles, getFootprintCenter } from './geometry';

describe('geometry helpers', () => {
    it('returns the center of multi-tile footprints', () => {
        expect(getFootprintCenter(0, 0, 4, 4, CONFIG.GRID_SIZE)).toEqual({ x: 64, y: 64 });
    });

    it('centers coverage on a multi-tile building footprint', () => {
        const tiles = getCenteredCoverageTiles(0, 0, 4, 4, 1, CONFIG.GRID_SIZE);

        expect(tiles).toEqual(new Set([
            '-32,-32', '-32,0', '-32,32', '-32,64', '-32,96', '-32,128',
            '0,-32', '0,0', '0,32', '0,64', '0,96', '0,128',
            '32,-32', '32,0', '32,32', '32,64', '32,96', '32,128',
            '64,-32', '64,0', '64,32', '64,64', '64,96', '64,128',
            '96,-32', '96,0', '96,32', '96,64', '96,96', '96,128',
            '128,-32', '128,0', '128,32', '128,64', '128,96', '128,128'
        ]));
    });
});
