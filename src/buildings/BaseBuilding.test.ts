import { describe, expect, it } from 'vitest';
import BaseBuilding from './BaseBuilding';

function createSceneStub(textureExists: boolean) {
    const addedToContainer: unknown[] = [];
    const images: Array<{ key: string; width?: number; height?: number; angle?: number }> = [];
    const graphics = {
        clear() {},
        fillStyle() { return this; },
        fillRoundedRect() { return this; },
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
        images,
        scene: {
            add: {
                container: () => ({
                    add: (child: unknown) => addedToContainer.push(child),
                    destroy() {}
                }),
                graphics: () => graphics,
                image: (_x: number, _y: number, key: string) => {
                    const image = {
                        key,
                        setDisplaySize(width: number, height: number) {
                            this.width = width;
                            this.height = height;
                            return this;
                        },
                        setAngle(angle: number) {
                            this.angle = angle;
                            return this;
                        },
                        setDepth() {
                            return this;
                        }
                    };
                    images.push(image);
                    return image;
                }
            },
            textures: {
                exists: () => textureExists
            },
            time: { now: 0 }
        }
    };
}

describe('BaseBuilding texture rendering', () => {
    it('uses configured building texture when it is loaded', () => {
        const stub = createSceneStub(true);

        new BaseBuilding(stub.scene as any, 0, 0, 'CORE', { rotation: 1 });

        expect(stub.images).toHaveLength(1);
        expect(stub.images[0]).toMatchObject({
            key: 'building-core',
            width: 128,
            height: 128,
            angle: 90
        });
    });

    it('keeps graphics fallback when the configured texture is not loaded', () => {
        const stub = createSceneStub(false);

        new BaseBuilding(stub.scene as any, 0, 0, 'CORE');

        expect(stub.images).toHaveLength(0);
        expect(stub.addedToContainer.length).toBeGreaterThan(0);
    });
});
