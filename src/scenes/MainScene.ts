import Phaser from 'phaser';
import { CONFIG } from '../config';

import BuildingManager from '../managers/BuildingManager';
import ItemManager from '../managers/ItemManager';
import MapManager from '../managers/MapManager';
import UIManager from '../managers/UIManager';
import GridRenderer from '../managers/GridRenderer';
import CameraController from '../managers/CameraController';
import TickSystem from '../managers/TickSystem';
import PowerManager from '../managers/PowerManager';
import EventBus from '../managers/EventBus';

export default class MainScene extends Phaser.Scene {
    buildingManager!: BuildingManager;
    itemManager!: ItemManager;
    mapManager!: MapManager;
    uiManager!: UIManager;
    gridRenderer!: GridRenderer;
    cameraController!: CameraController;
    tickSystem!: TickSystem;
    powerManager!: PowerManager;

    currentRotation: number = 0;
    showPowerGrid: boolean = false;
    powerGridDirty: boolean = false;

    powerGridGraphics!: Phaser.GameObjects.Graphics;
    cursorContainer!: Phaser.GameObjects.Container;
    ghostGraphics!: Phaser.GameObjects.Graphics;
    cursorArrow!: Phaser.GameObjects.Triangle;

    constructor() {
        super('MainScene');
    }

    create(): void {
        this.mapManager = new MapManager();
        this.itemManager = new ItemManager(this);
        this.buildingManager = new BuildingManager(this);
        this.powerManager = new PowerManager(this, this.buildingManager);
        this.tickSystem = new TickSystem(this, this.buildingManager, this.itemManager, this.mapManager, this.powerManager);
        this.gridRenderer = new GridRenderer(this, this.mapManager);
        this.cameraController = new CameraController(this);
        this.uiManager = new UIManager(this);

        this.mapManager.generateResourcePatches();
        this.buildingManager.place(0, 0, 'CORE', 0);

        this.setupCursor();
        this.setupInput();
        this.setupEvents();
        this.gridRenderer.draw(true);
    }

    setupEvents(): void {
        EventBus.on('BUILDING_SELECTED', () => {
            this.updateCursorGraphics();
        });

        EventBus.on('POWER_UPDATED', () => {
            this.powerGridDirty = true;
        });

        EventBus.on('BUILDING_PLACED', ({ building, type }: { key: string; building: any; type: string }) => {
            building.container.setScale(0.5);
            building.container.setAlpha(0);
            this.tweens.add({
                targets: building.container,
                scaleX: 1, scaleY: 1, alpha: 1,
                duration: 200, ease: 'Back.easeOut'
            });
            this.uiManager.logMessage(`System: ${CONFIG.BUILDINGS[type].NAME} Online.`);
        });

        EventBus.on('BUILDING_REMOVED', ({ key }: { key: string }) => {
            const [x, y] = key.split(',').map(Number);
            const effect = this.add.rectangle(x + CONFIG.GRID_SIZE / 2, y + CONFIG.GRID_SIZE / 2, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE, 0xff4444);
            effect.setDepth(15);
            this.tweens.add({
                targets: effect,
                scaleX: 1.5, scaleY: 1.5, alpha: 0,
                duration: 300, ease: 'Power2',
                onComplete: () => effect.destroy()
            });
            this.uiManager.logMessage(`System: Unit disconnected at [${x}, ${y}].`, true);
        });

        this.events.on('shutdown', () => {
            EventBus.off('BUILDING_SELECTED');
            EventBus.off('BUILDING_PLACED');
            EventBus.off('BUILDING_REMOVED');
            EventBus.off('POWER_UPDATED');
        });
    }

    setupInput(): void {
        this.input.mouse!.disableContextMenu();
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.keyboard!.on('keydown-R', () => this.rotateCursor());
        this.input.keyboard!.on('keydown-F2', () => {
            this.showPowerGrid = !this.showPowerGrid;
            this.powerGridDirty = true;
            this.uiManager.logMessage(`System: Power Grid Overlay ${this.showPowerGrid ? 'ON' : 'OFF'}`);
        });
    }

