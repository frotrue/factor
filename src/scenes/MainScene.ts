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
        });

        EventBus.on('POWER_UPDATED', () => {
            this.powerGridDirty = true;
        });

        EventBus.on('BUILDING_PLACED', ({ building, type }: { key: string; building: any; type: string }) => {
            this.effectsManager.playBuildOnline(building, type);
            this.uiManager.logMessage(`System: ${CONFIG.BUILDINGS[type].NAME} Online.`);
            this.defenseRangeDirty = true;
        });

        EventBus.on('BUILDING_REMOVED', ({ key }: { key: string }) => {
            const [x, y] = key.split(',').map(Number);
            this.effectsManager.playBuildingRemoved(x, y);
            this.uiManager.logMessage(`System: Unit disconnected at [${x}, ${y}].`, true);
            this.defenseRangeDirty = true;
        });

        EventBus.on('WAVE_STARTED', () => {
            this.effectsManager.playWaveStart();
        });

        EventBus.on('ENEMY_KILLED', ({ x, y }: { id: string; type: string; x: number; y: number; rewardSilicon: number }) => {
            this.effectsManager.playEnemyKilled(x, y);
        });

        this.events.on('shutdown', () => {
            if (this.mobileMediaQuery && this.mobileLayoutHandler) {
                this.mobileMediaQuery.removeEventListener('change', this.mobileLayoutHandler);
                window.removeEventListener('resize', this.mobileLayoutHandler);
            }
            document.body.classList.remove('mobile-layout');
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
            EventBus.off('RESEARCH_OPENED');
            EventBus.off('CABLE_CONNECTED');
            EventBus.off('TUTORIAL_RESET');
            EventBus.off('AUDIO_SETTINGS_CHANGED');
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
        this.input.mouse!.disableContextMenu();
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isMobileLayout && pointer.leftButtonDown()) {
                if (this.input.pointer2?.isDown) {
                    this.mobileMultiTouchActive = true;
                }
                this.mobileTouchStart = { x: pointer.x, y: pointer.y, time: this.time.now };
                return;
            }
            this.handlePointerAction(pointer, pointer.rightButtonDown() ? 'secondary' : 'primary');
        });
        this.input.on('pointermove', () => {
            if (this.isMobileLayout && this.input.pointer2?.isDown) {
                this.mobileMultiTouchActive = true;
            }
        });
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (!this.isMobileLayout || !this.mobileTouchStart) return;

            const moved = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.mobileTouchStart.x, this.mobileTouchStart.y);
            const duration = this.time.now - this.mobileTouchStart.time;
            this.mobileTouchStart = null;

            if (this.mobileMultiTouchActive || this.input.pointer2?.isDown) {
                if (!this.input.pointer1?.isDown && !this.input.pointer2?.isDown) {
                    this.mobileMultiTouchActive = false;
                }
                return;
            }

            if (moved <= 8 && duration <= 250) {
                this.handlePointerAction(pointer, 'primary');
            } else if (moved <= 10 && duration >= 500) {
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
                const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
                if (!this.buildingManager.get(`${snappedX},${snappedY}`)) {
                    this.cancelCurrentAction();
                }
            }
        });
        this.input.keyboard!.on('keydown-R', () => this.rotateCursor());
        this.input.keyboard!.on('keydown-F2', () => this.togglePowerGrid());
        this.input.keyboard!.on('keydown-F1', () => this.toggleDefenseRange());
    }

    setupCursor(): void {
        this.powerGridGraphics = this.add.graphics();
        this.powerGridGraphics.setDepth(10);

        this.defenseRangeGraphics = this.add.graphics();
        this.defenseRangeGraphics.setDepth(11);

        this.cableDraftGraphics = this.add.graphics();
        this.cableDraftGraphics.setDepth(14);

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
        this.currentRotation = (this.currentRotation + 1) % 4;
        this.cursorArrow.setAngle(CONFIG.DIRECTIONS[this.currentRotation].angle);
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
        const wasCablePending = this.cableState === 'CABLE_START';
        this.cableState = 'IDLE';
        this.cableStartKey = null;
        this.cableDraftGraphics?.clear();
        if (wasCablePending) {
            this.uiManager.logMessage('System: Cable connection cancelled.');
        }
        this.uiManager.setMobileActionStatus(null);
        this.uiManager.cancelMobileAction();
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
        this.defenseRangeGraphics.clear();
        if (!this.showDefenseRange) return;

        this.defenseRangeGraphics.fillStyle(0xff4444, 0.1);
        this.defenseRangeGraphics.lineStyle(1, 0xff4444, 0.5);

        this.buildingManager.forEach(building => {
            const bConfig = CONFIG.BUILDINGS[building.type];
            if (bConfig && bConfig.DEFENSE && bConfig.DEFENSE.RANGE > 0) {
                const range = bConfig.DEFENSE.RANGE + this.researchManager.getEffectValue('TOWER_RANGE_BONUS', 0);
                const centerX = building.x + CONFIG.GRID_SIZE / 2;
                const centerY = building.y + CONFIG.GRID_SIZE / 2;
                const radius = range * CONFIG.GRID_SIZE;
                this.defenseRangeGraphics.fillCircle(centerX, centerY, radius);
                this.defenseRangeGraphics.strokeCircle(centerX, centerY, radius);
            }
        });
    }

    drawPowerGridOverlay(): void {
        this.powerGridGraphics.clear();
        if (!this.showPowerGrid || !this.powerManager) return;

        const networks = this.powerManager.networks || [];
        if (networks.length > 0) {
            networks.forEach(network => {
                const color = network.isBlackout ? 0xef4444 : network.color;
                this.powerGridGraphics.fillStyle(color, network.isBlackout ? 0.2 : 0.14);
                this.powerGridGraphics.lineStyle(1, color, network.isBlackout ? 0.65 : 0.45);

                network.tiles.forEach(key => {
                    const [x, y] = key.split(',').map(Number);
                    this.powerGridGraphics.fillRect(x, y, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
                    this.powerGridGraphics.strokeRect(x, y, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
                });
            });
            return;
        }

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

        if (!this.isMobileLayout && pointer.leftButtonDown() && (mode === 'CONVEYOR' || mode === 'FAST_LINK')) {
            const bConfig = CONFIG.BUILDINGS[mode];
            const w = bConfig?.WIDTH || 1;
            const h = bConfig?.HEIGHT || 1;
            const isUnlocked = !bConfig.UNLOCK_REQUIRED || this.researchManager.isUnlocked(bConfig.UNLOCK_REQUIRED);

            if (isUnlocked && !this.isBlocked(snappedX, snappedY, w, h)) {
                this.buildingManager.place(snappedX, snappedY, mode, this.currentRotation);
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
                } else {
                    this.updateCursorGraphics();
                }
            } else {
                const bConfig = CONFIG.BUILDINGS[mode];
                if (bConfig) {
                    const w = bConfig.WIDTH || 1;
                    const h = bConfig.HEIGHT || 1;
                    
                    const isUnlocked = !bConfig.UNLOCK_REQUIRED || this.researchManager.isUnlocked(bConfig.UNLOCK_REQUIRED);

                    if (!isUnlocked || this.isBlocked(snappedX, snappedY, w, h)) {
                        this.ghostGraphics.clear();
                        this.ghostGraphics.fillStyle(0xff0000, 0.5);
                        this.ghostGraphics.fillRect(0, 0, CONFIG.GRID_SIZE * w, CONFIG.GRID_SIZE * h);
                    } else {
                        this.updateCursorGraphics();
                    }
                }
            }
        }

        if (existingBuilding) {
            const bConfig = CONFIG.BUILDINGS[existingBuilding.type];
            let content = `Type: ${existingBuilding.type}`;

            if (bConfig.POWER) {
                if (bConfig.POWER.CONSUMPTION > 0) {
                    content += `\nPower: ${existingBuilding.hasPower ? 'OK' : 'OUTAGE'}`;
                }
                const network = this.powerManager.getNetworkForBuilding(`${existingBuilding.x},${existingBuilding.y}`);
                if (network) {
                    content += `\nPower Network: #${network.id}`;
                    content += `\nNetwork Power: ${network.production} / ${network.consumption} W`;
                } else if (bConfig.POWER.CONSUMPTION > 0 || bConfig.POWER.PRODUCTION > 0 || (bConfig.POWER.RANGE || 0) > 0) {
                    content += `\nPower Network: None`;
                }
            }
            if (existingBuilding.inputBuffer) {
                content += `\nInput Buffer: ${existingBuilding.inputBuffer.length} / ${existingBuilding.maxBufferSize}`;
            }
            if (existingBuilding.outputBuffer) {
                content += `\nOutput Buffer: ${existingBuilding.outputBuffer.length} / ${existingBuilding.maxBufferSize}`;
            }
            if ((existingBuilding as any).isProcessing !== undefined) {
                content += `\nStatus: ${(existingBuilding as any).isProcessing ? 'Processing' : 'Idle'}`;
            }
            if (existingBuilding.type === 'PROCESSOR') {
                content += `\nRecipe: ${(existingBuilding as any).recipe?.OUTPUT}`;
            }
            if (existingBuilding.type === 'WEIGHT_TRAINER') {
                content += `\nRecipe: ${(existingBuilding as any).recipe?.OUTPUT}`;
            }
            if (existingBuilding.type === 'NEURAL_TRAINER') {
                content += `\nRecipe: ${(existingBuilding as any).recipe?.OUTPUT}`;
                content += `\n[Left Click to Cycle Recipe]`;
            }
            if (bConfig.DEFENSE) {
                const damageMultiplier = this.researchManager.getEffectValue('TOWER_DAMAGE_MULTIPLIER', 1);
                const rangeBonus = this.researchManager.getEffectValue('TOWER_RANGE_BONUS', 0);
                const fireRateMultiplier = this.researchManager.getEffectValue('TOWER_FIRE_RATE_MULTIPLIER', 1);
                const effectiveDamage = bConfig.DEFENSE.DAMAGE * damageMultiplier;
                const effectiveRange = bConfig.DEFENSE.RANGE + rangeBonus;
                const effectiveFireRate = Math.max(1, Math.round(bConfig.DEFENSE.FIRE_RATE * fireRateMultiplier));
                content += `\nDamage: ${effectiveDamage.toFixed(1)}`;
                content += `\nRange: ${effectiveRange} tiles`;
                content += `\nFire Rate: ${effectiveFireRate} ticks`;
                content += `\nAmmo: ${bConfig.DEFENSE.AMMO_TYPE || 'None'} x${bConfig.DEFENSE.AMMO_CONSUMPTION}`;
                content += `\nBuffer: ${existingBuilding.inputBuffer.length} / ${existingBuilding.maxBufferSize}`;
            }

            this.uiManager.showTooltip(pointer.x, pointer.y, bConfig.NAME, content);
        } else {
            const resourceType = this.mapManager.getResourceAt(snappedX, snappedY);
            if (resourceType) {
                const resourceName = CONFIG.ITEMS[resourceType]?.NAME || resourceType;
                this.uiManager.showTooltip(pointer.x, pointer.y, resourceName, `Type: ${resourceType}`);
            } else {
                this.uiManager.hideTooltip();
            }
        }
    }

    handlePointerAction(pointer: Phaser.Input.Pointer, button: 'primary' | 'secondary'): void {
        if (pointer.middleButtonDown()) return;

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const key = `${snappedX},${snappedY}`;
        // P1: 2x2 건물의 원점 키로 정규화
        const normalizedKey = this.cableManager.normalizeKey(key, this.buildingManager);
        const mode = this.uiManager.getSelectedBuildingType();

        if (button === 'primary') {
            if (mode === 'REMOVE') {
                if (this.buildingManager.has(key)) {
                    // 케이블이 있으면 먼저 케이블 제거, 없으면 건물 제거
                    const cables = this.cableManager.getCablesForBuilding(normalizedKey);
                    if (cables.length > 0) {
                        cables.forEach(c => this.cableManager.disconnect(c.id));
                        this.uiManager.logMessage(`System: ${cables.length} cable(s) disconnected.`);
                    } else {
                        this.buildingManager.remove(key);
                    }
                }
            } else if (mode === 'BASIC' || mode === 'FIBER') {
                const cConfig = CONFIG.CABLES[mode];
                const isUnlocked = !cConfig.UNLOCK_REQUIRED || this.researchManager.isUnlocked(cConfig.UNLOCK_REQUIRED);
                
                if (isUnlocked && this.buildingManager.has(key)) {
                    if (this.cableState === 'IDLE') {
                        this.cableState = 'CABLE_START';
                        this.cableStartKey = normalizedKey;
                        this.uiManager.setMobileActionStatus('Cable: select endpoint');
                        this.uiManager.logMessage('System: Cable start selected. Choose an endpoint.');
                    } else if (this.cableState === 'CABLE_START') {
                        if (this.cableStartKey === normalizedKey) {
                            this.uiManager.logMessage('System: Select a different building for the cable endpoint.', true);
                            return;
                        }
                        if (this.cableStartKey !== normalizedKey) {
                            // P3: 케이블 비용 차감
                            const costPerTile = cConfig.COST_PER_TILE || 0;
                            if (costPerTile > 0) {
                                const canAfford = this.inventoryManager.canAfford([{ resource: 'SILICON', amount: costPerTile }]);
                                if (!canAfford) {
                                    this.cableState = 'IDLE';
                                    this.cableStartKey = null;
                                    this.uiManager.setMobileActionStatus(null);
                                    this.uiManager.logMessage(`System: Not enough Silicon for cable. Need: ${costPerTile}`, true);
                                    return;
                                }
                            }
                            if (this.cableManager.connect(this.cableStartKey!, normalizedKey, mode)) {
                                if (costPerTile > 0) {
                                    this.inventoryManager.spend([{ resource: 'SILICON', amount: costPerTile }]);
                                }
                                this.uiManager.logMessage(`System: Cable connected.`);
                            } else {
                                this.uiManager.logMessage(`System: Cable connection already exists.`, true);
                            }
                        }
                        this.cableState = 'IDLE';
                        this.cableStartKey = null;
                        this.uiManager.setMobileActionStatus(null);
                    }
                } else if (this.cableState === 'CABLE_START') {
                    this.cableState = 'IDLE';
                    this.cableStartKey = null;
                    this.uiManager.setMobileActionStatus(null);
                    this.uiManager.logMessage('System: Cable cancelled. Endpoint must be a building.', true);
                } else if (!isUnlocked) {
                    this.uiManager.logMessage(`System: ${cConfig.NAME} is not unlocked.`, true);
                } else {
                    this.uiManager.logMessage('System: Select a building to start the cable.', true);
                }
            } else {
                this.cableState = 'IDLE';
                this.cableStartKey = null;
                this.uiManager.setMobileActionStatus(null);

                const existingBuilding = this.buildingManager.get(key);
                if (existingBuilding && existingBuilding.type === 'NEURAL_TRAINER') {
                    (existingBuilding as any).cycleRecipe();
                    return;
                }

                const bConfig = CONFIG.BUILDINGS[mode];
                if (!bConfig) return;
                const w = bConfig.WIDTH || 1;
                const h = bConfig.HEIGHT || 1;
                
                const isUnlocked = !bConfig.UNLOCK_REQUIRED || this.researchManager.isUnlocked(bConfig.UNLOCK_REQUIRED);
                
                if (isUnlocked && !this.isBlocked(snappedX, snappedY, w, h)) {
                    this.buildingManager.place(snappedX, snappedY, mode, this.currentRotation);
                }
            }
        } else if (button === 'secondary') {
            this.cableState = 'IDLE';
            this.cableStartKey = null;
            this.uiManager.setMobileActionStatus(null);

            // P7: 케이블 모드에서 우클릭 시 해당 건물의 케이블 삭제
            if ((mode === 'BASIC' || mode === 'FIBER') && this.buildingManager.has(key)) {
                const cables = this.cableManager.getCablesForBuilding(normalizedKey);
                if (cables.length > 0) {
                    cables.forEach(c => this.cableManager.disconnect(c.id));
                    this.uiManager.logMessage(`System: ${cables.length} cable(s) disconnected.`);
                }
            } else if (this.buildingManager.has(key)) {
                this.buildingManager.remove(key);
            }
        }
    }

    setGameSpeed(speed: number): void {
        this.gameSpeed = Math.max(1, Math.min(3, speed));
        // P9: tickRate는 TickSystem.update()에서 gameSpeed로 나누므로 여기서는 변경하지 않음
        EventBus.emit('GAME_SPEED_CHANGED', { speed: this.gameSpeed });
    }
}
