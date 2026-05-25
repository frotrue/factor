import { describe, expect, it } from 'vitest';
import BaseBuilding from './BaseBuilding';

function createSceneStub() {
    const addedToContainer: unknown[] = [];
    const graphics = {
        clear() {},
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
        strokeTriangle() { return this; },
        setDepth() { return this; }
    };

    return {
        addedToContainer,
        scene: {
            add: {
                container: () => ({
                    add: (child: unknown) => addedToContainer.push(child),
                    destroy() {}
                }),
                graphics: () => graphics
            },
            time: { now: 0 }
        }
    };
}

describe('BaseBuilding graphics rendering', () => {
    it('renders buildings with generated graphics instead of image sprites', () => {
        const stub = createSceneStub();

        new BaseBuilding(stub.scene as any, 0, 0, 'CORE', { rotation: 1 });

        expect(stub.addedToContainer.length).toBeGreaterThan(0);
    });
});