    setupCursor(): void {
        this.powerGridGraphics = this.add.graphics();
        this.powerGridGraphics.setDepth(10);

        this.cursorContainer = this.add.container(0, 0);
        this.ghostGraphics = this.add.graphics();
        this.cursorArrow = this.add.triangle(
            CONFIG.GRID_SIZE / 2, CONFIG.GRID_SIZE / 2,
            12, 0, 0, 12, 0, -12, 0xffffff, 1
        );
        this.cursorArrow.setAngle(CONFIG.DIRECTIONS[this.currentRotation].angle);
        this.cursorContainer.add([this.ghostGraphics, this.cursorArrow]);
        this.cursorContainer.setDepth(100);
        this.cursorContainer.setAlpha(0.6);
        this.updateCursorGraphics();
    }

    updateCursorGraphics(): void {
        const mode = this.uiManager.getSelectedBuildingType();
        this.ghostGraphics.clear();

        if (mode === 'REMOVE') {
            this.ghostGraphics.lineStyle(2, 0xff0000);
            this.ghostGraphics.strokeRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            this.ghostGraphics.lineBetween(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            this.ghostGraphics.lineBetween(CONFIG.GRID_SIZE, 0, 0, CONFIG.GRID_SIZE);
            this.cursorArrow.setVisible(false);
            this.cursorContainer.setAlpha(1);
        } else {
            const bConfig = CONFIG.BUILDINGS[mode];
            const w = bConfig?.WIDTH || 1;
            const h = bConfig?.HEIGHT || 1;

            this.ghostGraphics.fillStyle(bConfig.COLOR || 0xaaaaaa, 0.5);
            this.ghostGraphics.fillRect(0, 0, CONFIG.GRID_SIZE * w, CONFIG.GRID_SIZE * h);

            const cx = (CONFIG.GRID_SIZE * w) / 2;
            const cy = (CONFIG.GRID_SIZE * h) / 2;
            this.ghostGraphics.lineStyle(2, 0xffffff);

            switch (this.currentRotation) {
                case 0:
                    this.ghostGraphics.lineBetween(cx - 5, cy, cx + 10, cy);
                    this.ghostGraphics.lineBetween(cx + 10, cy, cx + 5, cy - 5);
                    this.ghostGraphics.lineBetween(cx + 10, cy, cx + 5, cy + 5);
                    break;
                case 1:
                    this.ghostGraphics.lineBetween(cx, cy - 5, cx, cy + 10);
                    this.ghostGraphics.lineBetween(cx, cy + 10, cx - 5, cy + 5);
                    this.ghostGraphics.lineBetween(cx, cy + 10, cx + 5, cy + 5);
                    break;
                case 2:
                    this.ghostGraphics.lineBetween(cx + 5, cy, cx - 10, cy);
                    this.ghostGraphics.lineBetween(cx - 10, cy, cx - 5, cy - 5);
                    this.ghostGraphics.lineBetween(cx - 10, cy, cx - 5, cy + 5);
                    break;
                case 3:
                    this.ghostGraphics.lineBetween(cx, cy + 5, cx, cy - 10);
                    this.ghostGraphics.lineBetween(cx, cy - 10, cx - 5, cy - 5);
                    this.ghostGraphics.lineBetween(cx, cy - 10, cx + 5, cy - 5);
                    break;
            }

            this.cursorArrow.setVisible(true);
            this.cursorContainer.setAlpha(0.7);
        }
    }

    rotateCursor(): void {
        this.currentRotation = (this.currentRotation + 1) % 4;
        this.cursorArrow.setAngle(CONFIG.DIRECTIONS[this.currentRotation].angle);
    }

    update(time: number, _delta: number): void {
        this.updateCursorPosition();
        this.gridRenderer.draw();
        this.tickSystem.update(time);
        this.uiManager.update(this.itemManager.getItems().length);
        this.cameraController.update();

        if (this.powerGridDirty) {
            this.drawPowerGridOverlay();
            this.powerGridDirty = false;
        }
    }

    drawPowerGridOverlay(): void {
        this.powerGridGraphics.clear();
        if (!this.showPowerGrid || !this.powerManager) return;

        this.powerGridGraphics.fillStyle(0xfde047, 0.15);
        this.powerGridGraphics.lineStyle(1, 0xfde047, 0.5);

        this.powerManager.poweredArea.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            this.powerGridGraphics.fillRect(x, y, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            this.powerGridGraphics.strokeRect(x, y, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
        });
    }

    isBlocked(x: number, y: number, w: number, h: number): boolean {
        for (let dx = 0; dx < w; dx++) {
            for (let dy = 0; dy < h; dy++) {
                if (this.buildingManager.has(`${x + dx * CONFIG.GRID_SIZE},${y + dy * CONFIG.GRID_SIZE}`)) {
                    return true;
                }
            }
        }
        return false;
    }

    updateCursorPosition(): void {
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        this.cursorContainer.setPosition(snappedX, snappedY);

        const key = `${snappedX},${snappedY}`;
        const mode = this.uiManager.getSelectedBuildingType();
        const existingBuilding = this.buildingManager.get(key);

        if (mode !== 'REMOVE') {
            const bConfig = CONFIG.BUILDINGS[mode];
            const w = bConfig?.WIDTH || 1;
            const h = bConfig?.HEIGHT || 1;

            if (this.isBlocked(snappedX, snappedY, w, h)) {
                this.ghostGraphics.clear();
                this.ghostGraphics.fillStyle(0xff0000, 0.5);
                this.ghostGraphics.fillRect(0, 0, CONFIG.GRID_SIZE * w, CONFIG.GRID_SIZE * h);
            } else {
                this.updateCursorGraphics();
            }
        }

        if (existingBuilding) {
            const bConfig = CONFIG.BUILDINGS[existingBuilding.type];
            let content = `Type: ${existingBuilding.type}`;

            if (bConfig.POWER && bConfig.POWER.CONSUMPTION > 0) {
                content += `\nPower: ${existingBuilding.hasPower ? '⚡ OK' : '❌ OUTAGE'}`;
            }
            if (existingBuilding.inputBuffer) {
                content += `\nInput Buffer: ${existingBuilding.inputBuffer.length} / ${existingBuilding.maxBufferSize}`;
            }
            if (existingBuilding.outputBuffer) {
                content += `\nOutput Buffer: ${existingBuilding.outputBuffer.length}`;
            }
            if ((existingBuilding as any).isProcessing !== undefined) {
                content += `\nStatus: ${(existingBuilding as any).isProcessing ? 'Processing' : 'Idle'}`;
            }

            this.uiManager.showTooltip(pointer.x, pointer.y, bConfig.NAME, content);
        } else {
            const resourceType = this.mapManager.getResourceAt(snappedX, snappedY);
            if (resourceType) {
                this.uiManager.showTooltip(pointer.x, pointer.y, "Resource Node", `Type: ${resourceType}`);
            } else {
                this.uiManager.hideTooltip();
            }
        }
    }

    handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (pointer.middleButtonDown()) return;

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const key = `${snappedX},${snappedY}`;
        const mode = this.uiManager.getSelectedBuildingType();

        if (pointer.leftButtonDown()) {
            if (mode === 'REMOVE') {
                if (this.buildingManager.has(key)) this.buildingManager.remove(key);
            } else {
                const bConfig = CONFIG.BUILDINGS[mode];
                const w = bConfig?.WIDTH || 1;
                const h = bConfig?.HEIGHT || 1;
                if (!this.isBlocked(snappedX, snappedY, w, h)) {
                    this.buildingManager.place(snappedX, snappedY, mode, this.currentRotation);
                }
            }
        } else if (pointer.rightButtonDown()) {
            if (this.buildingManager.has(key)) this.buildingManager.remove(key);
        }
    }
}
