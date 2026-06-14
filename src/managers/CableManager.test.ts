import { describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../config';

vi.mock('phaser', () => ({ default: {} }));

import CableManager from './CableManager';

function createBuilding(x: number, y: number, type = 'STORAGE', overrides: Record<string, any> = {}) {
    const building: any = {
        x,
        y,
        type,
        hasPower: true,
        inputBuffer: [],
        outputBuffer: [],
        powerEfficiency: 1,
        canAcceptItem: (itemType: string) => building.inputBuffer.length < 500
            && (building.inputBuffer.length === 0 || building.inputBuffer[0] === itemType),
        acceptItem: (itemType: string) => {
            if (!building.canAcceptItem(itemType)) return false;
            building.inputBuffer.push(itemType);
            return true;
        },
        getOutputSource: () => building.outputBuffer,
        popOutput: () => building.getOutputSource().shift(),
        getPowerEfficiency: () => building.powerEfficiency
    };
    Object.assign(building, overrides);
    return building;
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
            get: (key: string) => buildings[key] || null,
            getByType: (type: string) => Object.values(buildings).filter((building: any) => building.type === type),
            getByTypes: (types: string[]) => Object.values(buildings).filter((building: any) => types.includes(building.type))
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
        },
        gameSpeed: 1,
        tweens: {
            add: () => undefined
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

    it('continues moving buffered silicon into storage when endpoints are unpowered', () => {
        const source = createBuilding(0, 0, 'MINER', {
            hasPower: false,
            outputBuffer: ['SILICON'],
            powerEfficiency: 0
        });
        const storage = createBuilding(32, 0, 'STORAGE', {
            hasPower: false,
            powerEfficiency: 0
        });
        const buildings = {
            '0,0': source,
            '32,0': storage
        };
        const manager = createCableManager(buildings);
        vi.spyOn(manager, 'createPulseAnimation').mockImplementation(() => undefined);

        manager.connect('0,0', '32,0', 'BASIC');
        for (let i = 0; i < 10; i++) {
            manager.transferData(manager.scene.buildingManager, {} as any);
        }

        expect(source.outputBuffer).toEqual([]);
        expect(storage.inputBuffer).toEqual(['SILICON']);
        expect([...manager.cables.values()][0].queue).toEqual([]);
    });
});
