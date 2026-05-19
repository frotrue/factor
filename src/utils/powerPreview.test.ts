import { describe, expect, it } from 'vitest';
import { getSquareCoverageOffsets } from './powerPreview';

describe('power preview coverage', () => {
    it('uses the same square tile footprint as the power grid', () => {
        expect(getSquareCoverageOffsets(1)).toEqual([
            { dx: -1, dy: -1 },
            { dx: -1, dy: 0 },
            { dx: -1, dy: 1 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 1, dy: -1 },
            { dx: 1, dy: 0 },
            { dx: 1, dy: 1 }
        ]);
    });
});
