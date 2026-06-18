import Phaser from 'phaser';
import { CONFIG } from '../config';
import BaseBuilding from '../buildings/BaseBuilding';

import type BuildingManager from '../managers/BuildingManager';
import type ItemManager from '../managers/ItemManager';
import type MapManager from '../managers/MapManager';
import type UIManager from '../ui/UIManager';
import type GridRenderer from '../managers/GridRenderer';
import type CameraController from '../managers/CameraController';
import type TickSystem from '../managers/TickSystem';
import type PowerManager from '../managers/PowerManager';
import type WaveManager from '../managers/WaveManager';
import type SaveManager from '../managers/SaveManager';
import type ResearchManager from '../managers/ResearchManager';
import type InventoryManager from '../managers/InventoryManager';
import type CableManager from '../managers/CableManager';
import type EffectsManager from '../managers/EffectsManager';
import type SoundManager from '../managers/SoundManager';
import type TutorialManager from '../managers/TutorialManager';
import type PerformanceStats from '../managers/PerformanceStats';
import EventBus from '../managers/EventBus';
import { GameMode } from '../types';
import type OverlayController from '../controllers/OverlayController';
import type InputController from '../controllers/InputController';
import { getCategoryColor, VISUAL_THEME } from '../visuals/visualTheme';
import {
    clearMobileLayoutClass,
    createMobileLayoutMediaQuery,
    isMobileLayoutMatched,
    setMobileLayoutClass
} from '../ui/domEnvironment';
import {
    finishMainSceneBootstrap,
    initializeMainSceneSystems
} from './MainSceneBootstrap';
import MainSceneRuntimeEvents from './MainSceneRuntimeEvents';

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
    performanceStats!: PerformanceStats;
    mode: GameMode = 'campaign';
    overlayController!: OverlayController;
    inputController!: InputController;

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
    private runtimeEvents: MainSceneRuntimeEvents | null = null;

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
        initializeMainSceneSystems(this);

        this.setupCursor();
        this.setupInput();
        this.setupEvents();
        this.gridRenderer.draw(true);
        finishMainSceneBootstrap(this, this.loadSaveOnStart);
    }

    setupEvents(): void {
        this.runtimeEvents = new MainSceneRuntimeEvents(this);
        this.runtimeEvents.setup();

        this.events.on('shutdown', () => {
            if (this.mobileMediaQuery && this.mobileLayoutHandler) {
                this.mobileMediaQuery.removeEventListener('change', this.mobileLayoutHandler);
                window.removeEventListener('resize', this.mobileLayoutHandler);
            }
            clearMobileLayoutClass();
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

    markPowerStateDirty(): void {
        this.powerGridDirty = true;
        this._powerWarningDirty = true;
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
