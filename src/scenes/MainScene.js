import Phaser from 'phaser';
import { CONFIG } from '../config.js';

// Managers
import BuildingManager from '../managers/BuildingManager.js';
import ItemManager from '../managers/ItemManager.js';
import MapManager from '../managers/MapManager.js';
import UIManager from '../managers/UIManager.js';
import GridRenderer from '../managers/GridRenderer.js';
import CameraController from '../managers/CameraController.js';
import TickSystem from '../managers/TickSystem.js';
import PowerManager from '../managers/PowerManager.js';
import EventBus from '../managers/EventBus.js';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        
        // Managers & Systems
        this.buildingManager = null;
        this.itemManager = null;
        this.mapManager = null;
        this.uiManager = null;
        this.gridRenderer = null;
        this.cameraController = null;
        this.tickSystem = null;
        this.powerManager = null;

        // State
        this.currentRotation = 0;
        this.showPowerGrid = false;
        this.powerGridDirty = false;
    }

    create() {
        // 1. Initialize Core Managers
        this.mapManager = new MapManager();
        this.itemManager = new ItemManager(this);
        this.buildingManager = new BuildingManager(this);
        this.powerManager = new PowerManager(this, this.buildingManager);
        
        // 2. Initialize Logic Systems
        this.tickSystem = new TickSystem(this, this.buildingManager, this.itemManager, this.mapManager, this.powerManager);
        
        // 3. Initialize Visual/UI Managers
        this.gridRenderer = new GridRenderer(this, this.mapManager);
        this.cameraController = new CameraController(this);
        this.uiManager = new UIManager(this);

        // 4. Setup
        this.mapManager.generateResourcePatches();
        
        // 메인 서버 초기 배치 (중앙)
        this.buildingManager.place(0, 0, 'CORE', 0);

        this.setupCursor();
        this.setupInput();
        this.setupEvents();

        // Initial draw
        this.gridRenderer.draw(true);
    }

    setupEvents() {
        EventBus.on('BUILDING_SELECTED', ({ type }) => {
            this.updateCursorGraphics();
        });

        EventBus.on('POWER_UPDATED', () => {
            this.powerGridDirty = true;
        });

        EventBus.on('BUILDING_PLACED', ({ key, building, type }) => {
            // 건설 팝업 애니메이션
            building.container.setScale(0.5);
            building.container.setAlpha(0);
            this.tweens.add({
                targets: building.container,
                scaleX: 1,
                scaleY: 1,
                alpha: 1,
                duration: 200,
                ease: 'Back.easeOut'
            });
            this.uiManager.logMessage(`System: ${CONFIG.BUILDINGS[type].NAME} Online.`);
        });

        EventBus.on('BUILDING_REMOVED', ({ key }) => {
            // 삭제 시 파티클 효과 (간단하게 구현)
            const [x, y] = key.split(',').map(Number);
            const effect = this.add.rectangle(x + CONFIG.GRID_SIZE/2, y + CONFIG.GRID_SIZE/2, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE, 0xff4444);
            effect.setDepth(15);
            this.tweens.add({
                targets: effect,
                scaleX: 1.5,
                scaleY: 1.5,
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => effect.destroy()
            });
            this.uiManager.logMessage(`System: Unit disconnected at [${x}, ${y}].`, true);
        });

        // 씬 재시작 시 이벤트 리스너 중복 방지 (Fix 3)
        this.events.on('shutdown', () => {
            EventBus.off('BUILDING_SELECTED');
            EventBus.off('BUILDING_PLACED');
            EventBus.off('BUILDING_REMOVED');
        });
    }

    setupInput() {
        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', this.handlePointerDown, this);
        
        this.input.keyboard.on('keydown-R', () => {
            this.rotateCursor();
        });

        this.input.keyboard.on('keydown-F2', () => {
            this.showPowerGrid = !this.showPowerGrid;
            this.powerGridDirty = true;
            this.uiManager.logMessage(`System: Power Grid Overlay ${this.showPowerGrid ? 'ON' : 'OFF'}`);
        });
    }

    setupCursor() {
        this.powerGridGraphics = this.add.graphics();
        this.powerGridGraphics.setDepth(10); // 건물(보통 깊이 없음, 기본 0)보다 위, UI보다는 아래

        this.cursorContainer = this.add.container(0, 0);
        
        this.ghostGraphics = this.add.graphics();
        this.cursorArrow = this.add.triangle(
            CONFIG.GRID_SIZE / 2, CONFIG.GRID_SIZE / 2,
            12, 0, 0, 12, 0, -12,
            0xffffff, 1
        );
        this.cursorArrow.setAngle(CONFIG.DIRECTIONS[this.currentRotation].angle);
        
        this.cursorContainer.add([this.ghostGraphics, this.cursorArrow]);
        this.cursorContainer.setDepth(100);
        this.cursorContainer.setAlpha(0.6); // 고스트 반투명도

        this.updateCursorGraphics();
    }

    updateCursorGraphics() {
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

            // 방향 표시 화살표 (컨베이어 등)
            const cx = (CONFIG.GRID_SIZE * w) / 2;
            const cy = (CONFIG.GRID_SIZE * h) / 2;
            this.ghostGraphics.lineStyle(2, 0xffffff);
            
            switch(this.currentRotation) {
                case 0: // Right
                    this.ghostGraphics.lineBetween(cx - 5, cy, cx + 10, cy);
                    this.ghostGraphics.lineBetween(cx + 10, cy, cx + 5, cy - 5);
                    this.ghostGraphics.lineBetween(cx + 10, cy, cx + 5, cy + 5);
                    break;
                case 1: // Down
                    this.ghostGraphics.lineBetween(cx, cy - 5, cx, cy + 10);
                    this.ghostGraphics.lineBetween(cx, cy + 10, cx - 5, cy + 5);
                    this.ghostGraphics.lineBetween(cx, cy + 10, cx + 5, cy + 5);
                    break;
                case 2: // Left
                    this.ghostGraphics.lineBetween(cx + 5, cy, cx - 10, cy);
                    this.ghostGraphics.lineBetween(cx - 10, cy, cx - 5, cy - 5);
                    this.ghostGraphics.lineBetween(cx - 10, cy, cx - 5, cy + 5);
                    break;
                case 3: // Up
                    this.ghostGraphics.lineBetween(cx, cy + 5, cx, cy - 10);
                    this.ghostGraphics.lineBetween(cx, cy - 10, cx - 5, cy - 5);
                    this.ghostGraphics.lineBetween(cx, cy - 10, cx + 5, cy - 5);
                    break;
            }
            
            this.cursorArrow.setVisible(true);
            this.cursorContainer.setAlpha(0.7);
        }
    }

    rotateCursor() {
        this.currentRotation = (this.currentRotation + 1) % 4;
        this.cursorArrow.setAngle(CONFIG.DIRECTIONS[this.currentRotation].angle);
    }

    update(time, delta) {
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

    drawPowerGridOverlay() {
        this.powerGridGraphics.clear();
        if (!this.showPowerGrid || !this.powerManager) return;

        this.powerGridGraphics.fillStyle(0xfde047, 0.15); // 노란색 반투명
        this.powerGridGraphics.lineStyle(1, 0xfde047, 0.5);

        this.powerManager.poweredArea.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            this.powerGridGraphics.fillRect(x, y, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            this.powerGridGraphics.strokeRect(x, y, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
        });
    }

    isBlocked(x, y, w, h) {
        for (let dx = 0; dx < w; dx++) {
            for (let dy = 0; dy < h; dy++) {
                if (this.buildingManager.has(`${x + dx * CONFIG.GRID_SIZE},${y + dy * CONFIG.GRID_SIZE}`)) {
                    return true;
                }
            }
        }
        return false;
    }

    updateCursorPosition() {
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        this.cursorContainer.setPosition(snappedX, snappedY);

        // 배치가 불가능한 지역이면 붉은색 필터 (간단 구현)
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
                this.updateCursorGraphics(); // 정상 상태로 복원
            }
        }

        // Phase C: Hover Tooltip
        if (existingBuilding) {
            const bConfig = CONFIG.BUILDINGS[existingBuilding.type];
            let content = `Type: ${existingBuilding.type}`;
            
            // 전력 상태 표시
            if (bConfig.POWER && bConfig.POWER.CONSUMPTION > 0) {
                content += `\nPower: ${existingBuilding.hasPower ? '⚡ OK' : '❌ OUTAGE'}`;
            }

            if (existingBuilding.inputBuffer) {
                content += `\nInput Buffer: ${existingBuilding.inputBuffer.length} / ${existingBuilding.maxBufferSize}`;
            }
            if (existingBuilding.outputBuffer) {
                content += `\nOutput Buffer: ${existingBuilding.outputBuffer.length}`;
            }
            if (existingBuilding.isProcessing !== undefined) {
                content += `\nStatus: ${existingBuilding.isProcessing ? 'Processing' : 'Idle'}`;
            }

            this.uiManager.showTooltip(pointer.x, pointer.y, bConfig.NAME, content);
        } else {
            // Check for resource patch if no building
            const resourceType = this.mapManager.getResourceAt(snappedX, snappedY);
            if (resourceType) {
                this.uiManager.showTooltip(pointer.x, pointer.y, "Resource Node", `Type: ${resourceType}`);
            } else {
                this.uiManager.hideTooltip();
            }
        }
    }

    handlePointerDown(pointer) {
        if (pointer.middleButtonDown()) return;

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const key = `${snappedX},${snappedY}`;

        const mode = this.uiManager.getSelectedBuildingType();

        if (pointer.leftButtonDown()) {
            if (mode === 'REMOVE') {
                if (this.buildingManager.has(key)) {
                    this.buildingManager.remove(key);
                }
            } else {
                const bConfig = CONFIG.BUILDINGS[mode];
                const w = bConfig?.WIDTH || 1;
                const h = bConfig?.HEIGHT || 1;

                if (!this.isBlocked(snappedX, snappedY, w, h)) {
                    this.buildingManager.place(snappedX, snappedY, mode, this.currentRotation);
                }
            }
        } else if (pointer.rightButtonDown()) {
            if (this.buildingManager.has(key)) {
                this.buildingManager.remove(key);
            }
        }
    }
}
