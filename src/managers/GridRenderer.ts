import Phaser from 'phaser';
import { CONFIG } from '../config';
import MapManager from './MapManager';

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
        this.drawTerrain(startX - padding, startY - padding, width + padding * 2, height + padding * 2);
        this.drawResourcePatches(startX - padding, startY - padding, width + padding * 2, height + padding * 2);
        this.drawGridLines(startX - padding, startY - padding, width + padding * 2, height + padding * 2);
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

                const color = CONFIG.TERRAIN[type]?.COLOR ?? 0x475569;
                this.graphics.fillStyle(color, 0.7);
                this.graphics.fillRect(x + 3, y + 3, this.gridSize - 6, this.gridSize - 6);
                this.graphics.lineStyle(1, 0xcbd5e1, 0.22);
                this.graphics.strokeRect(x + 5, y + 5, this.gridSize - 10, this.gridSize - 10);

                if (type === 'BLOCKER') {
                    const inner = this.gridSize - 12;
                    this.graphics.lineStyle(1, 0x22d3ee, 0.38);
                    this.graphics.beginPath();
                    this.graphics.moveTo(x + 7, y + this.gridSize - 9);
                    this.graphics.lineTo(x + 15, y + 15);
                    this.graphics.lineTo(x + 23, y + this.gridSize - 12);
                    this.graphics.lineTo(x + inner, y + 10);
                    this.graphics.strokePath();

                    this.graphics.lineStyle(1, 0xf472b6, 0.34);
                    this.graphics.strokeRect(x + 9, y + 9, this.gridSize - 18, this.gridSize - 18);

                    this.graphics.fillStyle(0x22d3ee, 0.72);
                    this.graphics.fillCircle(x + 11, y + this.gridSize - 11, 2);
                    this.graphics.fillCircle(x + 23, y + 11, 2);
                    this.graphics.fillStyle(0xf472b6, 0.7);
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
                    const color = CONFIG.RESOURCE_PATCHES[type];
                    this.graphics.fillStyle(color, 0.2);
                    this.graphics.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
                }
            }
        }
    }

    drawGridLines(startX: number, startY: number, width: number, height: number): void {
        this.graphics.lineStyle(1, 0x444444, 0.3);
        const offsetX = startX % this.gridSize;
        const offsetY = startY % this.gridSize;

        for (let x = startX - offsetX; x < startX + width + this.gridSize; x += this.gridSize) {
            this.graphics.moveTo(x, startY);
            this.graphics.lineTo(x, startY + height);
        }
        for (let y = startY - offsetY; y < startY + height + this.gridSize; y += this.gridSize) {
            this.graphics.moveTo(startX, y);
            this.graphics.lineTo(startX + width, y);
        }
        this.graphics.strokePath();
    }
}
