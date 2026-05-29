import { describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../config';

vi.mock('phaser', () => ({ default: {} }));

import CableManager from './CableManager';

function createBuilding(x: number, y: number, type = 'STORAGE') {
    return {
        x,
        y,
        type,
        hasPower: true,
        inputBuffer: [],
        outputBuffer: [],
        canAcceptItem: () => true,
        acceptItem: () => true,
        getOutputSource: () => [],
        popOutput: () => undefined
    };
}

function createCableManager(buildings: Record<string, any>, blockers: Set<string> = new Set(), lengthBonus = 0): CableManager {
    const scene: any = {
        add: {
            graphics: () => ({
                setDepth: () => undefined,
                clear: () => undefined
            })
        },
        buildingManager: {
            get: (key: string) => buildings[key] || null
        },
        mapManager: {
            getTerrainAt: (x: number, y: number) => blockers.has(`${x},${y}`) ? 'BLOCKER' : null,
            isAreaWithinBuildBounds: () => true
        },
        researchManager: {
            getEffectValue: (key: string, fallback: number) => key === 'CABLE_LENGTH_BONUS' ? lengthBonus : fallback
        },
        inventoryManager: {
            addResource: () => true
        },
        uiManager: {
            logMessage: () => undefined
        }
    };
    return new CableManager(scene);
}

describe('CableManager validation', () => {
    it('charges distance-based cable cost and allows valid free-angle lines', () => {
        const buildings = {
            '0,0': createBuilding(0, 0),
            '96,64': createBuilding(96, 64)
        };
        const manager = createCableManager(buildings);

        const validation = manager.canConnect('0,0', '96,64', 'BASIC');

        expect(validation.ok).toBe(true);
        expect(validation.distanceTiles).toBe(4);
        expect(validation.cost).toBe(4 * CONFIG.CABLES.BASIC.COST_PER_TILE);
    });

    it('rejects over-length cables and applies research length bonus', () => {
        const buildings = {
            '0,0': createBuilding(0, 0),
            '320,0': createBuilding(320, 0)
        };

        expect(createCableManager(buildings).canConnect('0,0', '320,0', 'BASIC')).toMatchObject({
            ok: false,
            reason: 'too-far',
            distanceTiles: 10,
            maxLengthTiles: 8
        });
        expect(createCableManager(buildings, new Set(), 4).canConnect('0,0', '320,0', 'BASIC')).toMatchObject({
            ok: true,
            maxLengthTiles: 12
        });
    });

    it('rejects blocker terrain crossed by the cable path', () => {
        const buildings = {
            '0,0': createBuilding(0, 0, 'DATA_DOWNLOADER'),
            '128,0': createBuilding(128, 0, 'DATA_DOWNLOADER')
        };
        const manager = createCableManager(buildings, new Set(['64,0']));

        expect(manager.canConnect('0,0', '128,0', 'BASIC')).toMatchObject({
            ok: false,
            reason: 'blocked',
            blockedTile: { x: 64, y: 0 }
        });
    });

    it('persists costPaid on successful connection', () => {
        const buildings = {
            '0,0': createBuilding(0, 0),
            '96,0': createBuilding(96, 0)
        };
        const manager = createCableManager(buildings);

        expect(manager.connect('0,0', '96,0', 'BASIC')).toBe(true);
        const cable = manager.cables.get(manager.makeCableId('0,0', '96,0'));
        expect(cable?.costPaid).toBe(3);
    });
});
