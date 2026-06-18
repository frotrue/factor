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
    it('falls back to generated graphics when texture APIs are unavailable', () => {
        const stub = createSceneStub();

        new BaseBuilding(stub.scene as any, 0, 0, 'CORE', { rotation: 1 });

        expect(stub.addedToContainer.length).toBeGreaterThan(0);
    });

    it('reuses a cached body texture for matching building visuals', () => {
        const stub = createTextureSceneStub();

        new BaseBuilding(stub.scene as any, 0, 0, 'MINER');
        new BaseBuilding(stub.scene as any, 32, 0, 'MINER');

        expect(stub.generatedTextures).toBe(1);
        expect(stub.images.length).toBe(2);
        expect(stub.images[0].textureKey).toBe(stub.images[1].textureKey);
    });
});

function createTextureSceneStub() {
    const textures = new Set<string>();
    const images: Array<{ textureKey: string | null }> = [];
    const stub = {
        generatedTextures: 0,
        images,
        scene: {
            textures: {
                exists: (key: string) => textures.has(key),
                remove: (key: string) => textures.delete(key)
            },
            add: {
                container: () => ({
                    add() {},
                    destroy() {}
                }),
                graphics: () => ({
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
                    strokeTriangle() { return this; },
                    setDepth() { return this; },
                    generateTexture(key: string) {
                        textures.add(key);
                        stub.generatedTextures++;
                        return this;
                    },
                    destroy() {}
                }),
                image: (_x: number, _y: number, key: string) => {
                    const image = {
                        textureKey: key,
                        setOrigin() { return this; },
                        setTexture(nextKey: string) {
                            this.textureKey = nextKey;
                            return this;
                        }
                    };
                    images.push(image);
                    return image;
                }
            },
            time: { now: 0 }
        }
    };
    return stub;
}
