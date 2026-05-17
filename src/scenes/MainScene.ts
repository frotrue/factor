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
import EffectsManager from '../managers/EffectsManager';
import SoundManager from '../managers/SoundManager';
import TutorialManager from '../managers/TutorialManager';
import EventBus from '../managers/EventBus';
import { DefenseModelState } from '../types';
import DefenseTower from '../buildings/DefenseTower';
import OverlayController from '../controllers/OverlayController';
import InputController from '../controllers/InputController';

export default class MainScene extends Phaser.Scene {
    buildingManager!: BuildingManager;
    itemManager!: ItemManager;
    mapManager!: MapManager;
    uiManager!: UIManager;
    gridRenderer!: GridRenderer;
    cameraController!: CameraController;
    tickSystem!: TickSystem;
    powerManager!: PowerManager;
    waveManager!: WaveManager;
    saveManager!: SaveManager;
    researchManager!: ResearchManager;
    inventoryManager!: InventoryManager;
    cableManager!: CableManager;
    effectsManager!: EffectsManager;
    soundManager!: SoundManager;
    tutorialManager!: TutorialManager;
    overlayController!: OverlayController;
    inputController!: InputController;
    defenseModelStates: Record<string, DefenseModelState> = {};

    cableState: 'IDLE' | 'CABLE_START' = 'IDLE';
    cableStartKey: string | null = null;
    cableDraftGraphics!: Phaser.GameObjects.Graphics;

    currentRotation: number = 0;
    gameSpeed: number = 1;
    difficultyId: string = 'NORMAL';
    isMobileLayout: boolean = false;
    showPowerGrid: boolean = false;
    powerGridDirty: boolean = false;
    showDefenseRange: boolean = false;
    defenseRangeDirty: boolean = false;

    powerGridGraphics!: Phaser.GameObjects.Graphics;
    defenseRangeGraphics!: Phaser.GameObjects.Graphics;
    cursorContainer!: Phaser.GameObjects.Container;
    ghostGraphics!: Phaser.GameObjects.Graphics;
    cursorArrow!: Phaser.GameObjects.Triangle;
    mobileMediaQuery: MediaQueryList | null = null;
    mobileTouchStart: { x: number; y: number; time: number } | null = null;
    mobileMultiTouchActive: boolean = false;
    mobileLayoutHandler: (() => void) | null = null;
    mobilePointerStartedOverUI: boolean = false;

    constructor() {
        super('MainScene');
    }

    init(data: { difficulty?: string } = {}): void {
        this.difficultyId = CONFIG.DIFFICULTY[data.difficulty || 'NORMAL'] ? data.difficulty! : 'NORMAL';
    }

    create(): void {
        this.input.addPointer(2);
        this.setupMobileLayoutDetection();

        this.mapManager = new MapManager();
        this.initializeDefenseModelStates();
        this.itemManager = new ItemManager(this);
        this.buildingManager = new BuildingManager(this);
        this.powerManager = new PowerManager(this, this.buildingManager);
        this.cableManager = new CableManager(this);
        this.waveManager = new WaveManager(this, this.buildingManager);
        this.waveManager.setDifficulty(this.difficultyId);
        this.tickSystem = new TickSystem(this, this.buildingManager, this.itemManager, this.mapManager, this.powerManager);
        this.gridRenderer = new GridRenderer(this, this.mapManager);
        this.cameraController = new CameraController(this);
        this.soundManager = new SoundManager();
        this.uiManager = new UIManager(this);
        this.saveManager = new SaveManager(this);
        this.researchManager = new ResearchManager(this);
        this.inventoryManager = new InventoryManager(this.buildingManager);
        this.effectsManager = new EffectsManager(this);
        this.overlayController = new OverlayController(this);
        this.inputController = new InputController(this);

        this.mapManager.generateResourcePatches();
        this.buildingManager.place(0, 0, 'CORE', 0);

        // 시작 시 일정량의 실리콘 제공을 위한 창고 설치
        const startStorage = this.buildingManager.place(-64, 0, 'STORAGE', 0);
        if (startStorage) {
            for (let i = 0; i < 30; i++) {
                startStorage.inputBuffer.push('SILICON');
            }
        }

        this.setupCursor();
        this.setupInput();
        this.setupEvents();
        this.gridRenderer.draw(true);

        // Initialize UI buttons now that all managers are ready
        this.uiManager.createBuildingButtons();
        this.tutorialManager = new TutorialManager(this);
    }

