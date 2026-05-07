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
        this.drawResourcePatches(startX - padding, startY - padding, width + padding * 2, height + padding * 2);
        this.drawGridLines(startX - padding, startY - padding, width + padding * 2, height + padding * 2);
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
