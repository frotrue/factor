import Phaser from 'phaser';
import { CONFIG, CORE_KEY, CORE_PIXEL_X, CORE_PIXEL_Y } from '../config';
import { getBuildingName, t } from '../i18n';
import BaseBuilding from '../buildings/BaseBuilding';

import BuildingManager from '../managers/BuildingManager';
import ItemManager from '../managers/ItemManager';
import MapManager from '../managers/MapManager';
import UIManager from '../ui/UIManager';
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
import TrainingPlannerManager from '../managers/TrainingPlannerManager';
import PerformanceStats from '../managers/PerformanceStats';
import EventBus from '../managers/EventBus';
import { DefenseModelState, GameMode } from '../types';
import DefenseTower from '../buildings/DefenseTower';
import Core from '../buildings/Core';
import OverlayController from '../controllers/OverlayController';
import InputController from '../controllers/InputController';
import { createWaveResultSummary } from '../utils/waveResultSummary';
import { getCategoryColor, VISUAL_THEME } from '../visuals/visualTheme';
import {
    applyCompletedTraining,
    createDefaultDefenseModelState,
    getNextTrainingRequirement,
    getTrainingDataValue,
    isGpuUnlocked,
    normalizeDefenseModelState
} from '../utils/modelTrainingProgress';
import {
    clearMobileLayoutClass,
    createMobileLayoutMediaQuery,
    isMobileLayoutMatched,
    setMobileLayoutClass
} from '../ui/domEnvironment';

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
    tutorialManager?: TutorialManager;
    trainingPlanner!: TrainingPlannerManager;
    performanceStats!: PerformanceStats;
    mode: GameMode = 'campaign';
    overlayController!: OverlayController;
    inputController!: InputController;
    defenseModelStates: Record<string, DefenseModelState> = {};

    cableState: 'IDLE' | 'CABLE_START' = 'IDLE';
    cableStartKey: string | null = null;
    cableDraftGraphics!: Phaser.GameObjects.Graphics;
    private _cableDraftLine = new Phaser.Geom.Line();

    currentRotation: number = 0;
    selectedBuildingType: string = 'DATA_DOWNLOADER';
    mobileActionStatus: string | null = null;
    gameSpeed: number = 1;
    difficultyId: string = 'NORMAL';
    isMobileLayout: boolean = false;
    showPowerGrid: boolean = false;
    powerGridDirty: boolean = false;
    showDefenseRange: boolean = false;
    defenseRangeDirty: boolean = false;
    bloomEnabled: boolean = true;
    private _powerWarningDirty: boolean = true;
    private _powerWarningFrameCount: number = 0;

    powerGridGraphics!: Phaser.GameObjects.Graphics;
    defenseRangeGraphics!: Phaser.GameObjects.Graphics;
    cursorContainer!: Phaser.GameObjects.Container;
    ghostGraphics!: Phaser.GameObjects.Graphics;
    mobileMediaQuery: MediaQueryList | null = null;
    mobileTouchStart: { x: number; y: number; time: number } | null = null;
    mobileMultiTouchActive: boolean = false;
    mobileLayoutHandler: (() => void) | null = null;
    mobilePointerStartedOverUI: boolean = false;
    currentWaveStats: {
        wave: number;
        enemiesDestroyed: number;
        coreHpBefore: number;
        dataBefore: number;
        buildingsDamaged: Set<string>;
        buildingsDestroyed: Set<string>;
    } | null = null;
    private loadSaveOnStart: boolean = false;

    constructor() {
        super('MainScene');
    }

    init(data: { difficulty?: string; mode?: GameMode; loadSave?: boolean } = {}): void {
        this.difficultyId = CONFIG.DIFFICULTY[data.difficulty || 'NORMAL'] ? data.difficulty! : 'NORMAL';
        this.mode = data.mode === 'tutorial' ? 'tutorial' : 'campaign';
        this.loadSaveOnStart = this.mode === 'campaign' && Boolean(data.loadSave);
    }

    create(): void {
        this.input.addPointer(2);
        this.setupMobileLayoutDetection();
        this.cameras.main.setBackgroundColor(VISUAL_THEME.world.background);

        this.mapManager = new MapManager();
        this.performanceStats = new PerformanceStats(this);
        (window as any).__GRADIUM_PERF__ = this.performanceStats;
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
        this.researchManager = new ResearchManager(this);
        this.trainingPlanner = new TrainingPlannerManager(this);
        this.soundManager = new SoundManager();
        this.uiManager = new UIManager(this);
        this.saveManager = new SaveManager(this);
        this.inventoryManager = new InventoryManager(this.buildingManager);
        this.effectsManager = new EffectsManager(this);
        this.overlayController = new OverlayController(this);
        this.inputController = new InputController(this);
        this.tutorialManager = undefined;

        if (this.mode === 'tutorial') {
            this.mapManager.generateTutorialMap();
        } else {
            this.mapManager.generateResourcePatches();
        }
        this.cameraController.applyBounds();
        this.buildingManager.place(CORE_PIXEL_X, CORE_PIXEL_Y, 'CORE', 0);
        this.cameraController.centerOnCore();

        // 시작 시 일정량의 실리콘 제공을 위한 창고 설치
        const startStorage = this.buildingManager.place((CONFIG.CORE_ORIGIN.TILE_X - 2) * CONFIG.GRID_SIZE, CONFIG.CORE_ORIGIN.TILE_Y * CONFIG.GRID_SIZE, 'STORAGE', 0);
        if (startStorage) {
            for (let i = 0; i < 100; i++) {
                startStorage.inputBuffer.push('SILICON');
            }
        }

        this.setupCursor();
        this.setupInput();
        this.setupEvents();
        this.gridRenderer.draw(true);

        // Initialize build controls now that all managers are ready.
        if (this.mode === 'tutorial') {
            this.tutorialManager = new TutorialManager(this);
        }
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');
        if (this.loadSaveOnStart) {
            this.saveManager.loadGame();
        }
    }

    setupEvents(): void {
        EventBus.on('BUILDING_SELECTED', ({ type }: { type: string }) => {
            this.selectedBuildingType = type;
            this.updateCursorGraphics();
        }, 'MainScene');

        EventBus.on('POWER_UPDATED', () => {
            this.powerGridDirty = true;
            this._powerWarningDirty = true;
        }, 'MainScene');

        EventBus.on('BUILDING_PLACED', ({ building, type }: { key: string; building: any; type: string }) => {
            this.effectsManager.playBuildOnline(building, type);
            EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', {
                message: t('log.buildingOnline', { name: getBuildingName(type) })
            });
            this.defenseRangeDirty = true;
        }, 'MainScene');

        EventBus.on('BUILDING_REMOVED', ({ key }: { key: string }) => {
            const [x, y] = key.split(',').map(Number);
            this.effectsManager.playBuildingRemoved(x, y);
            EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', {
                message: `System: Unit disconnected at [${x}, ${y}].`,
                isAlert: true
            });
            this.defenseRangeDirty = true;
        }, 'MainScene');

        EventBus.on('BUILDING_DAMAGED', ({ key, building }: { key: string; building: any; amount: number; hp: number; maxHp: number }) => {
            this.effectsManager.playBuildingDamaged(building);
            this.currentWaveStats?.buildingsDamaged.add(key);
        }, 'MainScene');

        EventBus.on('BUILDING_DESTROYED', ({ key }: { key: string; building: any }) => {
            this.currentWaveStats?.buildingsDestroyed.add(key);
        }, 'MainScene');

        EventBus.on('WAVE_STARTED', ({ wave, routes }) => {
            const core = this.buildingManager.get(CORE_KEY) as Core | null;
            this.currentWaveStats = {
                wave,
                enemiesDestroyed: 0,
                coreHpBefore: core?.hp ?? 0,
                dataBefore: core?.totalDataReceived ?? 0,
                buildingsDamaged: new Set<string>(),
                buildingsDestroyed: new Set<string>()
            };
            this.effectsManager.playWaveStart(routes);
        }, 'MainScene');

        EventBus.on('ENEMY_KILLED', ({ x, y }: { id: string; type: string; x: number; y: number; rewardSilicon: number }) => {
            if (this.currentWaveStats) this.currentWaveStats.enemiesDestroyed++;
            this.effectsManager.playEnemyKilled(x, y);
        }, 'MainScene');

        EventBus.on('WAVE_ENDED', () => {
            if (!this.currentWaveStats) return;
            const core = this.buildingManager.get(CORE_KEY) as Core | null;
            const summary = createWaveResultSummary({
                wave: this.currentWaveStats.wave,
                enemiesDestroyed: this.currentWaveStats.enemiesDestroyed,
                coreHpBefore: this.currentWaveStats.coreHpBefore,
                coreHpAfter: core?.hp ?? 0,
                coreMaxHp: core?.maxHp ?? 1,
                dataBefore: this.currentWaveStats.dataBefore,
                dataAfter: core?.totalDataReceived ?? this.currentWaveStats.dataBefore,
                buildingsDamaged: this.currentWaveStats.buildingsDamaged.size,
                buildingsDestroyed: this.currentWaveStats.buildingsDestroyed.size
            });
            EventBus.emit('WAVE_RESULT_SUMMARY_REQUESTED', summary);
            this.currentWaveStats = null;
        }, 'MainScene');

        this.events.on('shutdown', () => {
            if (this.mobileMediaQuery && this.mobileLayoutHandler) {
                this.mobileMediaQuery.removeEventListener('change', this.mobileLayoutHandler);
                window.removeEventListener('resize', this.mobileLayoutHandler);
            }
            clearMobileLayoutClass();
            [
                'MainScene',
                'CableManager',
                'Core',
                'BaseEnemyPathCache',
                'BuildConsoleController',
                'InputController',
                'ItemManager',
                'GameOverController',
                'HudShellController',
                'HudLocalizationController',
                'NotificationController',
                'PowerManager',
                'SaveManager',
                'SettingsController',
                'SoundManager',
                'TacticalPanelController',
                'TopHudController',
                'MobileActionController',
                'TrainingLabController',
                'TutorialManager',
                'WaveManager'
            ].forEach(owner => EventBus.offAll(owner));
            if ((window as any).__GRADIUM_PERF__ === this.performanceStats) {
                delete (window as any).__GRADIUM_PERF__;
            }
        });
    }

    initializeDefenseModelStates(): void {
        CONFIG.MODEL_TRAINING.TARGET_TYPES.forEach(type => {
            this.defenseModelStates[type] = createDefaultDefenseModelState();
        });
    }

    getDefenseModelState(type: string): DefenseModelState {
        if (!this.defenseModelStates[type]) {
            this.defenseModelStates[type] = createDefaultDefenseModelState();
        } else {
            this.defenseModelStates[type] = normalizeDefenseModelState(this.defenseModelStates[type] as any);
        }
        return this.defenseModelStates[type];
    }

    addTrainingData(type: string, itemType: string): number {
        const state = this.getDefenseModelState(type);
        const value = getTrainingDataValue(itemType);
        if (value <= 0) return 0;
        state.accumulatedTrainingData += value;
        return value;
    }

    startTrainingIfReady(type: string, durationTicks: number = CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS): boolean {
        const state = this.getDefenseModelState(type);
        if (state.isTraining || state.accumulatedTrainingData < state.currentRequirement) {
            return false;
        }

        state.accumulatedTrainingData -= state.currentRequirement;
        state.isTraining = true;
        state.trainingProgressTicks = 0;
        state.trainingDurationTicks = Math.max(1, Math.ceil(durationTicks));
        this.syncDefenseModelType(type);
        return true;
    }

    completeTraining(type: string): 'accuracy' | 'damage' {
        const state = this.getDefenseModelState(type);
        const reward = applyCompletedTraining(state);
        state.isTraining = false;
        state.trainingProgressTicks = 0;
        state.trainingDurationTicks = CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS;
        state.currentRequirement = getNextTrainingRequirement(state.currentRequirement);
        this.syncDefenseModelType(type);
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');
        return reward.kind;
    }

    isGpuUnlocked(): boolean {
        return isGpuUnlocked(this.defenseModelStates);
    }

    syncDefenseModelType(type: string): void {
        const state = this.getDefenseModelState(type);
        this.buildingManager?.getByType(type).forEach(building => {
            if (building instanceof DefenseTower && building.type === type) {
                building.applyModelState(state);
            }
        });
    }

    setupMobileLayoutDetection(): void {
        this.mobileMediaQuery = createMobileLayoutMediaQuery();
        this.mobileLayoutHandler = () => this.updateMobileLayoutState();
        this.mobileMediaQuery.addEventListener('change', this.mobileLayoutHandler);
        window.addEventListener('resize', this.mobileLayoutHandler);
        this.updateMobileLayoutState();
    }

    updateMobileLayoutState(): void {
        const matches = isMobileLayoutMatched(this.mobileMediaQuery);
        const wasMobile = this.isMobileLayout;
        this.isMobileLayout = matches;
        setMobileLayoutClass(matches);
        EventBus.emit('HUD_SHELL_SYNC_REQUESTED');

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
        const mode = this.selectedBuildingType;
        this.ghostGraphics.clear();

        if (mode === 'REMOVE') {
            this.ghostGraphics.fillStyle(VISUAL_THEME.overlays.remove, 0.08);
            this.ghostGraphics.fillRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            this.ghostGraphics.lineStyle(2, VISUAL_THEME.overlays.remove, 0.9);
            this.ghostGraphics.strokeRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            this.ghostGraphics.lineBetween(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            this.ghostGraphics.lineBetween(CONFIG.GRID_SIZE, 0, 0, CONFIG.GRID_SIZE);
            this.cursorContainer.setAlpha(1);
        } else if (mode === 'BASIC' || mode === 'FIBER') {
            this.ghostGraphics.fillStyle(mode === 'FIBER' ? VISUAL_THEME.cables.fiber : VISUAL_THEME.cables.basic, 0.07);
            this.ghostGraphics.fillRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            this.ghostGraphics.lineStyle(2, mode === 'FIBER' ? VISUAL_THEME.cables.fiber : VISUAL_THEME.cables.basic, 0.86);
            this.ghostGraphics.strokeRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            this.cursorContainer.setAlpha(1);
        } else {
            const bConfig = CONFIG.BUILDINGS[mode];
            if (!bConfig) return;
            const w = bConfig.WIDTH || 1;
            const h = bConfig.HEIGHT || 1;

            const accent = getCategoryColor(bConfig.CATEGORY);
            this.ghostGraphics.fillStyle(accent, 0.14);
            this.ghostGraphics.fillRoundedRect(0, 0, CONFIG.GRID_SIZE * w, CONFIG.GRID_SIZE * h, 5);
            this.ghostGraphics.fillStyle(VISUAL_THEME.buildings.panelDark, 0.48);
            this.ghostGraphics.fillRoundedRect(3, 3, CONFIG.GRID_SIZE * w - 6, CONFIG.GRID_SIZE * h - 6, 4);

            const cx = (CONFIG.GRID_SIZE * w) / 2;
            const cy = (CONFIG.GRID_SIZE * h) / 2;
            this.ghostGraphics.lineStyle(2, accent, 0.92);
            this.ghostGraphics.strokeRoundedRect(0, 0, CONFIG.GRID_SIZE * w, CONFIG.GRID_SIZE * h, 5);

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
            this.cursorContainer.setAlpha(0.7);
        }
    }

    rotateCursor(): void {
        this.inputController.rotateCursor();
    }

    toggleDefenseRange(): void {
        this.showDefenseRange = !this.showDefenseRange;
        this.defenseRangeDirty = true;
        EventBus.emit('MOBILE_ACTION_REFRESH_REQUESTED');
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', {
            message: `System: Defense Range Overlay ${this.showDefenseRange ? 'ON' : 'OFF'}`
        });
    }

    togglePowerGrid(): void {
        this.showPowerGrid = !this.showPowerGrid;
        this.powerGridDirty = true;
        EventBus.emit('MOBILE_ACTION_REFRESH_REQUESTED');
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', {
            message: `System: Power Grid Overlay ${this.showPowerGrid ? 'ON' : 'OFF'}`
        });
    }

    cancelCurrentAction(): void {
        this.inputController.cancelCurrentAction();
    }

    update(time: number, delta: number): void {
        this.performanceStats.recordFrame(delta);
        BaseBuilding.tickVisualFrame();
        this.updateCursorPosition();
        this.gridRenderer.draw();

        this.tickSystem.update(time);
        this.waveManager.update(delta * this.gameSpeed);
        this.saveManager.update(delta);

        EventBus.emit('UI_FRAME_REFRESH_REQUESTED', { itemCount: this.itemManager.getItems().length });
        this.cameraController.update();

        this.cableManager.markDirtyIfThrottlingChanged();
        this.cableManager.drawCables();

        // Throttle power warnings: only update when power state changes or every 15 frames for pulse animations
        this._powerWarningFrameCount++;
        if (this._powerWarningDirty || this._powerWarningFrameCount >= 15) {
            this.effectsManager.updatePowerWarnings();
            this._powerWarningDirty = false;
            this._powerWarningFrameCount = 0;
        }

        if (this.cableState === 'CABLE_START' && this.cableStartKey) {
            this.cableDraftGraphics.clear();
            const pointer = this.input.activePointer;
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const mode = this.selectedBuildingType;
            const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
            const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
            const hoveredKey = this.cableManager.normalizeKey(`${snappedX},${snappedY}`, this.buildingManager);
            const hasEndpoint = this.buildingManager.has(`${snappedX},${snappedY}`);
            const validation = (mode === 'BASIC' || mode === 'FIBER') && hasEndpoint
                ? this.cableManager.canConnect(this.cableStartKey, hoveredKey, mode)
                : null;
            const isInvalid = validation ? !validation.ok : false;
            const cableColor = mode === 'FIBER' ? VISUAL_THEME.cables.fiber : VISUAL_THEME.cables.basic;
            const color = isInvalid ? VISUAL_THEME.overlays.invalid : cableColor;
            const center = this.cableManager.getBuildingCenter(this.cableStartKey);
            const target = hasEndpoint ? this.cableManager.getBuildingCenter(hoveredKey) : worldPoint;
            const cx1 = center.x;
            const cy1 = center.y;
            this.cableDraftGraphics.lineStyle(7, color, 0.1);
            this._cableDraftLine.setTo(cx1, cy1, target.x, target.y);
            this.cableDraftGraphics.strokeLineShape(this._cableDraftLine);
            this.cableDraftGraphics.lineStyle(2, isInvalid ? VISUAL_THEME.overlays.invalid : 0xffffff, 0.72);
            this.cableDraftGraphics.strokeLineShape(this._cableDraftLine);
            if (validation?.blockedTile) {
                const x = validation.blockedTile.x + CONFIG.GRID_SIZE / 2;
                const y = validation.blockedTile.y + CONFIG.GRID_SIZE / 2;
                this.cableDraftGraphics.lineStyle(3, VISUAL_THEME.overlays.invalid, 0.95);
                this.cableDraftGraphics.lineBetween(x - 8, y - 8, x + 8, y + 8);
                this.cableDraftGraphics.lineBetween(x + 8, y - 8, x - 8, y + 8);
            }
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
                const tileX = x + dx * CONFIG.GRID_SIZE;
                const tileY = y + dy * CONFIG.GRID_SIZE;
                if (!this.mapManager.isAreaWithinBuildBounds(tileX, tileY, 1, 1)) {
                    return true;
                }
                if (this.buildingManager.has(`${tileX},${tileY}`) || this.mapManager.isTerrainBlocked(tileX, tileY)) {
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

    setBloomEnabled(enabled: boolean): void {
        this.bloomEnabled = enabled;
        if (this.cableManager) {
            this.cableManager.dirty = true;
        }
        EventBus.emit('BLOOM_SETTINGS_CHANGED', { enabled });
    }
}