    setupEvents(): void {
        EventBus.on('BUILDING_SELECTED', () => {
            this.updateCursorGraphics();
        }, 'MainScene');

        EventBus.on('POWER_UPDATED', () => {
            this.powerGridDirty = true;
        }, 'MainScene');

        EventBus.on('BUILDING_PLACED', ({ building, type }: { key: string; building: any; type: string }) => {
            this.effectsManager.playBuildOnline(building, type);
            this.uiManager.logMessage(`System: ${CONFIG.BUILDINGS[type].NAME} Online.`);
            this.defenseRangeDirty = true;
        }, 'MainScene');

        EventBus.on('BUILDING_REMOVED', ({ key }: { key: string }) => {
            const [x, y] = key.split(',').map(Number);
            this.effectsManager.playBuildingRemoved(x, y);
            this.uiManager.logMessage(`System: Unit disconnected at [${x}, ${y}].`, true);
            this.defenseRangeDirty = true;
        }, 'MainScene');

        EventBus.on('WAVE_STARTED', () => {
            this.effectsManager.playWaveStart();
        }, 'MainScene');

        EventBus.on('ENEMY_KILLED', ({ x, y }: { id: string; type: string; x: number; y: number; rewardSilicon: number }) => {
            this.effectsManager.playEnemyKilled(x, y);
        }, 'MainScene');

        this.events.on('shutdown', () => {
            if (this.mobileMediaQuery && this.mobileLayoutHandler) {
                this.mobileMediaQuery.removeEventListener('change', this.mobileLayoutHandler);
                window.removeEventListener('resize', this.mobileLayoutHandler);
            }
            document.body.classList.remove('mobile-layout');
            [
                'MainScene',
                'CableManager',
                'Core',
                'ItemManager',
                'SaveManager',
                'SoundManager',
                'TutorialManager',
                'UIManager',
                'WaveManager'
            ].forEach(owner => EventBus.offAll(owner));
        });
    }

    initializeDefenseModelStates(): void {
        ['CLASSIFIER', 'FILTER', 'FIREWALL'].forEach(type => {
            this.defenseModelStates[type] = {
                modelConfidence: 35,
                modelVersion: 1,
                inferenceCharge: 0
            };
        });
    }

    getDefenseModelState(type: string): DefenseModelState {
        if (!this.defenseModelStates[type]) {
            this.defenseModelStates[type] = {
                modelConfidence: 35,
                modelVersion: 1,
                inferenceCharge: 0
            };
        }
        return this.defenseModelStates[type];
    }

    trainDefenseModelType(type: string, itemType: string): boolean {
        const state = this.getDefenseModelState(type);
        if (itemType === 'WEIGHT_UPDATE') {
            state.modelConfidence = Phaser.Math.Clamp(state.modelConfidence + 2, 0, 100);
        } else if (itemType === 'TRAINED_MODEL') {
            state.modelConfidence = Phaser.Math.Clamp(state.modelConfidence + 10, 0, 100);
            state.modelVersion++;
        } else if (itemType === 'INFERENCE_UNIT') {
            state.inferenceCharge += 5;
        } else {
            return false;
        }

        this.syncDefenseModelType(type);
        return true;
    }

    syncDefenseModelType(type: string): void {
        const state = this.getDefenseModelState(type);
        this.buildingManager?.forEach(building => {
            if (building instanceof DefenseTower && building.type === type) {
                building.applyModelState(state);
            }
        });
    }

    setupMobileLayoutDetection(): void {
        this.mobileMediaQuery = window.matchMedia('(pointer: coarse), (max-width: 768px), (max-height: 480px)');
        this.mobileLayoutHandler = () => this.updateMobileLayoutState();
        this.mobileMediaQuery.addEventListener('change', this.mobileLayoutHandler);
        window.addEventListener('resize', this.mobileLayoutHandler);
        this.updateMobileLayoutState();
    }

