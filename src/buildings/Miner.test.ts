import { describe, expect, it } from 'vitest';
import Miner from './Miner';

function createSceneStub(resourceType: string | null) {
    const graphics = {
        clear() { return this; },
        fillStyle() { return this; },
        fillRoundedRect() { return this; },
        fillRect() { return this; },
        lineStyle() { return this; },
        strokeRoundedRect() { return this; },
        strokeCircle() { return this; },
        lineBetween() { return this; },
        fillTriangle() { return this; },
        strokeRect() { return this; },
        fillCircle() { return this; },
        setDepth() { return this; }
    };

    return {
        add: {
            container: () => ({
                add() {},
                destroy() {}
            }),
            graphics: () => graphics
        },
        tweens: {
            add: () => ({
                remove() {}
            })
        },
        time: { now: 0 },
        mapManager: {
            getResourceAt: () => resourceType
        },
        buildingManager: {
            getUniqueBuildings: () => []
        },
        researchManager: {
            getEffectValue: (_effect: string, fallback: number) => fallback
        }
    };
}

describe('Miner resource output', () => {
    it('only produces silicon on silicon patches', () => {
        const miner = new Miner(createSceneStub('SILICON') as any, 0, 0);
        miner.productionRate = 1;

        for (let tick = 0; tick < 8; tick++) {
            miner.onTick(tick);
        }

        expect(miner.outputBuffer).toEqual(['SILICON', 'SILICON', 'SILICON', 'SILICON', 'SILICON']);
    });

    it('produces material samples only on material sample patches', () => {
        const miner = new Miner(createSceneStub('MATERIAL_SAMPLE') as any, 0, 0);
        miner.productionRate = 1;

        miner.onTick(0);

        expect(miner.outputBuffer).toEqual(['MATERIAL_SAMPLE']);
    });

    it('clears legacy mismatched output from the current patch type', () => {
        const miner = new Miner(createSceneStub('SILICON') as any, 0, 0);
        miner.productionRate = 999;
        miner.outputBuffer = ['SILICON', 'MATERIAL_SAMPLE', 'ENERGY', 'SILICON'];

        miner.onTick(0);

        expect(miner.outputBuffer).toEqual(['SILICON', 'SILICON']);
    });
});
