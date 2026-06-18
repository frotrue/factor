import type MainScene from '../scenes/MainScene';

export type PerformanceCounter =
    | 'apWaveSkipped'
    | 'autosaveChunks'
    | 'autosaveSkipped'
    | 'cablePulseSkipped'
    | 'enemyRangeQueries'
    | 'pathCacheHits'
    | 'pathCacheMisses'
    | 'powerRebuilds'
    | 'saveWrites'
    | 'uiTacticalRenders';

const MAX_FRAME_SAMPLES = 600;
const LONG_FRAME_MS = 50;

export default class PerformanceStats {
    private scene: MainScene;
    private frameSamples: number[] = [];
    private counters: Record<PerformanceCounter, number>;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.counters = {
            apWaveSkipped: 0,
            autosaveChunks: 0,
            autosaveSkipped: 0,
            cablePulseSkipped: 0,
            enemyRangeQueries: 0,
            pathCacheHits: 0,
            pathCacheMisses: 0,
            powerRebuilds: 0,
            saveWrites: 0,
            uiTacticalRenders: 0
        };
    }

    recordFrame(deltaMs: number): void {
        this.frameSamples.push(deltaMs);
        if (this.frameSamples.length > MAX_FRAME_SAMPLES) {
            this.frameSamples.shift();
        }
    }

    increment(counter: PerformanceCounter, amount = 1): void {
        this.counters[counter] += amount;
    }

    reset(): void {
        this.frameSamples = [];
        (Object.keys(this.counters) as PerformanceCounter[]).forEach(counter => {
            this.counters[counter] = 0;
        });
    }

    getSummary() {
        const sorted = [...this.frameSamples].sort((a, b) => a - b);
        const total = this.frameSamples.reduce((sum, frame) => sum + frame, 0);
        const p95Index = sorted.length > 0 ? Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95)) : 0;
        const buildingCount = this.scene.buildingManager?.getUniqueBuildings?.().length ?? 0;

        return {
            frames: this.frameSamples.length,
            avgFrameMs: this.frameSamples.length > 0 ? total / this.frameSamples.length : 0,
            p95FrameMs: sorted[p95Index] || 0,
            longFrames: this.frameSamples.filter(frame => frame >= LONG_FRAME_MS).length,
            counters: { ...this.counters },
            entities: {
                buildings: buildingCount,
                cables: this.scene.cableManager?.cables?.size ?? 0,
                enemies: this.scene.waveManager?.enemies?.size ?? 0,
                items: this.scene.itemManager?.getItems?.().length ?? 0
            }
        };
    }
}
