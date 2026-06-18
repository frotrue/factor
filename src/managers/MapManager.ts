import { CONFIG } from '../config';
import { MapBounds, MapPresetConfig, MapPresetId, MapType, ResourceRingConfig, StarterResourceZoneConfig, TileArea } from '../types';

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
    private reservedEnemyPathTiles: Set<string>;
    private enemyLaneStarts: Array<{ x: number; y: number }>;
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
        this.reservedEnemyPathTiles = new Set();
        this.enemyLaneStarts = [];
    }

    generateMap({ presetId, seed }: GenerateMapOptions): number | null {
        const preset = CONFIG.MAP_PRESETS[presetId];
        this.mapPresetId = preset.ID;
        this.mapType = preset.MAP_TYPE;
        this.mapSeed = preset.RANDOM_RESOURCES || preset.RESOURCE_RINGS || preset.STARTER_ZONES ? seed ?? this.createSeed() : null;
        this.resourceMap.clear();
        this.terrainMap.clear();
        this.reservedEnemyPathTiles.clear();
        this.enemyLaneStarts = [];

        const random = this.mapSeed === null ? null : this.createRandom(this.mapSeed);

        this.addTerrainLayouts(preset, random);
        preset.FIXED_RESOURCES?.forEach(patch => this.addResourcePatch(preset, patch.x, patch.y, patch.size, patch.type, random));

        if (random) {
            preset.STARTER_ZONES?.forEach(zone => this.addPatchInZone(zone, random));
            if (preset.RESOURCE_RINGS) {
                this.addResourceRingPatches(preset, random);
            } else {
                this.addRandomResourcePatches(preset, random);
            }
        }

        if (preset.MAP_TYPE === 'random') {
            this.cleanupReservedResources();
        }
        this.repairStarterResources(preset, random);
        if (preset.MAP_TYPE === 'random') {
            this.cleanupReservedResources();
        }
        if (preset.ID === 'standard') {
            this.validateAndRepairStandardEnemyPaths(random || this.createRandom(12345));
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
        if (this.reservedEnemyPathTiles.has(this.getTileKey(tileX, tileY))) return;
        const x = tileX * this.gridSize;
        const y = tileY * this.gridSize;
        const key = `${x},${y}`;
        if (this.resourceMap.has(key)) return;
        if (this.isCurrentPresetFixedResourceTile(tileX, tileY)) return;
        const coreMinX = CONFIG.CORE_ORIGIN.TILE_X - 1;
        const coreMaxX = CONFIG.CORE_ORIGIN.TILE_X + (CONFIG.BUILDINGS.CORE.WIDTH || 1);
        const coreMinY = CONFIG.CORE_ORIGIN.TILE_Y - 1;
        const coreMaxY = CONFIG.CORE_ORIGIN.TILE_Y + (CONFIG.BUILDINGS.CORE.HEIGHT || 1);
        if (tileX >= coreMinX && tileX <= coreMaxX && tileY >= coreMinY && tileY <= coreMaxY) return;
        this.terrainMap.set(key, 'BLOCKER');
    }

    addEarlyLaneBlockers(random?: (() => number) | null): void {
        const rand = random || this.createRandom(12345);
        const bounds = this.getWorldBounds() || { minX: -64, maxX: 64, minY: -64, maxY: 64 };
        const safe = CONFIG.MAP_PRESETS.standard.STARTER_SAFE_AREA || { minX: -20, maxX: 20, minY: -20, maxY: 20 };

        // TODO(mindustry-style): replace these route-local formations with a terrain region layer
        // that emits lane-side rock/debris/ruin regions first, then lets rough lines and clusters
        // fill region edges. Keep reservedEnemyPathTiles as the corridor contract for that pass.
        const northCount = this.randomInt(rand, 9, 13);
        for (let i = 0; i < northCount; i++) {
            const side = rand() < 0.5 ? -1 : 1;
            const centerY = this.randomInt(rand, -54, -24);
            const drift = Math.round(Math.sin(centerY * 0.17 + rand() * Math.PI) * 4);
            const centerX = side * this.randomInt(rand, 8, 20) + drift;
            this.addBlockerBlob(centerX, centerY, this.randomInt(rand, 2, 5), this.randomInt(rand, 2, 4), 0.68, rand);
        }
        this.addRoughBlockerLine(-28, -44, -8, -38, 3, 0.55, rand);
        this.addRoughBlockerLine(8, -39, 29, -45, 3, 0.55, rand);

        const southCount = this.randomInt(rand, 10, 15);
        for (let i = 0; i < southCount; i++) {
            const side = rand() < 0.5 ? -1 : 1;
            const centerY = this.randomInt(rand, 24, 55);
            const centerX = side * this.randomInt(rand, 7, 22) + Math.round(Math.sin(centerY * 0.13) * 3);
            this.addBlockerBlob(centerX, centerY, this.randomInt(rand, 2, 4), this.randomInt(rand, 2, 5), 0.72, rand);
        }
        this.addRoughBlockerLine(-25, 41, -7, 48, 2, 0.5, rand);
        this.addRoughBlockerLine(7, 48, 26, 40, 2, 0.5, rand);

        const eastCount = this.randomInt(rand, 8, 12);
        for (let i = 0; i < eastCount; i++) {
            const side = rand() < 0.5 ? -1 : 1;
            const centerX = this.randomInt(rand, 26, 55);
            const centerY = side * this.randomInt(rand, 8, 23) + Math.round(Math.sin(centerX * 0.15) * 3);
            this.addBlockerBlob(centerX, centerY, this.randomInt(rand, 2, 4), this.randomInt(rand, 2, 4), 0.62, rand);
        }
        for (let i = 0; i < 5; i++) {
            const x = this.randomInt(rand, 28, 53);
            const y = (rand() < 0.5 ? -1 : 1) * this.randomInt(rand, 10, 26);
            this.addRoughBlockerLine(x - 4, y + this.randomInt(rand, -2, 2), x + 5, y + this.randomInt(rand, -2, 2), 2, 0.62, rand);
        }

        const westCount = this.randomInt(rand, 11, 16);
        for (let i = 0; i < westCount; i++) {
            const centerX = this.randomInt(rand, -56, -24);
            const laneT = (centerX - bounds.minX) / (-20 - bounds.minX);
            const laneHalfWidth = Math.round(10 - laneT * 4);
            const side = rand() < 0.5 ? -1 : 1;
            const centerY = side * this.randomInt(rand, laneHalfWidth, laneHalfWidth + 9);
            this.addBlockerBlob(centerX, centerY, this.randomInt(rand, 3, 6), this.randomInt(rand, 2, 5), 0.7, rand);
        }
        this.addRoughBlockerLine(-54, -15, -28, -8, 4, 0.52, rand);
        this.addRoughBlockerLine(-54, 15, -28, 8, 4, 0.52, rand);

        [
            { x: -24, y: -24 },
            { x: 24, y: -24 },
            { x: -24, y: 24 },
            { x: 24, y: 24 }
        ].forEach(anchor => {
            const x = anchor.x + this.randomInt(rand, -3, 3);
            const y = anchor.y + this.randomInt(rand, -3, 3);
            this.addBlockerCluster(x, y, this.randomInt(rand, 3, 5), rand);
        });

        // TODO(mindustry-style): convert global debris into named grouped terrain regions instead
        // of isolated scatter. These clusters are intentionally medium-sized so the future region
        // pass can absorb them without changing enemy path validation.
        const clumpCount = this.randomInt(rand, 10, 14);
        for (let c = 0; c < clumpCount; c++) {
            let centerX = 0;
            let centerY = 0;
            for (let attempt = 0; attempt < 50; attempt++) {
                centerX = this.randomInt(rand, bounds.minX + 5, bounds.maxX - 5);
                centerY = this.randomInt(rand, bounds.minY + 5, bounds.maxY - 5);
                const inSafe = centerX >= safe.minX && centerX <= safe.maxX && centerY >= safe.minY && centerY <= safe.maxY;
                if (!inSafe) break;
            }
            this.addBlockerCluster(centerX, centerY, this.randomInt(rand, 2, 4), rand);
        }

        this.breakLongStraightBlockerRuns(9);
        this.cleanupTinyBlockerFragments(4);
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

    hasEnemyPathForTest(startTile: { x: number; y: number }, goalTile: { x: number; y: number }): boolean {
        const bounds = this.getWorldBounds() || CONFIG.MAP_PRESETS.standard.WORLD_BOUNDS || { minX: -64, maxX: 64, minY: -64, maxY: 64 };
        return this.hasEnemyPath(startTile, goalTile, bounds);
    }

    getReservedEnemyPathTilesForTest(): Set<string> {
        return new Set(this.reservedEnemyPathTiles);
    }

    getStandardEnemyLaneStartsForTest(): Array<{ x: number; y: number }> {
        return this.getStandardEnemyLaneStarts();
    }

    getCoreTileForTest(): { x: number; y: number } {
        return this.getCoreTile();
    }

    private addTerrainLayouts(preset: MapPresetConfig, random: (() => number) | null): void {
        preset.TERRAIN_LAYOUTS?.forEach(layout => {
            if (layout === 'earlyLaneBlockers') {
                const rand = random || this.createRandom(12345);
                this.reserveStandardEnemyLanes(rand);
                this.addBoundaryTerrainPass(rand);
                this.addEarlyLaneBlockers(random);
            } else if (layout === 'tutorialArenaWalls') {
                this.addTutorialArenaWalls();
            }
        });
    }

    private addBlockerBlob(
        centerTileX: number,
        centerTileY: number,
        radiusX: number,
        radiusY: number,
        density: number,
        random: () => number
    ): void {
        const safeRadiusX = Math.max(1, radiusX);
        const safeRadiusY = Math.max(1, radiusY);
        for (let y = centerTileY - safeRadiusY; y <= centerTileY + safeRadiusY; y++) {
            for (let x = centerTileX - safeRadiusX; x <= centerTileX + safeRadiusX; x++) {
                const dx = (x - centerTileX) / safeRadiusX;
                const dy = (y - centerTileY) / safeRadiusY;
                const distance = dx * dx + dy * dy;
                if (distance > 1) continue;
                const edgeFalloff = 1 - distance;
                const chance = density * (0.35 + edgeFalloff * 0.65);
                if (random() < chance) {
                    this.addTerrainBlocker(x, y);
                }
            }
        }
    }

    private addResourcePatch(
        preset: MapPresetConfig,
        startX: number,
        startY: number,
        size: number,
        type: string,
        random: (() => number) | null
    ): void {
        if (preset.ID !== 'standard' || !random) {
            this.addPatch(startX, startY, size, type);
            return;
        }

        this.addOrganicResourcePatch(startX, startY, size, type, random);
    }

    private addOrganicResourcePatch(startX: number, startY: number, size: number, type: string, random: () => number): void {
        // TODO(mindustry-style): promote this blob helper into an ore vein layer that can bias
        // placement toward terrain region edges, so resources feel embedded in larger formations.
        const centerX = startX + (size - 1) / 2;
        const centerY = startY + (size - 1) / 2;
        const radiusX = Math.max(2, Math.ceil(size * (0.75 + random() * 0.35)));
        const radiusY = Math.max(2, Math.ceil(size * (0.75 + random() * 0.35)));
        const minX = Math.floor(centerX - radiusX);
        const maxX = Math.ceil(centerX + radiusX);
        const minY = Math.floor(centerY - radiusY);
        const maxY = Math.ceil(centerY + radiusY);

        for (let tileY = minY; tileY <= maxY; tileY++) {
            for (let tileX = minX; tileX <= maxX; tileX++) {
                const dx = (tileX - centerX) / radiusX;
                const dy = (tileY - centerY) / radiusY;
                const distance = dx * dx + dy * dy;
                if (distance > 1.15) continue;

                const edgeFalloff = Math.max(0, 1 - distance);
                const chance = 0.28 + edgeFalloff * 0.72;
                const inDenseCore = Math.abs(tileX - centerX) <= Math.max(1, size * 0.35)
                    && Math.abs(tileY - centerY) <= Math.max(1, size * 0.35);
                if (!inDenseCore && random() > chance) continue;

                const key = this.getPixelKey(tileX, tileY);
                if (this.terrainMap.has(key) || this.isCoreFootprintTile(tileX * this.gridSize, tileY * this.gridSize)) continue;
                this.resourceMap.set(key, type);
            }
        }
    }

    private addRoughBlockerLine(
        startTileX: number,
        startTileY: number,
        endTileX: number,
        endTileY: number,
        thickness: number,
        density: number,
        random: () => number
    ): void {
        const dx = endTileX - startTileX;
        const dy = endTileY - startTileY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const steps = Math.max(1, Math.ceil(distance / Math.max(2, thickness * 1.6)));
        const normalX = -dy / distance;
        const normalY = dx / distance;

        for (let i = 0; i <= steps; i++) {
            if (random() > density) continue;
            const t = i / steps;
            const baseX = startTileX + dx * t;
            const baseY = startTileY + dy * t;
            const jitterAlong = (random() - 0.5) * thickness * 1.5;
            const jitterAcross = (random() - 0.5) * thickness * 2.4;
            const centerX = Math.round(baseX + (dx / distance) * jitterAlong + normalX * jitterAcross);
            const centerY = Math.round(baseY + (dy / distance) * jitterAlong + normalY * jitterAcross);
            const radiusX = Math.max(1, Math.round(thickness * (0.5 + random() * 0.7)));
            const radiusY = Math.max(1, Math.round(thickness * (0.45 + random() * 0.65)));
            this.addBlockerBlob(centerX, centerY, radiusX, radiusY, 0.58 + random() * 0.18, random);
        }
    }

    private addBlockerCluster(centerTileX: number, centerTileY: number, radius: number, random: () => number): void {
        // TODO(mindustry-style): treat this as the smallest region primitive. A later pass can
        // compose several clusters into biome/industrial masses while preserving this API.
        const clusterCount = this.randomInt(random, 2, 4);
        this.addBlockerBlob(centerTileX, centerTileY, radius, Math.max(2, radius - 1), 0.7, random);
        for (let i = 0; i < clusterCount; i++) {
            const angle = random() * Math.PI * 2;
            const distance = this.randomInt(random, 2, Math.max(3, radius + 3));
            const x = centerTileX + Math.round(Math.cos(angle) * distance);
            const y = centerTileY + Math.round(Math.sin(angle) * distance);
            this.addBlockerBlob(x, y, this.randomInt(random, 2, Math.max(2, radius)), this.randomInt(random, 2, Math.max(2, radius)), 0.55, random);
        }
    }

    private addBoundaryTerrainPass(random: () => number): void {
        const bounds = CONFIG.MAP_PRESETS.standard.WORLD_BOUNDS || { minX: -64, maxX: 64, minY: -64, maxY: 64 };
        const safe = CONFIG.MAP_PRESETS.standard.STARTER_SAFE_AREA || { minX: -20, maxX: 20, minY: -20, maxY: 20 };
        const insetMin = 2;
        const insetMax = 12;

        const addEdgeCluster = (tileX: number, tileY: number, inwardX: number, inwardY: number) => {
            const depth = this.randomInt(random, insetMin, insetMax);
            const x = tileX + inwardX * depth + this.randomInt(random, -4, 4);
            const y = tileY + inwardY * depth + this.randomInt(random, -4, 4);
            if (this.areaContainsTile(safe, x, y)) return;
            const edgeDistance = Math.min(
                Math.abs(x - bounds.minX),
                Math.abs(x - bounds.maxX),
                Math.abs(y - bounds.minY),
                Math.abs(y - bounds.maxY)
            );
            const radius = edgeDistance <= 6 ? this.randomInt(random, 6, 9) : this.randomInt(random, 4, 7);
            this.addBlockerCluster(x, y, radius, random);
        };

        for (let x = bounds.minX + 7; x <= bounds.maxX - 7; x += this.randomInt(random, 7, 11)) {
            if (random() < 0.85) addEdgeCluster(x, bounds.minY, 0, 1);
            if (random() < 0.85) addEdgeCluster(x, bounds.maxY, 0, -1);
        }
        for (let y = bounds.minY + 7; y <= bounds.maxY - 7; y += this.randomInt(random, 7, 11)) {
            if (random() < 0.85) addEdgeCluster(bounds.minX, y, 1, 0);
            if (random() < 0.85) addEdgeCluster(bounds.maxX, y, -1, 0);
        }

        [
            { x: bounds.minX + 9, y: bounds.minY + 9 },
            { x: bounds.maxX - 9, y: bounds.minY + 9 },
            { x: bounds.minX + 9, y: bounds.maxY - 9 },
            { x: bounds.maxX - 9, y: bounds.maxY - 9 }
        ].forEach(corner => {
            this.addBlockerCluster(
                corner.x + this.randomInt(random, -4, 4),
                corner.y + this.randomInt(random, -4, 4),
                this.randomInt(random, 7, 10),
                random
            );
        });

        this.addRoughBlockerLine(bounds.minX + 8, bounds.minY + 18, bounds.minX + 26, bounds.minY + 7, 5, 0.7, random);
        this.addRoughBlockerLine(bounds.maxX - 8, bounds.minY + 18, bounds.maxX - 26, bounds.minY + 7, 5, 0.7, random);
        this.addRoughBlockerLine(bounds.minX + 8, bounds.maxY - 18, bounds.minX + 26, bounds.maxY - 7, 5, 0.7, random);
        this.addRoughBlockerLine(bounds.maxX - 8, bounds.maxY - 18, bounds.maxX - 26, bounds.maxY - 7, 5, 0.7, random);
    }

    private reserveStandardEnemyLanes(random: () => number): void {
        const goal = this.getCoreTile();
        const starts = this.getStandardEnemyLaneStarts();
        this.enemyLaneStarts = starts;
        starts.forEach(start => {
            this.reserveEnemyLane(start.x, start.y, goal.x, goal.y, 4, random);
            this.reserveTilesAround(start.x, start.y, 6);
        });
    }

    private reserveEnemyLane(
        startTileX: number,
        startTileY: number,
        goalTileX: number,
        goalTileY: number,
        width: number,
        random: () => number
    ): void {
        const dx = goalTileX - startTileX;
        const dy = goalTileY - startTileY;
        const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
        const curve = (random() - 0.5) * 8;
        const horizontal = Math.abs(dx) >= Math.abs(dy);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const bend = Math.sin(t * Math.PI) * curve;
            const x = Math.round(startTileX + dx * t + (horizontal ? 0 : bend));
            const y = Math.round(startTileY + dy * t + (horizontal ? bend : 0));
            this.reserveTilesAround(x, y, width);
        }
    }

    private reserveTilesAround(centerTileX: number, centerTileY: number, radius: number): void {
        for (let y = centerTileY - radius; y <= centerTileY + radius; y++) {
            for (let x = centerTileX - radius; x <= centerTileX + radius; x++) {
                if (Math.hypot(x - centerTileX, y - centerTileY) <= radius) {
                    this.reservedEnemyPathTiles.add(this.getTileKey(x, y));
                }
            }
        }
    }

    private validateAndRepairStandardEnemyPaths(random: () => number): void {
        const bounds = CONFIG.MAP_PRESETS.standard.WORLD_BOUNDS || { minX: -64, maxX: 64, minY: -64, maxY: 64 };
        const goal = this.getCoreTile();
        const starts = this.enemyLaneStarts.length > 0 ? this.enemyLaneStarts : this.getStandardEnemyLaneStarts();

        starts.forEach(start => {
            if (this.hasEnemyPath(start, goal, bounds)) return;
            this.repairEnemyPath(start, goal, random, 2);
            if (this.hasEnemyPath(start, goal, bounds)) return;
            this.repairEnemyPath(start, goal, random, 4);
        });
    }

    private hasEnemyPath(
        startTile: { x: number; y: number },
        goalTile: { x: number; y: number },
        bounds: { minX: number; maxX: number; minY: number; maxY: number }
    ): boolean {
        const queue: Array<{ x: number; y: number }> = [startTile];
        const visited = new Set<string>([this.getTileKey(startTile.x, startTile.y)]);
        const directions = CONFIG.DIRECTIONS.map(direction => ({ x: direction.x, y: direction.y }));
        let queueIndex = 0;

        while (queueIndex < queue.length) {
            const current = queue[queueIndex++];
            if (current.x === goalTile.x && current.y === goalTile.y) return true;

            for (const direction of directions) {
                const next = { x: current.x + direction.x, y: current.y + direction.y };
                if (next.x < bounds.minX || next.x > bounds.maxX || next.y < bounds.minY || next.y > bounds.maxY) continue;
                const key = this.getTileKey(next.x, next.y);
                if (visited.has(key)) continue;
                if (!(next.x === goalTile.x && next.y === goalTile.y) && this.terrainMap.has(this.getPixelKey(next.x, next.y))) continue;
                visited.add(key);
                queue.push(next);
            }
        }

        return false;
    }

    private repairEnemyPath(startTile: { x: number; y: number }, goalTile: { x: number; y: number }, random: () => number, width: number): void {
        const dx = goalTile.x - startTile.x;
        const dy = goalTile.y - startTile.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
        const curve = (random() - 0.5) * 4;
        const horizontal = Math.abs(dx) >= Math.abs(dy);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const bend = Math.sin(t * Math.PI) * curve;
            const x = Math.round(startTile.x + dx * t + (horizontal ? 0 : bend));
            const y = Math.round(startTile.y + dy * t + (horizontal ? bend : 0));
            for (let yy = y - width; yy <= y + width; yy++) {
                for (let xx = x - width; xx <= x + width; xx++) {
                    if (Math.hypot(xx - x, yy - y) <= width) {
                        this.terrainMap.delete(this.getPixelKey(xx, yy));
                        this.reservedEnemyPathTiles.add(this.getTileKey(xx, yy));
                    }
                }
            }
        }
    }

    private breakLongStraightBlockerRuns(maxRunLength: number): void {
        const blockerTiles = new Set<string>();
        this.terrainMap.forEach((_terrainType, key) => {
            const [x, y] = key.split(',').map(Number);
            blockerTiles.add(this.getTileKey(x / this.gridSize, y / this.gridSize));
        });

        const deleteTile = (tileX: number, tileY: number) => {
            this.terrainMap.delete(this.getPixelKey(tileX, tileY));
            blockerTiles.delete(this.getTileKey(tileX, tileY));
        };

        blockerTiles.forEach(key => {
            const [tileX, tileY] = key.split(',').map(Number);
            if (!blockerTiles.has(this.getTileKey(tileX - 1, tileY))) {
                let length = 0;
                while (blockerTiles.has(this.getTileKey(tileX + length, tileY))) {
                    length++;
                }
                for (let offset = maxRunLength; offset < length; offset += maxRunLength + 1) {
                    deleteTile(tileX + offset, tileY);
                }
            }
        });

        Array.from(blockerTiles).forEach(key => {
            const [tileX, tileY] = key.split(',').map(Number);
            if (!blockerTiles.has(this.getTileKey(tileX, tileY - 1))) {
                let length = 0;
                while (blockerTiles.has(this.getTileKey(tileX, tileY + length))) {
                    length++;
                }
                for (let offset = maxRunLength; offset < length; offset += maxRunLength + 1) {
                    deleteTile(tileX, tileY + offset);
                }
            }
        });
    }

    private cleanupTinyBlockerFragments(minClusterSize: number): void {
        // TODO(mindustry-style): run this after region generation too, but prefer merging tiny
        // fragments into nearby regions when that metadata exists.
        const blockerTiles = new Set<string>();
        this.terrainMap.forEach((_terrainType, key) => {
            const [x, y] = key.split(',').map(Number);
            blockerTiles.add(this.getTileKey(x / this.gridSize, y / this.gridSize));
        });

        const visited = new Set<string>();
        blockerTiles.forEach(startKey => {
            if (visited.has(startKey)) return;
            const cluster: string[] = [];
            const queue = [startKey];
            visited.add(startKey);

            for (let index = 0; index < queue.length; index++) {
                const key = queue[index];
                cluster.push(key);
                const [tileX, tileY] = key.split(',').map(Number);
                CONFIG.DIRECTIONS.forEach(direction => {
                    const nextKey = this.getTileKey(tileX + direction.x, tileY + direction.y);
                    if (!blockerTiles.has(nextKey) || visited.has(nextKey)) return;
                    visited.add(nextKey);
                    queue.push(nextKey);
                });
            }

            if (cluster.length >= minClusterSize) return;
            cluster.forEach(key => {
                const [tileX, tileY] = key.split(',').map(Number);
                this.terrainMap.delete(this.getPixelKey(tileX, tileY));
            });
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
            this.addResourcePatch(preset, start.x, start.y, size, type, random);
        }
    }

    private addResourceRingPatches(preset: MapPresetConfig, random: () => number): void {
        preset.RESOURCE_RINGS?.forEach(ring => {
            const count = this.randomInt(random, ring.patchCount.min, ring.patchCount.max);
            for (let i = 0; i < count; i++) {
                const size = this.randomInt(random, ring.patchSize.min, ring.patchSize.max);
                const start = this.pickResourceRingStart(ring, size, random, preset);
                if (!start) continue;
                this.addResourcePatch(preset, start.x, start.y, size, this.pickRingResourceType(start.x, start.y, ring, random), random);
            }
        });
    }

    private pickResourceRingStart(
        ring: ResourceRingConfig,
        size: number,
        random: () => number,
        preset: MapPresetConfig
    ): { x: number; y: number } | null {
        const bounds = preset.RESOURCE_BOUNDS || preset.BUILD_BOUNDS || preset.WORLD_BOUNDS || {
            minX: -60,
            maxX: 60,
            minY: -60,
            maxY: 60
        };

        for (let attempt = 0; attempt < 100; attempt++) {
            const angle = random() * Math.PI * 2;
            const distance = this.randomInt(random, ring.minDistance, ring.maxDistance);
            const x = Math.round(Math.cos(angle) * distance - Math.floor(size / 2));
            const y = Math.round(Math.sin(angle) * distance - Math.floor(size / 2));
            if (this.isResourcePatchPlacementValid(x, y, size, bounds, preset)) {
                return { x, y };
            }
        }
        return null;
    }

    private isResourcePatchPlacementValid(
        startX: number,
        startY: number,
        size: number,
        bounds: MapBounds,
        preset: MapPresetConfig
    ): boolean {
        if (startX < bounds.minX || startY < bounds.minY) return false;
        if (startX + size - 1 > bounds.maxX || startY + size - 1 > bounds.maxY) return false;

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const tileX = startX + i;
                const tileY = startY + j;
                const x = tileX * this.gridSize;
                const y = tileY * this.gridSize;
                const key = `${x},${y}`;
                if (this.terrainMap.has(key) || this.resourceMap.has(key) || this.isCoreFootprintTile(x, y)) return false;
                if (preset.STARTER_SAFE_AREA && this.areaContainsTile(preset.STARTER_SAFE_AREA, tileX, tileY)) return false;
            }
        }
        return true;
    }

    private pickRingResourceType(tileX: number, tileY: number, ring: ResourceRingConfig, random: () => number): string {
        if (random() < 0.14) {
            return 'MATERIAL_SAMPLE';
        }
        if (!ring.directionalBias) {
            return random() < 0.5 ? 'SILICON' : 'ENERGY';
        }
        const siliconChance = tileY < 0 || tileX > 0 ? 0.6 : 0.4;
        return random() < siliconChance ? 'SILICON' : 'ENERGY';
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
        this.addResourcePatch(this.getCurrentPreset(), startX, startY, zone.patchSize, zone.type, random);
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

    private isCurrentPresetFixedResourceTile(tileX: number, tileY: number): boolean {
        const preset = CONFIG.MAP_PRESETS[this.mapPresetId];
        return Boolean(preset.FIXED_RESOURCES?.some(patch =>
            tileX >= patch.x
            && tileX < patch.x + patch.size
            && tileY >= patch.y
            && tileY < patch.y + patch.size
        ));
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

    private getTileKey(tileX: number, tileY: number): string {
        return `${tileX},${tileY}`;
    }

    private getPixelKey(tileX: number, tileY: number): string {
        return `${tileX * this.gridSize},${tileY * this.gridSize}`;
    }

    private getCoreTile(): { x: number; y: number } {
        return {
            x: CONFIG.CORE_ORIGIN.TILE_X + Math.floor((CONFIG.BUILDINGS.CORE.WIDTH || 1) / 2),
            y: CONFIG.CORE_ORIGIN.TILE_Y + Math.floor((CONFIG.BUILDINGS.CORE.HEIGHT || 1) / 2)
        };
    }

    private getStandardEnemyLaneStarts(): Array<{ x: number; y: number }> {
        const bounds = CONFIG.MAP_PRESETS.standard.WORLD_BOUNDS || { minX: -64, maxX: 64, minY: -64, maxY: 64 };
        const progresses = [0.42, 0.5, 0.58];
        const starts: Array<{ x: number; y: number }> = [];
        progresses.forEach(progress => {
            const x = Math.round(bounds.minX + progress * (bounds.maxX - bounds.minX));
            const y = Math.round(bounds.minY + progress * (bounds.maxY - bounds.minY));
            starts.push(
                { x, y: bounds.minY },
                { x: bounds.maxX, y },
                { x, y: bounds.maxY },
                { x: bounds.minX, y }
            );
        });
        return starts;
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
