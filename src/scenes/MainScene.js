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

        // State
        this.currentRotation = 0;
    }

    create() {
        // 1. Initialize Core Managers
        this.mapManager = new MapManager();
        this.itemManager = new ItemManager(this);
        this.buildingManager = new BuildingManager(this);
        
        // 2. Initialize Logic Systems
        this.tickSystem = new TickSystem(this, this.buildingManager, this.itemManager, this.mapManager);
        
        // 3. Initialize Visual/UI Managers
        this.gridRenderer = new GridRenderer(this, this.mapManager);
        this.cameraController = new CameraController(this);
        this.uiManager = new UIManager(this);

        // 4. Setup
        this.mapManager.generateResourcePatches();
        this.setupCursor();
        this.setupInput();
        this.setupEvents();

        // Initial draw
        this.gridRenderer.draw(true);
    }

    setupEvents() {
        EventBus.on('BUILDING_SELECTED', ({ type }) => {
            // Update local state if needed, though UIManager handles it
        });
    }

    setupInput() {
        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', this.handlePointerDown, this);
        
        this.input.keyboard.on('keydown-R', () => {
            this.rotateCursor();
        });
    }

    setupCursor() {
        this.cursorContainer = this.add.container(0, 0);
        const box = this.add.graphics();
        box.lineStyle(2, 0xffff00, 0.8);
        box.strokeRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
        
        this.cursorArrow = this.add.triangle(
            CONFIG.GRID_SIZE / 2, CONFIG.GRID_SIZE / 2,
            10, 0, 0, 10, 0, -10,
            0xffff00, 0.8
        );
        this.cursorArrow.setAngle(CONFIG.DIRECTIONS[this.currentRotation].angle);
        
        this.cursorContainer.add([box, this.cursorArrow]);
        this.cursorContainer.setDepth(100);
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
    }

    updateCursorPosition() {
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        this.cursorContainer.setPosition(snappedX, snappedY);
    }

    handlePointerDown(pointer) {
        if (pointer.middleButtonDown()) return;

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const key = `${snappedX},${snappedY}`;

        if (pointer.leftButtonDown()) {
            if (!this.buildingManager.has(key)) {
                this.buildingManager.place(snappedX, snappedY, this.uiManager.getSelectedBuildingType(), this.currentRotation);
            }
        } else if (pointer.rightButtonDown()) {
            if (this.buildingManager.has(key)) {
                this.buildingManager.remove(key);
            }
        }
    }
}
