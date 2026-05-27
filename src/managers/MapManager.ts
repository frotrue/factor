import { CONFIG } from '../config';

export default class MapManager {
    resourceMap: Map<string, string>;
    terrainMap: Map<string, string>;
    gridSize: number;
    mapType: 'tutorial' | 'random';
    tutorialBounds = {
        minTileX: -9,
        maxTileX: 8,
        minTileY: -9,
        maxTileY: 8
    };

    constructor() {
        this.resourceMap = new Map();
        this.terrainMap = new Map();
        this.gridSize = CONFIG.GRID_SIZE;
        this.mapType = 'random';
    }

    generateResourcePatches(): void {
        this.mapType = 'random';
        this.resourceMap.clear();
        this.terrainMap.clear();
        const types = ['SILICON', 'ENERGY'];
        const numPatches = Math.floor(Math.random() * 8) + 8;

        for (let i = 0; i < numPatches; i++) {
            const type = i < types.length ? types[i] : types[Math.floor(Math.random() * types.length)];
            let startX: number, startY: number, isSafeZone: boolean;
            do {
                startX = Math.floor(Math.random() * 61) - 30;
                startY = Math.floor(Math.random() * 61) - 30;
                // Exclude the tutorial zone (x: -6 to 4, y: -6 to 4) from random resource patches
                isSafeZone = startX >= -6 && startX <= 4 && startY >= -6 && startY <= 4;
            } while (isSafeZone);

            const size = Math.floor(Math.random() * 4) + 2;
            this.addPatch(startX, startY, size, type);
        }

        this.addGuaranteedSpawnPatches();
        this.addEarlyLaneBlockers();
    }

    addGuaranteedSpawnPatches(): void {
        // Keep both early-game resources inside the 10x10 spawn area without covering the core tile.
        this.addPatch(-5, -3, 3, 'SILICON');
        this.addPatch(2, 2, 3, 'ENERGY');
    }

    addPatch(startX: number, startY: number, size: number, type: string): void {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const x = (startX + i) * this.gridSize;
                const y = (startY + j) * this.gridSize;
                this.resourceMap.set(`${x},${y}`, type);
            }
        }
    }

    addTerrainBlocker(tileX: number, tileY: number): void {
        const x = tileX * this.gridSize;
        const y = tileY * this.gridSize;
        const key = `${x},${y}`;
        if (this.resourceMap.has(key)) return;
        if (Math.abs(tileX) < 4 && Math.abs(tileY) < 4) return;
        this.terrainMap.set(key, 'BLOCKER');
    }

    addEarlyLaneBlockers(): void {
        for (let y = -22; y <= -8; y++) {
            if (y >= -16 && y <= -12) continue;
            this.addTerrainBlocker(-4, y);
            this.addTerrainBlocker(4, y);
        }

        for (let x = -8; x <= 8; x++) {
            if (Math.abs(x) <= 2) continue;
            this.addTerrainBlocker(x, -18);
        }
    }

    /** Small standalone training arena for learning core building roles. */
    generateTutorialMap(): void {
        this.mapType = 'tutorial';
        this.resourceMap.clear();
        this.terrainMap.clear();

        // Fixed Silicon patch: top-left of core, aligned with the Miner lesson.
        this.addPatch(-5, -3, 3, 'SILICON');

        // Energy patch: bottom-right of core, visible but outside the first building tile.
        this.addPatch(2, 2, 3, 'ENERGY');

        // Small north patch for showing that resources can exist beyond the first station.
        this.addPatch(-2, -6, 2, 'SILICON');

        this.addTutorialArenaWalls();
    }

    /** Compact arena boundary with a small north gate for the tutorial wave. */
    private addTutorialArenaWalls(): void {
        const { minTileX, maxTileX, minTileY, maxTileY } = this.tutorialBounds;

        for (let x = minTileX; x <= maxTileX; x++) {
            if (Math.abs(x) > 1) {
                this.addTerrainBlocker(x, minTileY);
            }
            this.addTerrainBlocker(x, maxTileY);
        }

        for (let y = minTileY; y <= maxTileY; y++) {
            this.addTerrainBlocker(minTileX, y);
            this.addTerrainBlocker(maxTileX, y);
        }
    }

    getResourceAt(x: number, y: number): string | null {
        return this.resourceMap.get(`${x},${y}`) || null;
    }

    getResourceAtKey(key: string): string | null {
        return this.resourceMap.get(key) || null;
    }

    getResourceMap(): Map<string, string> {
        return this.resourceMap;
    }

    getTerrainAt(x: number, y: number): string | null {
        return this.terrainMap.get(`${x},${y}`) || null;
    }

    isTerrainBlocked(x: number, y: number): boolean {
        const terrainType = this.getTerrainAt(x, y);
        return Boolean(terrainType && CONFIG.TERRAIN[terrainType]?.BLOCKS_BUILDING);
    }

    blocksEnemyAt(x: number, y: number): boolean {
        const terrainType = this.getTerrainAt(x, y);
        return Boolean(terrainType && CONFIG.TERRAIN[terrainType]?.BLOCKS_ENEMY);
    }

    getTerrainMap(): Map<string, string> {
        return this.terrainMap;
    }
}
