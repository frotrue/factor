import Phaser from 'phaser';
import { CONFIG } from '../config';
import MapManager from './MapManager';
import { VISUAL_THEME } from '../visuals/visualTheme';

interface CameraState {
    x: number;
    y: number;
    zoom: number;
}

interface DrawBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

type GridDetailTier = 'low' | 'high';
const GRID_DEPTH = -100;

interface ChunkRecord {
    image: Phaser.GameObjects.Image;
    textureKey: string;
}

export default class GridRenderer {
    private static nextInstanceId = 0;

    scene: Phaser.Scene;
    mapManager: MapManager;
    gridSize: number;
    graphics: Phaser.GameObjects.Graphics;
    lastCameraState: CameraState;
    private readonly chunkTiles: number;
    private readonly chunkPixelSize: number;
    private readonly instanceId: number;
    private readonly chunks = new Map<string, ChunkRecord>();
    private cacheHits = 0;
    private cacheMisses = 0;

    constructor(scene: Phaser.Scene, mapManager: MapManager) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.gridSize = CONFIG.GRID_SIZE;
        this.chunkTiles = CONFIG.OPTIMIZATION.GRID_CHUNK_TILES;
        this.chunkPixelSize = this.chunkTiles * this.gridSize;
        this.instanceId = GridRenderer.nextInstanceId++;
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(GRID_DEPTH);
        this.graphics.setVisible(false);
        this.lastCameraState = { x: 0, y: 0, zoom: 0 };
    }

    draw(force: boolean = false): void {
        const camera = this.scene.cameras.main;
        const view = camera.worldView;

        const zoomDelta = Math.abs(this.lastCameraState.zoom - camera.zoom);
        const posDelta = Math.abs(this.lastCameraState.x - view.x) + Math.abs(this.lastCameraState.y - view.y);

        if (force) {
            this.clearChunkCache();
        }

        if (!force && zoomDelta < 0.001 && posDelta < CONFIG.OPTIMIZATION.GRID_REDRAW_THRESHOLD) {
            return;
        }

        this.lastCameraState.x = view.x;
        this.lastCameraState.y = view.y;
        this.lastCameraState.zoom = camera.zoom;

        const padding = this.gridSize;
        this.drawVisibleChunks(
            view.x - padding,
            view.y - padding,
            view.width + padding * 2,
            view.height + padding * 2
        );
    }

    getCacheStats(): { chunks: number; hits: number; misses: number } {
        return {
            chunks: this.chunks.size,
            hits: this.cacheHits,
            misses: this.cacheMisses
        };
    }

    destroy(): void {
        this.clearChunkCache();
        this.graphics.destroy();
    }

    drawBackdrop(startX: number, startY: number, width: number, height: number): void {
        this.drawBackdropLocal(startX, startY, width, height, this.getDetailTier());
    }

    drawTerrain(startX: number, startY: number, width: number, height: number): void {
        const detail = this.getDetailTier();
        const bounds = this.getVisibleTileBounds(startX, startY, width, height);

        for (let tileY = bounds.minY; tileY < bounds.maxY; tileY++) {
            for (let tileX = bounds.minX; tileX < bounds.maxX; tileX++) {
                const x = tileX * this.gridSize;
                const y = tileY * this.gridSize;
                const type = this.mapManager.getTerrainAt(x, y);
                if (type) {
                    this.drawTerrainTile(x, y, type, detail);
                }
            }
        }
    }

    drawResourcePatches(startX: number, startY: number, width: number, height: number): void {
        const detail = this.getDetailTier();
        const bounds = this.getVisibleTileBounds(startX, startY, width, height);

        for (let tileY = bounds.minY; tileY < bounds.maxY; tileY++) {
            for (let tileX = bounds.minX; tileX < bounds.maxX; tileX++) {
                const x = tileX * this.gridSize;
                const y = tileY * this.gridSize;
                const type = this.mapManager.getResourceAt(x, y);
                if (type) {
                    this.drawResourceTile(x, y, type, detail);
                }
            }
        }
    }

    drawGridLines(startX: number, startY: number, width: number, height: number): void {
        this.drawGridLinesLocal(startX, startY, width, height, this.getDetailTier());
    }

    private drawVisibleChunks(startX: number, startY: number, width: number, height: number): void {
        const detail = this.getDetailTier();
        const minChunkX = Math.floor(startX / this.chunkPixelSize);
        const maxChunkX = Math.floor((startX + width) / this.chunkPixelSize);
        const minChunkY = Math.floor(startY / this.chunkPixelSize);
        const maxChunkY = Math.floor((startY + height) / this.chunkPixelSize);
        const visibleKeys = new Set<string>();

        for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
                const key = this.getChunkKey(chunkX, chunkY, detail);
                visibleKeys.add(key);
                this.getOrCreateChunk(chunkX, chunkY, detail).image.setVisible(true);
            }
        }

        this.chunks.forEach((record, key) => {
            if (!visibleKeys.has(key)) {
                record.image.setVisible(false);
            }
        });
    }

    private getOrCreateChunk(chunkX: number, chunkY: number, detail: GridDetailTier): ChunkRecord {
        const key = this.getChunkKey(chunkX, chunkY, detail);
        const cached = this.chunks.get(key);
        if (cached) {
            this.cacheHits++;
            return cached;
        }

        this.cacheMisses++;
        const textureKey = `grid-chunk-${this.instanceId}-${key}`;
        const worldX = chunkX * this.chunkPixelSize;
        const worldY = chunkY * this.chunkPixelSize;
        this.renderChunkTexture(textureKey, worldX, worldY, detail);

        const image = this.scene.add.image(worldX, worldY, textureKey);
        image.setOrigin(0, 0);
        image.setDepth(GRID_DEPTH);

        const record = { image, textureKey };
        this.chunks.set(key, record);
        return record;
    }

    private renderChunkTexture(textureKey: string, worldX: number, worldY: number, detail: GridDetailTier): void {
        if (this.scene.textures.exists(textureKey)) {
            this.scene.textures.remove(textureKey);
        }

        this.graphics.clear();
        this.drawBackdropLocal(worldX, worldY, this.chunkPixelSize, this.chunkPixelSize, detail);
        this.drawTerrainLocal(worldX, worldY, detail);
        this.drawResourcePatchesLocal(worldX, worldY, detail);
        this.drawGridLinesLocal(worldX, worldY, this.chunkPixelSize, this.chunkPixelSize, detail);
        this.graphics.generateTexture(textureKey, this.chunkPixelSize, this.chunkPixelSize);
        this.graphics.clear();
    }

    private clearChunkCache(): void {
        this.chunks.forEach(record => {
            record.image.destroy();
            if (this.scene.textures.exists(record.textureKey)) {
                this.scene.textures.remove(record.textureKey);
            }
        });
        this.chunks.clear();
    }

    private drawBackdropLocal(startX: number, startY: number, width: number, height: number, detail: GridDetailTier): void {
        this.graphics.fillStyle(VISUAL_THEME.world.background, 1);
        this.graphics.fillRect(0, 0, width, height);

        const sectorMultiplier = detail === 'low' ? 32 : 8;
        const sectorSize = this.gridSize * sectorMultiplier;
        const sectorStartX = Math.floor(startX / sectorSize) * sectorSize;
        const sectorStartY = Math.floor(startY / sectorSize) * sectorSize;

        this.graphics.lineStyle(1, VISUAL_THEME.world.fog, 0.5);
        for (let x = sectorStartX; x < startX + width + sectorSize; x += sectorSize) {
            const localX = x - startX;
            this.graphics.lineBetween(localX, 0, localX, height);
        }
        for (let y = sectorStartY; y < startY + height + sectorSize; y += sectorSize) {
            const localY = y - startY;
            this.graphics.lineBetween(0, localY, width, localY);
        }
    }

    private drawTerrainLocal(chunkWorldX: number, chunkWorldY: number, detail: GridDetailTier): void {
        const bounds = this.getClampedTileBounds(
            chunkWorldX / this.gridSize,
            chunkWorldY / this.gridSize,
            this.chunkTiles,
            this.chunkTiles
        );

        for (let tileY = bounds.minY; tileY < bounds.maxY; tileY++) {
            for (let tileX = bounds.minX; tileX < bounds.maxX; tileX++) {
                const worldX = tileX * this.gridSize;
                const worldY = tileY * this.gridSize;
                const type = this.mapManager.getTerrainAt(worldX, worldY);
                if (type) {
                    this.drawTerrainTile(worldX - chunkWorldX, worldY - chunkWorldY, type, detail);
                }
            }
        }
    }

    private drawTerrainTile(x: number, y: number, type: string, detail: GridDetailTier): void {
        if (detail === 'low') {
            this.graphics.fillStyle(VISUAL_THEME.world.blockerBase, 0.78);
            this.graphics.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
            return;
        }

        this.graphics.fillStyle(VISUAL_THEME.world.blockerBase, 0.9);
        this.graphics.fillRoundedRect(x + 3, y + 3, this.gridSize - 6, this.gridSize - 6, 3);
        this.graphics.lineStyle(1, VISUAL_THEME.world.blockerEdge, 0.24);
        this.graphics.strokeRoundedRect(x + 5, y + 5, this.gridSize - 10, this.gridSize - 10, 2);

        if (type !== 'BLOCKER') return;

        const inner = this.gridSize - 12;
        this.graphics.lineStyle(1, VISUAL_THEME.world.blockerEdge, 0.45);
        this.graphics.beginPath();
        this.graphics.moveTo(x + 7, y + this.gridSize - 9);
        this.graphics.lineTo(x + 15, y + 15);
        this.graphics.lineTo(x + 23, y + this.gridSize - 12);
        this.graphics.lineTo(x + inner, y + 10);
        this.graphics.strokePath();

        this.graphics.lineStyle(1, VISUAL_THEME.world.blockerCorruption, 0.38);
        this.graphics.strokeRect(x + 9, y + 9, this.gridSize - 18, this.gridSize - 18);

        this.graphics.fillStyle(VISUAL_THEME.world.blockerEdge, 0.78);
        this.graphics.fillCircle(x + 11, y + this.gridSize - 11, 2);
        this.graphics.fillCircle(x + 23, y + 11, 2);
        this.graphics.fillStyle(VISUAL_THEME.world.blockerCorruption, 0.72);
        this.graphics.fillCircle(x + this.gridSize - 11, y + 19, 2);
    }

    private drawResourcePatchesLocal(chunkWorldX: number, chunkWorldY: number, detail: GridDetailTier): void {
        const bounds = this.getClampedTileBounds(
            chunkWorldX / this.gridSize,
            chunkWorldY / this.gridSize,
            this.chunkTiles,
            this.chunkTiles
        );

        for (let tileY = bounds.minY; tileY < bounds.maxY; tileY++) {
            for (let tileX = bounds.minX; tileX < bounds.maxX; tileX++) {
                const worldX = tileX * this.gridSize;
                const worldY = tileY * this.gridSize;
                const type = this.mapManager.getResourceAt(worldX, worldY);
                if (type) {
                    this.drawResourceTile(worldX - chunkWorldX, worldY - chunkWorldY, type, detail);
                }
            }
        }
    }

    private drawResourceTile(x: number, y: number, type: string, detail: GridDetailTier): void {
        const color = CONFIG.RESOURCE_PATCHES[type] ?? VISUAL_THEME.world.resourceSilicon;
        if (detail === 'low') {
            this.graphics.fillStyle(color, 0.28);
            this.graphics.fillRect(x + 4, y + 4, this.gridSize - 8, this.gridSize - 8);
            return;
        }

        this.graphics.fillStyle(color, 0.16);
        this.graphics.fillRoundedRect(x + 3, y + 3, this.gridSize - 6, this.gridSize - 6, 5);
        this.graphics.lineStyle(1, color, 0.32);
        this.graphics.lineBetween(x + 8, y + this.gridSize - 8, x + this.gridSize - 8, y + 8);
        this.graphics.fillStyle(color, 0.55);
        this.graphics.fillCircle(x + this.gridSize / 2, y + this.gridSize / 2, type === 'ENERGY' ? 3 : 2);
    }

    private drawGridLinesLocal(startX: number, startY: number, width: number, height: number, detail: GridDetailTier): void {
        if (detail === 'high') {
            const offsetX = this.positiveModulo(startX, this.gridSize);
            const offsetY = this.positiveModulo(startY, this.gridSize);

            this.graphics.lineStyle(1, VISUAL_THEME.world.gridMinor, 0.12);
            this.graphics.beginPath();
            for (let x = startX - offsetX; x < startX + width + this.gridSize; x += this.gridSize) {
                const isMajor = Math.round(x / this.gridSize) % 4 === 0;
                if (isMajor) continue;
                const localX = x - startX;
                this.graphics.moveTo(localX, 0);
                this.graphics.lineTo(localX, height);
            }
            for (let y = startY - offsetY; y < startY + height + this.gridSize; y += this.gridSize) {
                const isMajor = Math.round(y / this.gridSize) % 4 === 0;
                if (isMajor) continue;
                const localY = y - startY;
                this.graphics.moveTo(0, localY);
                this.graphics.lineTo(width, localY);
            }
            this.graphics.strokePath();
        }

        const majorStepMultiplier = detail === 'low' ? 16 : 4;
        const majorGridSize = this.gridSize * majorStepMultiplier;
        const offsetX = this.positiveModulo(startX, majorGridSize);
        const offsetY = this.positiveModulo(startY, majorGridSize);

        this.graphics.lineStyle(1, VISUAL_THEME.world.gridMajor, detail === 'low' ? 0.16 : 0.22);
        this.graphics.beginPath();
        for (let x = startX - offsetX; x < startX + width + majorGridSize; x += majorGridSize) {
            const localX = x - startX;
            this.graphics.moveTo(localX, 0);
            this.graphics.lineTo(localX, height);
        }
        for (let y = startY - offsetY; y < startY + height + majorGridSize; y += majorGridSize) {
            const localY = y - startY;
            this.graphics.moveTo(0, localY);
            this.graphics.lineTo(width, localY);
        }
        this.graphics.strokePath();
    }

    private getVisibleTileBounds(startX: number, startY: number, width: number, height: number): DrawBounds {
        const gridStartX = Math.floor(startX / this.gridSize);
        const gridStartY = Math.floor(startY / this.gridSize);
        const gridWidth = Math.ceil(width / this.gridSize) + 1;
        const gridHeight = Math.ceil(height / this.gridSize) + 1;

        return this.getClampedTileBounds(gridStartX, gridStartY, gridWidth, gridHeight);
    }

    private getClampedTileBounds(startTileX: number, startTileY: number, widthTiles: number, heightTiles: number): DrawBounds {
        const bounds = this.mapManager.getWorldBounds();
        const minX = bounds ? bounds.minX : -64;
        const maxX = bounds ? bounds.maxX : 64;
        const minY = bounds ? bounds.minY : -64;
        const maxY = bounds ? bounds.maxY : 64;

        return {
            minX: Math.max(startTileX, minX),
            maxX: Math.min(startTileX + widthTiles, maxX + 1),
            minY: Math.max(startTileY, minY),
            maxY: Math.min(startTileY + heightTiles, maxY + 1)
        };
    }

    private getDetailTier(): GridDetailTier {
        return this.scene.cameras.main.zoom < 0.75 ? 'low' : 'high';
    }

    private getChunkKey(chunkX: number, chunkY: number, detail: GridDetailTier): string {
        return `${chunkX},${chunkY},${detail}`;
    }

    private positiveModulo(value: number, divisor: number): number {
        return ((value % divisor) + divisor) % divisor;
    }
}