    updateMobileLayoutState(): void {
        const matches = Boolean(this.mobileMediaQuery?.matches || window.innerWidth <= 768 || window.innerHeight <= 480);
        const wasMobile = this.isMobileLayout;
        this.isMobileLayout = matches;
        document.body.classList.toggle('mobile-layout', matches);

        if (this.cameraController) {
            const currentZoom = this.cameras.main.zoom || CONFIG.CAMERA.DEFAULT_ZOOM;
            const targetZoom = matches && !wasMobile ? 1 : currentZoom;
            this.cameras.main.setZoom(Phaser.Math.Clamp(targetZoom, matches ? 0.45 : CONFIG.CAMERA.MIN_ZOOM, CONFIG.CAMERA.MAX_ZOOM));
        }
    }

    setupInput(): void {
        this.inputController.setup();
    }

    isPointerOverDomUI(pointer: Phaser.Input.Pointer): boolean {
        return this.inputController.isPointerOverDomUI(pointer);
    }

    setupCursor(): void {
        this.inputController.setupCursor();
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
        } else if (mode === 'BASIC' || mode === 'FIBER') {
            this.ghostGraphics.lineStyle(2, CONFIG.CABLES[mode].COLOR);
            this.ghostGraphics.strokeRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            this.cursorArrow.setVisible(false);
            this.cursorContainer.setAlpha(1);
        } else {
            const bConfig = CONFIG.BUILDINGS[mode];
            if (!bConfig) return;
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

    rotateCursor(): void {
        this.inputController.rotateCursor();
    }

    toggleDefenseRange(): void {
        this.showDefenseRange = !this.showDefenseRange;
        this.defenseRangeDirty = true;
        this.uiManager.updateMobileControls();
        this.uiManager.logMessage(`System: Defense Range Overlay ${this.showDefenseRange ? 'ON' : 'OFF'}`);
    }

    togglePowerGrid(): void {
        this.showPowerGrid = !this.showPowerGrid;
        this.powerGridDirty = true;
        this.uiManager.updateMobileControls();
        this.uiManager.logMessage(`System: Power Grid Overlay ${this.showPowerGrid ? 'ON' : 'OFF'}`);
    }

    cancelCurrentAction(): void {
        this.inputController.cancelCurrentAction();
    }

    update(time: number, delta: number): void {
        this.updateCursorPosition();
        this.gridRenderer.draw();
        
        this.tickSystem.update(time);
        this.waveManager.update(delta * this.gameSpeed);
        this.saveManager.update(delta);

        this.uiManager.update(this.itemManager.getItems().length);
        this.cameraController.update();

        this.cableManager.markDirtyIfThrottlingChanged();
        this.cableManager.drawCables();
        this.effectsManager.updatePowerWarnings();

        if (this.cableState === 'CABLE_START' && this.cableStartKey) {
            this.cableDraftGraphics.clear();
            const pointer = this.input.activePointer;
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const [startX, startY] = this.cableStartKey.split(',').map(Number);
            const cx1 = startX + CONFIG.GRID_SIZE / 2;
            const cy1 = startY + CONFIG.GRID_SIZE / 2;
            this.cableDraftGraphics.lineStyle(2, 0xffffff, 0.5);
            this.cableDraftGraphics.strokeLineShape(new Phaser.Geom.Line(cx1, cy1, worldPoint.x, worldPoint.y));
        } else {
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

    drawDefenseRangeOverlay(): void {
        this.overlayController.drawDefenseRangeOverlay();
    }

    drawPowerGridOverlay(): void {
        this.overlayController.drawPowerGridOverlay();
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
        this.inputController.updateCursorPosition();
    }

    handlePointerAction(pointer: Phaser.Input.Pointer, button: 'primary' | 'secondary'): void {
        this.inputController.handlePointerAction(pointer, button);
    }

    setGameSpeed(speed: number): void {
        this.gameSpeed = Math.max(1, Math.min(3, speed));
        // P9: tickRate는 TickSystem.update()에서 gameSpeed로 나누므로 여기서는 변경하지 않음
        EventBus.emit('GAME_SPEED_CHANGED', { speed: this.gameSpeed });
    }
}
