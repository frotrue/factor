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
import WaveManager from '../managers/WaveManager';
import SaveManager from '../managers/SaveManager';
import ResearchManager from '../managers/ResearchManager';
import InventoryManager from '../managers/InventoryManager';
import CableManager from '../managers/CableManager';
import EventBus from '../managers/EventBus';
export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.cableState = 'IDLE';
        this.cableStartKey = null;
        this.currentRotation = 0;
        this.gameSpeed = 1;
        this.showPowerGrid = false;
        this.powerGridDirty = false;
        this.showDefenseRange = false;
        this.defenseRangeDirty = false;
    }
    create() {
        this.mapManager = new MapManager();
        this.itemManager = new ItemManager(this);
        this.buildingManager = new BuildingManager(this);
        this.powerManager = new PowerManager(this, this.buildingManager);
        this.waveManager = new WaveManager(this, this.buildingManager);
        this.tickSystem = new TickSystem(this, this.buildingManager, this.itemManager, this.mapManager, this.powerManager);
        this.gridRenderer = new GridRenderer(this, this.mapManager);
        this.cameraController = new CameraController(this);
        this.uiManager = new UIManager(this);
        this.saveManager = new SaveManager(this);
        this.researchManager = new ResearchManager(this);
        this.inventoryManager = new InventoryManager(this.buildingManager);
        this.cableManager = new CableManager(this);
        this.mapManager.generateResourcePatches();
        this.buildingManager.place(0, 0, 'CORE', 0);
        this.setupCursor();
        this.setupInput();
        this.setupEvents();
        this.gridRenderer.draw(true);
        // Initialize UI buttons now that all managers are ready
        this.uiManager.createBuildingButtons();
    }
    setupEvents() {
        EventBus.on('BUILDING_SELECTED', () => {
            this.updateCursorGraphics();
        });
        EventBus.on('POWER_UPDATED', () => {
            this.powerGridDirty = true;
        });
        EventBus.on('BUILDING_PLACED', ({ building, type }) => {
            building.container.setScale(0.5);
            building.container.setAlpha(0);
            this.tweens.add({
                targets: building.container,
                scaleX: 1, scaleY: 1, alpha: 1,
                duration: 200, ease: 'Back.easeOut'
            });
            this.uiManager.logMessage(`System: ${CONFIG.BUILDINGS[type].NAME} Online.`);
            this.defenseRangeDirty = true;
        });
        EventBus.on('BUILDING_REMOVED', ({ key }) => {
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
            this.defenseRangeDirty = true;
        });
        this.events.on('shutdown', () => {
            EventBus.off('BUILDING_SELECTED');
            EventBus.off('BUILDING_PLACED');
            EventBus.off('BUILDING_REMOVED');
            EventBus.off('POWER_UPDATED');
            EventBus.off('ENEMY_KILLED');
            EventBus.off('GAME_OVER');
            EventBus.off('CORE_DAMAGED');
            EventBus.off('WAVE_STARTED');
            EventBus.off('WAVE_UPDATE');
            EventBus.off('WAVE_ENDED');
            EventBus.off('CORE_DATA_RECEIVED');
            EventBus.off('SAVE_REQUESTED');
            EventBus.off('LOAD_REQUESTED');
            EventBus.off('GAME_SPEED_CHANGED');
            EventBus.off('RESEARCH_UNLOCKED');
        });
    }
    setupInput() {
        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.keyboard.on('keydown-R', () => this.rotateCursor());
        this.input.keyboard.on('keydown-F2', () => {
            this.showPowerGrid = !this.showPowerGrid;
            this.powerGridDirty = true;
            this.uiManager.logMessage(`System: Power Grid Overlay ${this.showPowerGrid ? 'ON' : 'OFF'}`);
        });
        this.input.keyboard.on('keydown-F1', () => {
            this.showDefenseRange = !this.showDefenseRange;
            this.defenseRangeDirty = true;
            this.uiManager.logMessage(`System: Defense Range Overlay ${this.showDefenseRange ? 'ON' : 'OFF'}`);
        });
    }
    setupCursor() {
        this.powerGridGraphics = this.add.graphics();
        this.powerGridGraphics.setDepth(10);
        this.defenseRangeGraphics = this.add.graphics();
        this.defenseRangeGraphics.setDepth(11);
        this.cableDraftGraphics = this.add.graphics();
        this.cableDraftGraphics.setDepth(14);
        this.cursorContainer = this.add.container(0, 0);
        this.ghostGraphics = this.add.graphics();
        this.cursorArrow = this.add.triangle(CONFIG.GRID_SIZE / 2, CONFIG.GRID_SIZE / 2, 12, 0, 0, 12, 0, -12, 0xffffff, 1);
        this.cursorArrow.setAngle(CONFIG.DIRECTIONS[this.currentRotation].angle);
        this.cursorContainer.add([this.ghostGraphics, this.cursorArrow]);
        this.cursorContainer.setDepth(100);
        this.cursorContainer.setAlpha(0.6);
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
        }
        else if (mode === 'BASIC' || mode === 'FIBER') {
            this.ghostGraphics.lineStyle(2, CONFIG.CABLES[mode].COLOR);
            this.ghostGraphics.strokeRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            this.cursorArrow.setVisible(false);
            this.cursorContainer.setAlpha(1);
        }
        else {
            const bConfig = CONFIG.BUILDINGS[mode];
            if (!bConfig)
                return;
            const w = bConfig.WIDTH || 1;
            const h = bConfig.HEIGHT || 1;
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
    rotateCursor() {
        this.currentRotation = (this.currentRotation + 1) % 4;
        this.cursorArrow.setAngle(CONFIG.DIRECTIONS[this.currentRotation].angle);
    }
    update(time, delta) {
        this.updateCursorPosition();
        this.gridRenderer.draw();
        this.tickSystem.update(time);
        this.waveManager.update(delta * this.gameSpeed);
        this.saveManager.update(delta);
        this.uiManager.update(this.itemManager.getItems().length);
        this.cameraController.update();
        this.cableManager.drawCables();
        if (this.cableState === 'CABLE_START' && this.cableStartKey) {
            this.cableDraftGraphics.clear();
            const pointer = this.input.activePointer;
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const [startX, startY] = this.cableStartKey.split(',').map(Number);
            const cx1 = startX + CONFIG.GRID_SIZE / 2;
            const cy1 = startY + CONFIG.GRID_SIZE / 2;
            this.cableDraftGraphics.lineStyle(2, 0xffffff, 0.5);
            this.cableDraftGraphics.strokeLineShape(new Phaser.Geom.Line(cx1, cy1, worldPoint.x, worldPoint.y));
        }
        else {
            this.cableDraftGraphics.clear();
        }
        if (this.powerGridDirty) {
            this.drawPowerGridOverlay();
            this.powerGridDirty = false;
        }
        if (this.defenseRangeDirty) {
            this.drawDefenseRangeOverlay();
            this.defenseRangeDirty = false;
        }
    }
    drawDefenseRangeOverlay() {
        this.defenseRangeGraphics.clear();
        if (!this.showDefenseRange)
            return;
        this.defenseRangeGraphics.fillStyle(0xff4444, 0.1);
        this.defenseRangeGraphics.lineStyle(1, 0xff4444, 0.5);
        this.buildingManager.forEach(building => {
            const bConfig = CONFIG.BUILDINGS[building.type];
            if (bConfig && bConfig.DEFENSE && bConfig.DEFENSE.RANGE > 0) {
                const range = bConfig.DEFENSE.RANGE;
                const centerX = building.x + CONFIG.GRID_SIZE / 2;
                const centerY = building.y + CONFIG.GRID_SIZE / 2;
                const radius = range * CONFIG.GRID_SIZE;
                this.defenseRangeGraphics.fillCircle(centerX, centerY, radius);
                this.defenseRangeGraphics.strokeCircle(centerX, centerY, radius);
            }
        });
    }
    drawPowerGridOverlay() {
        this.powerGridGraphics.clear();
        if (!this.showPowerGrid || !this.powerManager)
            return;
        this.powerGridGraphics.fillStyle(0xfde047, 0.15);
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
        const key = `${snappedX},${snappedY}`;
        const mode = this.uiManager.getSelectedBuildingType();
        // Drag to build Conveyors / Fast Links
        if (pointer.leftButtonDown() && (mode === 'CONVEYOR' || mode === 'FAST_LINK')) {
            const bConfig = CONFIG.BUILDINGS[mode];
            const w = bConfig?.WIDTH || 1;
            const h = bConfig?.HEIGHT || 1;
            const isUnlocked = !bConfig.UNLOCK_REQUIRED || this.researchManager.isUnlocked(bConfig.UNLOCK_REQUIRED);
            const isUnlocked = !bConfig.UNLOCK_REQUIRED || this.researchManager.isUnlocked(bConfig.UNLOCK_REQUIRED);
            if (isUnlocked && !this.isBlocked(snappedX, snappedY, w, h)) {
                // this.buildingManager.place(snappedX, snappedY, mode, this.currentRotation);
            }
        }
        const existingBuilding = this.buildingManager.get(key);
        if (mode !== 'REMOVE') {
            if (mode === 'BASIC' || mode === 'FIBER') {
                const cConfig = CONFIG.CABLES[mode];
                const isUnlocked = !cConfig.UNLOCK_REQUIRED || this.researchManager.isUnlocked(cConfig.UNLOCK_REQUIRED);
                if (!isUnlocked) {
                    this.ghostGraphics.clear();
                    this.ghostGraphics.fillStyle(0xff0000, 0.5);
                    this.ghostGraphics.fillRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
                }
                else {
                    this.updateCursorGraphics();
                }
            }
            else {
                const bConfig = CONFIG.BUILDINGS[mode];
                if (bConfig) {
                    const w = bConfig.WIDTH || 1;
                    const h = bConfig.HEIGHT || 1;
                    const isUnlocked = !bConfig.UNLOCK_REQUIRED || this.researchManager.isUnlocked(bConfig.UNLOCK_REQUIRED);
                    if (!isUnlocked || this.isBlocked(snappedX, snappedY, w, h)) {
                        this.ghostGraphics.clear();
                        this.ghostGraphics.fillStyle(0xff0000, 0.5);
                        this.ghostGraphics.fillRect(0, 0, CONFIG.GRID_SIZE * w, CONFIG.GRID_SIZE * h);
                    }
                    else {
                        this.updateCursorGraphics();
                    }
                }
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
            if (existingBuilding.isProcessing !== undefined) {
                content += `\nStatus: ${existingBuilding.isProcessing ? 'Processing' : 'Idle'}`;
            }
            if (existingBuilding.type === 'PROCESSOR') {
                content += `\nRecipe: ${existingBuilding.recipe?.OUTPUT}`;
            }
            if (existingBuilding.type === 'WEIGHT_TRAINER') {
                content += `\nRecipe: ${existingBuilding.recipe?.OUTPUT}`;
            }
            if (existingBuilding.type === 'NEURAL_TRAINER') {
                content += `\nRecipe: ${existingBuilding.recipe?.OUTPUT}`;
                content += `\n[Left Click to Cycle Recipe]`;
            }
            this.uiManager.showTooltip(pointer.x, pointer.y, bConfig.NAME, content);
        }
        else {
            const resourceType = this.mapManager.getResourceAt(snappedX, snappedY);
            if (resourceType) {
                this.uiManager.showTooltip(pointer.x, pointer.y, "Resource Node", `Type: ${resourceType}`);
            }
            else {
                this.uiManager.hideTooltip();
            }
        }
    }
    handlePointerDown(pointer) {
        if (pointer.middleButtonDown())
            return;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const key = `${snappedX},${snappedY}`;
        const mode = this.uiManager.getSelectedBuildingType();
        if (pointer.leftButtonDown()) {
            if (mode === 'REMOVE') {
                if (this.buildingManager.has(key))
                    this.buildingManager.remove(key);
            }
            else if (mode === 'BASIC' || mode === 'FIBER') {
                const cConfig = CONFIG.CABLES[mode];
                const isUnlocked = !cConfig.UNLOCK_REQUIRED || this.researchManager.isUnlocked(cConfig.UNLOCK_REQUIRED);
                if (isUnlocked && this.buildingManager.has(key)) {
                    if (this.cableState === 'IDLE') {
                        this.cableState = 'CABLE_START';
                        this.cableStartKey = key;
                    }
                    else if (this.cableState === 'CABLE_START') {
                        if (this.cableStartKey !== key) {
                            if (this.cableManager.connect(this.cableStartKey, key, mode)) {
                                this.uiManager.logMessage(`System: Cable connected.`);
                            }
                        }
                        this.cableState = 'IDLE';
                        this.cableStartKey = null;
                    }
                }
                else if (this.cableState === 'CABLE_START') {
                    // Clicking on empty space cancels cable drawing
                    this.cableState = 'IDLE';
                    this.cableStartKey = null;
                }
            }
            else {
                // Cancel cable state if changing mode
                this.cableState = 'IDLE';
                this.cableStartKey = null;
                const existingBuilding = this.buildingManager.get(key);
                if (existingBuilding && existingBuilding.type === 'NEURAL_TRAINER') {
                    existingBuilding.cycleRecipe();
                    return;
                }
                if (mode === 'CONVEYOR' || mode === 'FAST_LINK')
                    return;
                const bConfig = CONFIG.BUILDINGS[mode];
                if (!bConfig)
                    return;
                const w = bConfig.WIDTH || 1;
                const h = bConfig.HEIGHT || 1;
                const isUnlocked = !bConfig.UNLOCK_REQUIRED || this.researchManager.isUnlocked(bConfig.UNLOCK_REQUIRED);
                if (isUnlocked && !this.isBlocked(snappedX, snappedY, w, h)) {
                    this.buildingManager.place(snappedX, snappedY, mode, this.currentRotation);
                }
            }
        }
        else if (pointer.rightButtonDown()) {
            this.cableState = 'IDLE';
            this.cableStartKey = null;
            if (this.buildingManager.has(key))
                this.buildingManager.remove(key);
        }
    }
    setGameSpeed(speed) {
        this.gameSpeed = Math.max(1, Math.min(3, speed));
        this.tickSystem.tickRate = (CONFIG.TICK_RATE / 2) / this.gameSpeed;
        EventBus.emit('GAME_SPEED_CHANGED', { speed: this.gameSpeed });
    }
}
//# sourceMappingURL=MainScene.js.map