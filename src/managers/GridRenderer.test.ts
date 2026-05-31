import { describe, expect, it } from 'vitest';
import MapManager from './MapManager';
import GridRenderer from './GridRenderer';

describe('GridRenderer chunk cache', () => {
    it('reuses chunk textures while panning inside the same chunk range', () => {
        const scene = createFakeScene();
        const mapManager = new MapManager();
        mapManager.generateTutorialMap();
        const renderer = new GridRenderer(scene as never, mapManager);

        renderer.draw(true);
        const firstStats = renderer.getCacheStats();

        scene.cameras.main.worldView.x = 10;
        renderer.draw();
        const secondStats = renderer.getCacheStats();

        expect(firstStats.chunks).toBeGreaterThan(0);
        expect(firstStats.misses).toBe(firstStats.chunks);
        expect(secondStats.chunks).toBe(firstStats.chunks);
        expect(secondStats.misses).toBe(firstStats.misses);
        expect(secondStats.hits).toBeGreaterThan(0);
    });

    it('clears stale chunks on forced redraw', () => {
        const scene = createFakeScene();
        const mapManager = new MapManager();
        mapManager.generateTutorialMap();
        const renderer = new GridRenderer(scene as never, mapManager);

        renderer.draw(true);
        const firstStats = renderer.getCacheStats();
        renderer.draw(true);
        const secondStats = renderer.getCacheStats();

        expect(firstStats.chunks).toBeGreaterThan(0);
        expect(secondStats.chunks).toBe(firstStats.chunks);
        expect(scene.destroyedImages).toBe(firstStats.chunks);
        expect(scene.removedTextures).toBe(firstStats.chunks);
    });

    it('keeps generated grid chunks behind buildings created before the first draw', () => {
        const scene = createFakeScene();
        const mapManager = new MapManager();
        mapManager.generateTutorialMap();
        const renderer = new GridRenderer(scene as never, mapManager);

        renderer.draw(true);

        expect(scene.graphicsDepths.every(depth => depth < 0)).toBe(true);
        expect(scene.imageDepths.length).toBeGreaterThan(0);
        expect(scene.imageDepths.every(depth => depth < 0)).toBe(true);
    });
});

function createFakeScene() {
    const textures = new Set<string>();
    const scene = {
        destroyedImages: 0,
        removedTextures: 0,
        graphicsDepths: [] as number[],
        imageDepths: [] as number[],
        cameras: {
            main: {
                zoom: 1,
                worldView: { x: 0, y: 0, width: 256, height: 256 }
            }
        },
        textures: {
            exists: (key: string) => textures.has(key),
            remove: (key: string) => {
                if (textures.delete(key)) {
                    scene.removedTextures++;
                }
            }
        },
        add: {
            graphics: () => createFakeGraphics(textures, scene.graphicsDepths),
            image: (_x: number, _y: number, _key: string) => createFakeImage(scene)
        }
    };
    return scene;
}

function createFakeGraphics(textures: Set<string>, depths: number[]) {
    return {
        setDepth: (depth: number) => {
            depths.push(depth);
        },
        setVisible: () => undefined,
        clear: () => undefined,
        fillStyle: () => undefined,
        fillRect: () => undefined,
        fillRoundedRect: () => undefined,
        fillCircle: () => undefined,
        lineStyle: () => undefined,
        lineBetween: () => undefined,
        strokeRoundedRect: () => undefined,
        strokeRect: () => undefined,
        beginPath: () => undefined,
        moveTo: () => undefined,
        lineTo: () => undefined,
        strokePath: () => undefined,
        generateTexture: (key: string) => {
            textures.add(key);
        },
        destroy: () => undefined
    };
}

function createFakeImage(scene: { destroyedImages: number; imageDepths: number[] }) {
    return {
        setOrigin: () => undefined,
        setDepth: (depth: number) => {
            scene.imageDepths.push(depth);
        },
        setVisible: () => undefined,
        destroy: () => {
            scene.destroyedImages++;
        }
    };
}
