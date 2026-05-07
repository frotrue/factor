import { CONFIG } from '../config.js';

/**
 * 무한 그리드 + 자원 매립지 렌더러
 * 카메라 변화 감지 기반 최적화 포함
 */
export default class GridRenderer {
    constructor(scene, mapManager) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.gridSize = CONFIG.GRID_SIZE;

        this.graphics = scene.add.graphics();
        this.graphics.setDepth(0);

        this.lastCameraState = { x: 0, y: 0, zoom: 0 };
    }

    draw(force = false) {
        const camera = this.scene.cameras.main;

        // 이전 카메라 상태와 비교하여 변화가 없으면 리턴 (최적화)
        if (!force &&
            Math.abs(this.lastCameraState.x - camera.scrollX) < CONFIG.OPTIMIZATION.GRID_REDRAW_THRESHOLD &&
            Math.abs(this.lastCameraState.y - camera.scrollY) < CONFIG.OPTIMIZATION.GRID_REDRAW_THRESHOLD &&
            this.lastCameraState.zoom === camera.zoom) {
            return;
        }

        this.lastCameraState.x = camera.scrollX;
        this.lastCameraState.y = camera.scrollY;
        this.lastCameraState.zoom = camera.zoom;

        const zoom = camera.zoom;
        const width = camera.width / zoom;
        const height = camera.height / zoom;
        const startX = camera.scrollX;
        const startY = camera.scrollY;

        this.graphics.clear();

        // 1. 자원 매립지 렌더링
        this.drawResourcePatches(startX, startY, width, height);

        // 2. 그리드 선 렌더링
        this.drawGridLines(startX, startY, width, height);
    }

    drawResourcePatches(startX, startY, width, height) {
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

    drawGridLines(startX, startY, width, height) {
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
