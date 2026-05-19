import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import EffectsManager from './EffectsManager';

function createGraphics() {
    return {
        setDepth: () => undefined,
        clear: () => undefined,
        lineStyle: () => undefined,
        strokeCircle: () => undefined,
        fillStyle: () => undefined,
        fillTriangle: () => undefined,
        fillRect: () => undefined,
        destroy: () => undefined
    };
}

describe('EffectsManager', () => {
    it('adds a warning marker when a building output buffer is full', () => {
        const addedMarkers: unknown[] = [];
        const building = {
            type: 'DATA_DOWNLOADER',
            hasPower: true,
            inputBuffer: [],
            outputBuffer: ['RAW_DATA', 'RAW_DATA', 'RAW_DATA', 'RAW_DATA', 'RAW_DATA'],
            maxBufferSize: 5,
            container: {
                setAlpha: () => undefined,
                add: (marker: unknown) => addedMarkers.push(marker)
            }
        };
        const scene = {
            time: { now: 100 },
            add: { graphics: createGraphics },
            buildingManager: {
                forEach: (callback: (value: typeof building) => void) => callback(building)
            }
        };

        new EffectsManager(scene as any).updatePowerWarnings();

        expect(addedMarkers.length).toBeGreaterThan(0);
    });
});
