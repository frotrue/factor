import Phaser from 'phaser';
import { CONFIG } from '../config';
import MapManager from './MapManager';
import { VISUAL_THEME } from '../visuals/visualTheme';

interface CameraState {
    x: number;
    y: number;
    zoom: number;
}

export default class GridRenderer {
    scene: Phaser.Scene;
    mapManager: MapManager;
    gridSize: number;
    graphics: Phaser.GameObjects.Graphics;
    lastCameraState: CameraState;

    constructor(scene: Phaser.Scene, mapManager: MapManager) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.gridSize = CONFIG.GRID_SIZE;
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(0);
        this.lastCameraState = { x: 0, y: 0, zoom: 0 };
    }

    draw(force: boolean = false): void {
        const camera = this.scene.cameras.main;
        const view = camera.worldView;

        const zoomDelta = Math.abs(this.lastCameraState.zoom - camera.zoom);
        const posDelta = Math.abs(this.lastCameraState.x - view.x) + Math.abs(this.lastCameraState.y - view.y);

        if (!force && zoomDelta < 0.001 && posDelta < CONFIG.OPTIMIZATION.GRID_REDRAW_THRESHOLD) {
            return;
        }

        this.lastCameraState.x = view.x;
        this.lastCameraState.y = view.y;
        this.lastCameraState.zoom = camera.zoom;

        const startX = view.x;
        const startY = view.y;
        const width = view.width;
        const height = view.height;

        this.graphics.clear();

        const padding = this.gridSize;
        this.drawBackdrop(startX - padding, startY - padding, width + padding * 2, height + padding * 2);
        this.drawTerrain(startX - padding, startY - padding, width + padding * 2, height + padding * 2);
        this.drawResourcePatches(startX - padding, startY - padding, width + padding * 2, height + padding * 2);
        this.drawGridLines(startX - padding, startY - padding, width + padding * 2, height + padding * 2);
    }

    drawBackdrop(startX: number, startY: number, width: number, height: number): void {
        this.graphics.fillStyle(VISUAL_THEME.world.background, 1);
        this.graphics.fillRect(startX, startY, width, height);

        const sectorSize = this.gridSize * 8;
        const sectorStartX = Math.floor(startX / sectorSize) * sectorSize;
        const sectorStartY = Math.floor(startY / sectorSize) * sectorSize;
        this.graphics.lineStyle(1, VISUAL_THEME.world.fog, 0.5);
        for (let x = sectorStartX; x < startX + width + sectorSize; x += sectorSize) {
            this.graphics.lineBetween(x, startY, x, startY + height);
        }
        for (let y = sectorStartY; y < startY + height + sectorSize; y += sectorSize) {
            this.graphics.lineBetween(startX, y, startX + width, y);
        }

        this.graphics.fillStyle(VISUAL_THEME.world.gridAxis, 0.08);
        this.graphics.fillCircle(CONFIG.GRID_SIZE * 2, CONFIG.GRID_SIZE * 2, CONFIG.GRID_SIZE * 3.2);
    }

    drawTerrain(startX: number, startY: number, width: number, height: number): void {
        const gridStartX = Math.floor(startX / this.gridSize);
        const gridStartY = Math.floor(startY / this.gridSize);
        const gridWidth = Math.ceil(width / this.gridSize) + 1;
        const gridHeight = Math.ceil(height / this.gridSize) + 1;
        const terrainMap = this.mapManager.getTerrainMap();

        for (let i = gridStartX; i < gridStartX + gridWidth; i++) {
            for (let j = gridStartY; j < gridStartY + gridHeight; j++) {
                const x = i * this.gridSize;
                const y = j * this.gridSize;
                const type = terrainMap.get(`${x},${y}`);
                if (!type) continue;

                this.graphics.fillStyle(VISUAL_THEME.world.blockerBase, 0.9);
                this.graphics.fillRoundedRect(x + 3, y + 3, this.gridSize - 6, this.gridSize - 6, 3);
                this.graphics.lineStyle(1, VISUAL_THEME.world.blockerEdge, 0.24);
                this.graphics.strokeRoundedRect(x + 5, y + 5, this.gridSize - 10, this.gridSize - 10, 2);

                if (type === 'BLOCKER') {
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
            }
        }
    }

    drawResourcePatches(startX: number, startY: number, width: number, height: number): void {
        const gridStartX = Math.floor(startX / this.gridSize);
        const gridStartY = Math.floor(startY / this.gridSize);
        const gridWidth = Math.ceil(width / this.gridSize) + 1;
        const gridHeight = Math.ceil(height / this.gridSize) + 1;
        const resourceMap = this.mapManager.getResourceMap();

        for (let i = gridStartX; i < gridStartX + gridWidth; i++) {
            for (let j = gridStartY; j < gridStartY + gridHeight; j++) {
                const x = i * this.gridSize;
                const y = j * this.gridSize;
                const type = resourceMap.get(`${x},${y}`);
                if (type) {
                    const color = type === 'ENERGY' ? VISUAL_THEME.world.resourceEnergy : VISUAL_THEME.world.resourceSilicon;
                    this.graphics.fillStyle(color, 0.16);
                    this.graphics.fillRoundedRect(x + 3, y + 3, this.gridSize - 6, this.gridSize - 6, 5);
                    this.graphics.lineStyle(1, color, 0.32);
                    this.graphics.lineBetween(x + 8, y + this.gridSize - 8, x + this.gridSize - 8, y + 8);
                    this.graphics.fillStyle(color, 0.55);
                    this.graphics.fillCircle(x + this.gridSize / 2, y + this.gridSize / 2, type === 'ENERGY' ? 3 : 2);
                }
            }
        }
    }

    drawGridLines(startX: number, startY: number, width: number, height: number): void {
        const offsetX = startX % this.gridSize;
        const offsetY = startY % this.gridSize;

        this.graphics.lineStyle(1, VISUAL_THEME.world.gridMinor, 0.12);
        this.graphics.beginPath();
        for (let x = startX - offsetX; x < startX + width + this.gridSize; x += this.gridSize) {
            const isMajor = Math.round(x / this.gridSize) % 4 === 0;
            if (isMajor) continue;
            this.graphics.moveTo(x, startY);
            this.graphics.lineTo(x, startY + height);
        }
        for (let y = startY - offsetY; y < startY + height + this.gridSize; y += this.gridSize) {
            const isMajor = Math.round(y / this.gridSize) % 4 === 0;
            if (isMajor) continue;
            this.graphics.moveTo(startX, y);
            this.graphics.lineTo(startX + width, y);
        }
        this.graphics.strokePath();

        this.graphics.lineStyle(1, VISUAL_THEME.world.gridMajor, 0.22);
        this.graphics.beginPath();
        for (let x = startX - offsetX; x < startX + width + this.gridSize; x += this.gridSize) {
            if (Math.round(x / this.gridSize) % 4 !== 0) continue;
            this.graphics.moveTo(x, startY);
            this.graphics.lineTo(x, startY + height);
        }
        for (let y = startY - offsetY; y < startY + height + this.gridSize; y += this.gridSize) {
            if (Math.round(y / this.gridSize) % 4 !== 0) continue;
            this.graphics.moveTo(startX, y);
            this.graphics.lineTo(startX + width, y);
        }
        this.graphics.strokePath();
    }
}
