import { CONFIG } from '../config';
import { MapBounds, MapPresetConfig, MapPresetId, MapType, StarterResourceZoneConfig, TileArea } from '../types';

interface GenerateMapOptions {
    presetId: MapPresetId;
    seed?: number;
}

export default class MapManager {
    resourceMap: Map<string, string>;
    terrainMap: Map<string, string>;
    gridSize: number;
    mapType: MapType;
    mapPresetId: MapPresetId;
    mapSeed: number | null;
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
        this.mapPresetId = 'standard';
        this.mapSeed = null;
    }

    generateMap({ presetId, seed }: GenerateMapOptions): number | null {
        const preset = CONFIG.MAP_PRESETS[presetId];
        this.mapPresetId = preset.ID;
        this.mapType = preset.MAP_TYPE;
        this.mapSeed = preset.RANDOM_RESOURCES || preset.STARTER_ZONES ? seed ?? this.createSeed() : null;
        this.resourceMap.clear();
        this.terrainMap.clear();

        const random = this.mapSeed === null ? null : this.createRandom(this.mapSeed);

        this.addTerrainLayouts(preset, random);
        preset.FIXED_RESOURCES?.forEach(patch => this.addPatch(patch.x, patch.y, patch.size, patch.type));

        if (random) {
            preset.STARTER_ZONES?.forEach(zone => this.addPatchInZone(zone, random));
            this.addRandomResourcePatches(preset, random);
        }

        if (preset.MAP_TYPE === 'random') {
            this.cleanupReservedResources();
        }
        this.repairStarterResources(preset, random);
        if (preset.MAP_TYPE === 'random') {
            this.cleanupReservedResources();
        }

        return this.mapSeed;
    }

    generateResourcePatches(): void {
        this.generateMap({ presetId: 'standard' });
    }

    getCurrentPreset(): MapPresetConfig {
        return CONFIG.MAP_PRESETS[this.mapPresetId];
    }

    getWorldBounds(): MapBounds | null {
        return this.getCurrentPreset().WORLD_BOUNDS || null;
    }

    getBuildBounds(): MapBounds | null {
        const preset = this.getCurrentPreset();
        return preset.BUILD_BOUNDS || preset.WORLD_BOUNDS || null;
    }

    getCameraBoundsPixels(): { x: number; y: number; width: number; height: number } | null {
        const bounds = this.getWorldBounds();
        if (!bounds) return null;

        const padding = (this.getCurrentPreset().CAMERA_PADDING_TILES ?? 0) * this.gridSize;
        const minX = bounds.minX * this.gridSize - padding;
        const minY = bounds.minY * this.gridSize - padding;
        const maxX = (bounds.maxX + 1) * this.gridSize + padding;
        const maxY = (bounds.maxY + 1) * this.gridSize + padding;
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    isAreaWithinBuildBounds(x: number, y: number, widthTiles: number, heightTiles: number): boolean {
        const bounds = this.getBuildBounds();
        if (!bounds) return true;

        const minTileX = x / this.gridSize;
        const minTileY = y / this.gridSize;
        const maxTileX = minTileX + widthTiles - 1;
        const maxTileY = minTileY + heightTiles - 1;
        return minTileX >= bounds.minX
            && maxTileX <= bounds.maxX
            && minTileY >= bounds.minY
            && maxTileY <= bounds.maxY;
    }

    addGuaranteedSpawnPatches(): void {
        CONFIG.MAP_PRESETS.standard.STARTER_ZONES?.forEach(zone => {
            this.addPatch(zone.area.minX, zone.area.minY, zone.patchSize, zone.type);
        });
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
        const coreMinX = CONFIG.CORE_ORIGIN.TILE_X - 1;
        const coreMaxX = CONFIG.CORE_ORIGIN.TILE_X + (CONFIG.BUILDINGS.CORE.WIDTH || 1);
        const coreMinY = CONFIG.CORE_ORIGIN.TILE_Y - 1;
        const coreMaxY = CONFIG.CORE_ORIGIN.TILE_Y + (CONFIG.BUILDINGS.CORE.HEIGHT || 1);
        if (tileX >= coreMinX && tileX <= coreMaxX && tileY >= coreMinY && tileY <= coreMaxY) return;
        this.terrainMap.set(key, 'BLOCKER');
    }

    addEarlyLaneBlockers(random?: (() => number) | null): void {
        const rand = random || this.createRandom(12345);

        // ==========================================
        // 1. NORTH: Winding Sine Corridor (부드러운 곡선 협곡)
        // ==========================================
        const northPhase = rand() * Math.PI * 2;
        const northAmp = 2 + rand() * 4; // 2 to 6 tiles wiggle
        const northFreq = 0.08 + rand() * 0.08;
        const northWidth = 10;

        for (let y = -50; y <= -20; y++) {
            if (y >= -38 && y <= -32) continue; // gate
            const wX = Math.round(Math.sin(y * northFreq + northPhase) * northAmp);
            const leftWall = wX - Math.floor(northWidth / 2);
            const rightWall = wX + Math.ceil(northWidth / 2);
            this.addTerrainBlocker(leftWall, y);
            this.addTerrainBlocker(rightWall, y);
        }
        // North horizontal bar
        const cX_bar_north = Math.round(Math.sin(-42 * northFreq + northPhase) * northAmp);
        for (let x = -30; x <= 30; x++) {
            if (x >= cX_bar_north - 4 && x <= cX_bar_north + 4) continue; // gate
            this.addTerrainBlocker(x, -42);
        }

        // ==========================================
        // 2. SOUTH: Composite Jagged Canyon (울퉁불퉁한 암벽 협곡)
        // ==========================================
        const southPhase = rand() * Math.PI * 2;
        const southAmpLow = 2 + rand() * 3;
        const southFreqLow = 0.06 + rand() * 0.04;
        const southWidth = 10;

        for (let y = 20; y <= 50; y++) {
            if (y >= 32 && y <= 38) continue; // gate
            // Low-frequency sine + High-frequency wiggle for jagged look
            const wX = Math.round(
                Math.sin(y * southFreqLow + southPhase) * southAmpLow +
                Math.sin(y * 0.42 + southPhase * 2.5) * 1.6
            );
            const leftWall = wX - Math.floor(southWidth / 2);
            const rightWall = wX + Math.ceil(southWidth / 2);
            this.addTerrainBlocker(leftWall, y);
            this.addTerrainBlocker(rightWall, y);
        }
        // South horizontal bar
        const cX_bar_south = Math.round(
            Math.sin(42 * southFreqLow + southPhase) * southAmpLow +
            Math.sin(42 * 0.42 + southPhase * 2.5) * 1.6
        );
        for (let x = -30; x <= 30; x++) {
            if (x >= cX_bar_south - 4 && x <= cX_bar_south + 4) continue; // gate
            this.addTerrainBlocker(x, 42);
        }

        // ==========================================
        // 3. EAST: Fortified Wall with Bastions (옹벽과 탑이 있는 성벽 지형)
        // ==========================================
        const eastPhase = rand() * Math.PI * 2;
        const eastAmp = 2 + rand() * 3;
        const eastFreq = 0.08 + rand() * 0.06;
        const eastWidth = 10;

        for (let x = 20; x <= 50; x++) {
            if (x >= 32 && x <= 38) continue; // gate
            const wY = Math.round(Math.sin(x * eastFreq + eastPhase) * eastAmp);
            const topWall = wY - Math.floor(eastWidth / 2);
            const bottomWall = wY + Math.ceil(eastWidth / 2);
            
            // Draw standard wall line
            this.addTerrainBlocker(x, topWall);
            this.addTerrainBlocker(x, bottomWall);

            // Add thick defensive tower/bastion (3x3 cross) every 5 tiles
            if (x % 5 === 0) {
                this.addTerrainBlocker(x, topWall - 1);
                this.addTerrainBlocker(x, topWall + 1);
                this.addTerrainBlocker(x - 1, topWall);
                this.addTerrainBlocker(x + 1, topWall);

                this.addTerrainBlocker(x, bottomWall - 1);
                this.addTerrainBlocker(x, bottomWall + 1);
                this.addTerrainBlocker(x - 1, bottomWall);
                this.addTerrainBlocker(x + 1, bottomWall);
            }
        }
        // East vertical bar
        const cY_bar_east = Math.round(Math.sin(42 * eastFreq + eastPhase) * eastAmp);
        for (let y = -30; y <= 30; y++) {
            if (y >= cY_bar_east - 4 && y <= cY_bar_east + 4) continue; // gate
            this.addTerrainBlocker(42, y);
        }

        // ==========================================
        // 4. WEST: Tapering Funnel Canyon (점점 좁아지는 깔때기 협곡)
        // ==========================================
        const westPhase = rand() * Math.PI * 2;
        const westAmp = 1 + rand() * 2; // Keep wiggle smaller to focus on tapering shape
        const westFreq = 0.08 + rand() * 0.06;

        for (let x = -50; x <= -20; x++) {
            if (x >= -38 && x <= -32) continue; // gate
            
            // Width starts at 16 tiles at map edge (x = -50) and tapers to 8 tiles at core side (x = -20)
            const laneWidth = 16 - Math.round(8 * (x + 50) / 30);
            const wY = Math.round(Math.sin(x * westFreq + westPhase) * westAmp);
            const topWall = wY - Math.floor(laneWidth / 2);
            const bottomWall = wY + Math.ceil(laneWidth / 2);
            
            this.addTerrainBlocker(x, topWall);
            this.addTerrainBlocker(x, bottomWall);
        }
        // West vertical bar
        const cY_bar_west = Math.round(Math.sin(-42 * westFreq + westPhase) * westAmp);
        for (let y = -30; y <= 30; y++) {
            if (y >= cY_bar_west - 4 && y <= cY_bar_west + 4) continue; // gate
            this.addTerrainBlocker(-42, y);
        }

        // ==========================================
        // 5. MAP DEBRIS: Scattered small clumps in empty space
        // ==========================================
        const bounds = this.getWorldBounds() || { minX: -64, maxX: 64, minY: -64, maxY: 64 };
        const safe = CONFIG.MAP_PRESETS.standard.STARTER_SAFE_AREA || { minX: -20, maxX: 20, minY: -20, maxY: 20 };
        const clumpCount = this.randomInt(rand, 12, 18);
        for (let c = 0; c < clumpCount; c++) {
            let startX = 0;
            let startY = 0;
            for (let attempt = 0; attempt < 50; attempt++) {
                startX = this.randomInt(rand, bounds.minX + 4, bounds.maxX - 4);
                startY = this.randomInt(rand, bounds.minY + 4, bounds.maxY - 4);
                const inSafe = startX >= safe.minX && startX <= safe.maxX && startY >= safe.minY && startY <= safe.maxY;
                if (!inSafe) break;
            }
            const clumpSize = this.randomInt(rand, 1, 3);
            for (let i = 0; i < clumpSize; i++) {
                for (let j = 0; j < clumpSize; j++) {
                    if (rand() < 0.75) {
                        this.addTerrainBlocker(startX + i, startY + j);
                    }
                }
            }
        }
    }

    /** Small standalone training arena for learning core building roles. */
    generateTutorialMap(): void {
        this.generateMap({ presetId: 'tutorial' });
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

    private addTerrainLayouts(preset: MapPresetConfig, random: (() => number) | null): void {
        preset.TERRAIN_LAYOUTS?.forEach(layout => {
            if (layout === 'earlyLaneBlockers') {
                this.addEarlyLaneBlockers(random);
            } else if (layout === 'tutorialArenaWalls') {
                this.addTutorialArenaWalls();
            }
        });
    }

    private addRandomResourcePatches(preset: MapPresetConfig, random: () => number): void {
        if (!preset.RANDOM_RESOURCES) return;

        const config = preset.RANDOM_RESOURCES;
        const count = this.randomInt(random, config.patchCount.min, config.patchCount.max);

        for (let i = 0; i < count; i++) {
            const type = i < config.types.length
                ? config.types[i]
                : config.types[this.randomInt(random, 0, config.types.length - 1)];
            const size = this.randomInt(random, config.patchSize.min, config.patchSize.max);
            const start = this.pickPatchStart(config.range, size, random, config.exclusionZones);
            this.addPatch(start.x, start.y, size, type);
        }
    }

    private repairStarterResources(preset: MapPresetConfig, random: (() => number) | null): void {
        if (!random || !preset.STARTER_ZONES || !preset.STARTER_VALIDATION) return;

        for (let attempt = 0; attempt < preset.STARTER_VALIDATION.maxRepairAttempts; attempt++) {
            let repaired = false;
            for (const zone of preset.STARTER_ZONES) {
                const count = this.countResourceInRadius(
                    zone.type,
                    preset.STARTER_VALIDATION.center.x,
                    preset.STARTER_VALIDATION.center.y,
                    preset.STARTER_VALIDATION.radius
                );
                if (count >= zone.minTiles) continue;
                this.addPatchInZone(zone, random);
                repaired = true;
            }
            this.cleanupReservedResources();
            if (!repaired) return;
        }
    }

    private addPatchInZone(zone: StarterResourceZoneConfig, random: () => number): void {
        const startX = this.randomInt(random, zone.area.minX, zone.area.maxX - zone.patchSize + 1);
        const startY = this.randomInt(random, zone.area.minY, zone.area.maxY - zone.patchSize + 1);
        this.addPatch(startX, startY, zone.patchSize, zone.type);
    }

    private pickPatchStart(
        area: TileArea,
        size: number,
        random: () => number,
        exclusionZones: TileArea[] = []
    ): { x: number; y: number } {
        for (let attempt = 0; attempt < 100; attempt++) {
            const x = this.randomInt(random, area.minX, area.maxX);
            const y = this.randomInt(random, area.minY, area.maxY);
            if (!exclusionZones.some(zone => this.areaContainsTile(zone, x, y))) {
                return { x, y };
            }
        }
        return { x: area.minX, y: area.minY };
    }

    private cleanupReservedResources(): void {
        Array.from(this.resourceMap.keys()).forEach(key => {
            const [x, y] = key.split(',').map(Number);
            if (this.isCoreFootprintTile(x, y) || this.terrainMap.has(key)) {
                this.resourceMap.delete(key);
            }
        });
    }

    private isCoreFootprintTile(x: number, y: number): boolean {
        const originX = CONFIG.CORE_ORIGIN.TILE_X * this.gridSize;
        const originY = CONFIG.CORE_ORIGIN.TILE_Y * this.gridSize;
        const width = CONFIG.BUILDINGS.CORE.WIDTH || 1;
        const height = CONFIG.BUILDINGS.CORE.HEIGHT || 1;
        return x >= originX
            && x < originX + width * this.gridSize
            && y >= originY
            && y < originY + height * this.gridSize
            && x % this.gridSize === 0
            && y % this.gridSize === 0;
    }

    private countResourceInRadius(type: string, centerTileX: number, centerTileY: number, radius: number): number {
        let count = 0;
        this.resourceMap.forEach((resourceType, key) => {
            if (resourceType !== type) return;
            const [x, y] = key.split(',').map(Number);
            const tileX = x / this.gridSize;
            const tileY = y / this.gridSize;
            if (Math.abs(tileX - centerTileX) <= radius && Math.abs(tileY - centerTileY) <= radius) {
                count++;
            }
        });
        return count;
    }

    private areaContainsTile(area: TileArea, tileX: number, tileY: number): boolean {
        return tileX >= area.minX && tileX <= area.maxX && tileY >= area.minY && tileY <= area.maxY;
    }

    private randomInt(random: () => number, min: number, max: number): number {
        return Math.floor(random() * (max - min + 1)) + min;
    }

    private createSeed(): number {
        return Math.floor(Math.random() * 0xffffffff);
    }

    private createRandom(seed: number): () => number {
        let state = seed >>> 0;
        return () => {
            state += 0x6D2B79F5;
            let value = state;
            value = Math.imul(value ^ value >>> 15, value | 1);
            value ^= value + Math.imul(value ^ value >>> 7, value | 61);
            return ((value ^ value >>> 14) >>> 0) / 4294967296;
        };
    }
}
