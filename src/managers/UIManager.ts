import { CORE_KEY } from '../config';
import EventBus from './EventBus';
import {
    BuildConsoleSnapshot,
    CoreDataEvent,
    PowerUpdateData
} from '../types';
import type MainScene from '../scenes/MainScene';
import ModelTrainingLab from '../buildings/ModelTrainingLab';
import TrainingLabUI from './TrainingLabUI';
import SettingsUI from './SettingsUI';
import MobileUIManager from './MobileUIManager';
import {
    getBuildingName,
    translateStaticDom
} from '../i18n';
import type { WaveBriefing } from '../utils/waveSimulation';
import { createWaveBriefing } from '../utils/waveSimulation';
import type { WaveResultSummary } from '../utils/waveResultSummary';
import { getObjectiveState } from '../utils/progressionGates';
import { createRunResultSummary } from '../utils/runResultSummary';
import Core from '../buildings/Core';
import {
    ensureLegacyHudDom,
    hideLegacyModalFallbacks,
    syncLegacyHudShellShadow as syncLegacyHudShellShadowDom,
    updateLegacySpeedButtons
} from '../ui/legacyHudDom';
import {
    renderLegacyBuildConsole,
    updateLegacyBuildSelection,
    updateLegacySelectedToolPanel
} from '../ui/legacyBuildConsole';
import {
    getLegacyTacticalPanelRefs,
    showLegacyTacticalPanels,
    updateLegacyDefensePanel,
    updateLegacyObjectivePanel,
    updateLegacyPowerStatus,
    updateLegacyWavePanel,
} from '../ui/legacyTacticalPanels';
import {
    appendLegacyActivityLogEntry,
    hideLegacyTooltipSurfaces,
    showLegacyDesktopTooltip,
    showLegacyMobileTooltip,
    showLegacyWaveResultCard
} from '../ui/legacyNotifications';
import {
    bindLegacyGameOverRestart,
    showLegacyGameOverScreen,
    updateLegacyGameOverStats
} from '../ui/legacyGameOver';
import {
    getLegacyTopHudRefs,
    updateLegacyPackets,
    updateLegacyPower,
    updateLegacyScore,
    updateLegacySilicon,
    updateLegacyWave,
    updateLegacyWaveTimer,
    type LegacyTopHudRefs
} from '../ui/legacyTopHud';
import {
    isMobileLayoutActive,
    isShortLandscapeLayout,
    restoreGameCanvasFocus
} from '../ui/domEnvironment';
import {
    createBuildConsoleDisplayPayload,
    createBuildConsoleDisplayState
} from '../ui/buildConsoleSnapshot';
import {
    createWaveResultDisplayPayload
} from '../ui/waveResultDisplay';
import {
    createActivityLogDisplayPayload,
    createClosedTooltipDisplayPayload,
    createDesktopTooltipDisplayPayload,
    createLabAvailableLogMessage,
    createMobileTooltipDisplayPayload,
    createTrainingLabMissingLogMessage,
    createWaveIncomingLogMessage
} from '../ui/notificationDisplay';
import type { ActivityLogEntrySnapshot } from '../types';
import {
    createGameOverDisplayPayload
} from '../ui/gameOverDisplay';
import {
    createLegacyDefenseStatusDisplay,
    createLegacyObjectiveDisplay,
    createLegacyPowerStatusDisplay,
    createLegacyWavePanelDisplay,
    createTacticalPanelDisplayPayload,
    type LegacyDefenseStatusDisplay,
    type LegacyObjectiveDisplay,
    type LegacyPowerStatusDisplay,
    type LegacyWavePanelDisplay
} from '../ui/tacticalPanelDisplay';
import {
    createPacketsHudDisplayPayload,
    createPowerHudDisplayPayload,
    createScoreHudDisplayPayload,
    createSiliconHudDisplayPayload,
    createWaveStartedHudDisplayPayload
} from '../ui/topHudDisplay';

const TACTICAL_RENDER_INTERVAL_MS = 250;
const SILICON_RENDER_INTERVAL_MS = 250;

export default class UIManager {
    scene: MainScene;
    selectedBuildingType: string;
    buttons: Record<string, HTMLButtonElement>;
    activeCategory: string;
    currentTabBuildings: string[];
    topHudRefs: LegacyTopHudRefs;
    hotkeys: string[];
    lastItemCount: number;
    lastScore: number;
    lastSiliconCount: number;
    private tacticalDirty: boolean;
    private lastTacticalRenderAt: number;
    private lastSiliconRenderAt: number;
    previousBuildSelection: string;
    buildableData: Record<string, any>;
    mobileActionStatus: string | null;
    currentWaveBriefing: WaveBriefing | null;
    lastPowerData: PowerUpdateData | null;
    trainingLabUI: TrainingLabUI;
    settingsUI: SettingsUI;
    mobileUI: MobileUIManager;
    private activityLogEntries: ActivityLogEntrySnapshot[];
    private activityLogNextId: number;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.selectedBuildingType = 'DATA_DOWNLOADER';
        this.buttons = {};
        this.activeCategory = 'EXTRACTION';
        this.currentTabBuildings = [];
        this.buildableData = {};

        this.ensureLegacyHudShell();
        this.topHudRefs = getLegacyTopHudRefs();

        this.hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
        this.lastItemCount = -1;
        this.lastScore = -1;
        this.lastSiliconCount = -1;
        this.tacticalDirty = true;
        this.lastTacticalRenderAt = Number.NEGATIVE_INFINITY;
        this.lastSiliconRenderAt = Number.NEGATIVE_INFINITY;
        this.previousBuildSelection = this.selectedBuildingType;
        this.mobileActionStatus = null;
        this.currentWaveBriefing = createWaveBriefing(scene.waveManager.currentWave + 1, scene.difficultyId);
        this.lastPowerData = null;
        this.trainingLabUI = new TrainingLabUI(scene, this);
        this.settingsUI = new SettingsUI(scene, this);
        this.mobileUI = new MobileUIManager(scene, this);
        this.activityLogEntries = [];
        this.activityLogNextId = 1;

        // Note: createBuildingButtons is now called by MainScene after ResearchManager is initialized
        this.syncLegacyHudShellShadow();
        this.setupEvents();
        this.showTacticalPanels();
    }

    private ensureLegacyHudShell(): void {
        ensureLegacyHudDom();
    }

    syncLegacyHudShellShadow(): void {
        syncLegacyHudShellShadowDom(isMobileLayoutActive(), isShortLandscapeLayout());
    }

    setupEvents(): void {
        EventBus.on('CORE_DATA_RECEIVED', (data: CoreDataEvent) => {
            const display = createScoreHudDisplayPayload(data.total);
            if (this.lastScore !== data.total) {
                this.lastScore = data.total;
                updateLegacyScore(this.topHudRefs, display.legacyValue);
            }
            EventBus.emit('HUD_STATE_UPDATED', display.snapshot);
            this.markTacticalDirty();
        }, 'UIManager');

        EventBus.on('POWER_UPDATED', (data: PowerUpdateData) => {
            this.lastPowerData = data;
            const display = createPowerHudDisplayPayload(data);
            updateLegacyPower(this.topHudRefs, display.legacyPower);
            EventBus.emit('HUD_STATE_UPDATED', display.snapshot);
            this.renderPowerStatus();
        }, 'UIManager');

        EventBus.on('WAVE_STARTED', ({ wave }: { wave: number }) => {
            const display = createWaveStartedHudDisplayPayload(wave);
            updateLegacyWave(this.topHudRefs, display.legacyWave);
            updateLegacyWaveTimer(this.topHudRefs, display.legacyWaveTimer);
            EventBus.emit('HUD_STATE_UPDATED', display.snapshot);
            this.markTacticalDirty();
            this.logMessage(createWaveIncomingLogMessage(wave), true);
        }, 'UIManager');

        EventBus.on('WAVE_BRIEFING_UPDATED', (briefing: WaveBriefing) => {
            this.currentWaveBriefing = briefing;
            this.renderWaveBriefing();
            this.markTacticalDirty();
        }, 'UIManager');

        EventBus.on('WAVE_UPDATE', ({ timer }: { timer: number }) => {
            this.renderWaveBriefing(timer);
        }, 'UIManager');

        EventBus.on('WAVE_ENDED', () => {
            this.createBuildingButtons();
            this.markTacticalDirty();
            this.flushTacticalPanels(true);
            this.logMessage(createLabAvailableLogMessage());
        }, 'UIManager');

        EventBus.on('BUILDING_PLACED', () => {
            this.markTacticalDirty();
        }, 'UIManager');

        EventBus.on('BUILDING_REMOVED', () => {
            this.markTacticalDirty();
        }, 'UIManager');

        EventBus.on('BUILDING_DESTROYED', () => {
            this.markTacticalDirty();
        }, 'UIManager');

        EventBus.on('RESEARCH_UNLOCKED', () => {
            this.createBuildingButtons();
            this.markTacticalDirty();
            this.flushTacticalPanels(true);
        }, 'UIManager');

        EventBus.on('GAME_OVER', () => {
            showLegacyGameOverScreen();
            this.renderGameOverStats();
            bindLegacyGameOverRestart(() => window.location.reload());
        }, 'UIManager');
        EventBus.on('GAME_OVER_ACTION_REQUESTED', () => {
            window.location.reload();
        }, 'UIManager');
        EventBus.on('TOOLTIP_CLOSE_REQUESTED', () => {
            this.hideTooltip();
        }, 'UIManager');

        this.scene.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
            const key = event.key;
            if (this.hotkeys.includes(key)) {
                const index = parseInt(key) - 1;
                if (index < this.currentTabBuildings.length) {
                    this.selectBuilding(this.currentTabBuildings[index]);
                }
            } else if (key === 'Delete' || key === 'Backspace' || key === '0') {
                this.selectBuilding('REMOVE');
            } else if (key === 'Escape') {
                hideLegacyModalFallbacks();
                EventBus.emit('SETTINGS_MODAL_OPEN_CHANGED', { open: false });
                EventBus.emit('TRAINING_LAB_OPEN_CHANGED', { open: false });
                this.restoreCanvasFocus();
            }
        });

        EventBus.on('GAME_SPEED_CHANGED', ({ speed }: { speed: number }) => {
            updateLegacySpeedButtons(speed);
            this.markTacticalDirty();
        }, 'UIManager');

        EventBus.on('BUILD_CATEGORY_SELECT_REQUESTED', ({ category }: { category: string }) => {
            if (category === this.activeCategory) return;
            this.activeCategory = category;
            this.createBuildingButtons();
        }, 'UIManager');

        EventBus.on('BUILD_TOOL_SELECT_REQUESTED', ({ type }: { type: string }) => {
            this.selectBuilding(type);
        }, 'UIManager');
        EventBus.on('TRAINING_LAB_OPEN_REQUESTED', ({ tab }: { tab?: 'DEFENSE' | 'SYSTEM' }) => {
            this.openFirstTrainingLab(tab);
        }, 'UIManager');
        EventBus.on('RESEARCH_OPENED', () => {
            this.openFirstTrainingLab('SYSTEM');
        }, 'UIManager');

        this.settingsUI.setup();
        this.mobileUI.setup();
        this.trainingLabUI.setup();
        translateStaticDom();
        window.addEventListener('languagechange', () => {
            translateStaticDom();
            this.createBuildingButtons();
            this.mobileUI.setup();
            this.updateMobileBuildSummary();
            this.updateMobileControls();
            this.renderTacticalPanels();
            this.tacticalDirty = false;
            this.lastTacticalRenderAt = this.getUiTime();
        });
    }

    private getUiTime(): number {
        return this.scene.time?.now ?? globalThis.performance?.now?.() ?? Date.now();
    }

    private markTacticalDirty(): void {
        this.tacticalDirty = true;
    }

    private getLegacyTacticalPanelRefs() {
        return getLegacyTacticalPanelRefs(this.topHudRefs.waveTimerEl);
    }

    private flushTacticalPanels(force = false): void {
        if (!this.tacticalDirty && !force) return;

        const now = this.getUiTime();
        if (!force && now - this.lastTacticalRenderAt < TACTICAL_RENDER_INTERVAL_MS) return;

        this.scene.performanceStats?.increment('uiTacticalRenders');
        this.renderTacticalPanels();
        this.tacticalDirty = false;
        this.lastTacticalRenderAt = now;
    }

    private renderWaveBriefing(timer?: number): LegacyWavePanelDisplay | null {
        const display = createLegacyWavePanelDisplay(this.currentWaveBriefing, timer);
        if (!display) return null;
        updateLegacyWavePanel(this.getLegacyTacticalPanelRefs(), display);
        return display;
    }

    showTacticalPanels(): void {
        showLegacyTacticalPanels();
        this.markTacticalDirty();
        this.flushTacticalPanels(true);
    }

    renderTacticalPanels(): void {
        const objective = this.renderCurrentObjective();
        const wave = this.renderWaveBriefing();
        const defense = this.renderDefenseStatus();
        const powerStatus = this.renderPowerStatus();
        this.publishTacticalPanelDisplay(objective, wave, defense, powerStatus);
    }

    private publishTacticalPanelDisplay(
        objective: LegacyObjectiveDisplay,
        wave: LegacyWavePanelDisplay | null,
        defense: LegacyDefenseStatusDisplay,
        powerStatus: LegacyPowerStatusDisplay
    ): void {
        const display = createTacticalPanelDisplayPayload({
            objective,
            wave,
            defense,
            powerStatus,
            briefing: this.currentWaveBriefing
        });
        EventBus.emit('TACTICAL_PANELS_UPDATED', display.snapshot);
    }

    showWaveResultSummary(summary: WaveResultSummary): void {
        const display = createWaveResultDisplayPayload(summary);
        EventBus.emit('WAVE_RESULT_UPDATED', display.snapshot);
        showLegacyWaveResultCard(display.legacyContent);
        this.logMessage(display.logMessage);
    }

    private renderGameOverStats(): void {
        const core = this.scene.buildingManager.get(CORE_KEY);
        const coreBuilding = core instanceof Core ? core : null;
        const summary = createRunResultSummary({
            wave: this.scene.waveManager.currentWave,
            coreHp: coreBuilding?.hp ?? 0,
            coreMaxHp: coreBuilding?.maxHp ?? 1,
            totalDataReceived: coreBuilding?.totalDataReceived ?? 0,
            unlockedResearchCount: this.scene.researchManager?.getUnlockedResearch().length ?? 0,
            modelStates: this.scene.defenseModelStates,
            getModelName: getBuildingName
        });

        const display = createGameOverDisplayPayload(summary);
        EventBus.emit('GAME_OVER_UPDATED', display.snapshot);
        updateLegacyGameOverStats(display.legacyStatLines);
    }

    hasFirstDefenseSuccess(): boolean {
        const waveManager = this.scene.waveManager;
        if (!waveManager) return false;
        return waveManager.currentWave > 1 || (waveManager.currentWave >= 1 && !waveManager.waveActive);
    }

    private countBuildings(types: string[]): number {
        return this.scene.buildingManager?.countByTypes(types) || 0;
    }

    private renderCurrentObjective(): LegacyObjectiveDisplay {
        const hasDownloader = this.countBuildings(['DATA_DOWNLOADER']) > 0;
        const hasProcessor = this.countBuildings(['PROCESSOR', 'WEIGHT_TRAINER']) > 0;
        const hasDefense = this.countBuildings(['CLASSIFIER', 'FILTER', 'FIREWALL']) > 0;
        const firstDefenseDone = this.hasFirstDefenseSuccess();
        const modelLabs = (this.scene.buildingManager?.getByType('MODEL_TRAINING_LAB') || [])
            .filter((building): building is ModelTrainingLab => building instanceof ModelTrainingLab);
        const state = getObjectiveState({
            hasDownloader,
            hasProcessor,
            hasDefense,
            firstDefenseDone,
            productionCount: this.countBuildings(['DATA_DOWNLOADER', 'PROCESSOR', 'WEIGHT_TRAINER', 'NEURAL_TRAINER', 'MODEL_TRAINING_LAB']),
            defenseCount: this.countBuildings(['CLASSIFIER', 'FILTER', 'FIREWALL']),
            hasModelTrainingLab: modelLabs.length > 0,
            hasModelTrainingTarget: modelLabs.some(lab => Boolean(lab.targetType))
        });
        const display = createLegacyObjectiveDisplay(state);

        updateLegacyObjectivePanel(
            this.getLegacyTacticalPanelRefs(),
            display.title,
            display.detail
        );
        return display;
    }

    private renderDefenseStatus(): LegacyDefenseStatusDisplay {
        const defenseTypes = ['CLASSIFIER', 'FILTER', 'FIREWALL'];
        const counts = defenseTypes.map(type => ({
            name: getBuildingName(type),
            count: this.countBuildings([type]),
            state: this.scene.getDefenseModelState(type)
        }));

        const activeLab = this.findActiveModelTrainingLab();
        const display = createLegacyDefenseStatusDisplay(
            counts,
            activeLab?.targetType
                ? {
                    name: getBuildingName(activeLab.targetType),
                    state: this.scene.getDefenseModelState(activeLab.targetType)
                }
                : null
        );
        updateLegacyDefensePanel(
            this.getLegacyTacticalPanelRefs(),
            display.title,
            display.detail
        );
        return display;
    }

    private findActiveModelTrainingLab(): ModelTrainingLab | null {
        let activeLab: ModelTrainingLab | null = null;
        const labs = this.scene.buildingManager?.getByType('MODEL_TRAINING_LAB') || [];
        for (let i = 0; i < labs.length; i++) {
            if (labs[i] instanceof ModelTrainingLab) {
                activeLab = labs[i] as ModelTrainingLab;
                break;
            }
        }
        return activeLab;
    }

    private renderPowerStatus(): LegacyPowerStatusDisplay {
        const display = createLegacyPowerStatusDisplay(this.lastPowerData);
        updateLegacyPowerStatus(this.getLegacyTacticalPanelRefs(), display.text, display.tone);
        return display;
    }

    guardDomPointer(element: HTMLElement | null): void {
        if (!element || element.dataset.pointerGuarded === 'true') return;
        element.dataset.pointerGuarded = 'true';
        ['pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(eventName => {
            element.addEventListener(eventName, event => {
                event.stopPropagation();
            }, { passive: false });
        });
    }

    createBuildingButtons(): void {
        const allowed = this.scene.tutorialManager && !this.scene.tutorialManager.isCompleted()
            ? this.scene.tutorialManager.getAllowedBuildings()
            : null;
        const displayState = createBuildConsoleDisplayState({
            activeCategory: this.activeCategory,
            hasFirstDefenseSuccess: this.hasFirstDefenseSuccess(),
            isGpuUnlocked: this.scene.isGpuUnlocked(),
            isResearchUnlocked: researchId => Boolean(this.scene.researchManager?.isUnlocked(researchId))
        });
        const renderResult = renderLegacyBuildConsole({
            activeCategory: this.activeCategory,
            allowedBuildings: allowed,
            guardDomPointer: element => this.guardDomPointer(element),
            hasFirstDefenseSuccess: this.hasFirstDefenseSuccess(),
            hotkeys: this.hotkeys,
            isGpuUnlocked: this.scene.isGpuUnlocked(),
            isResearchUnlocked: researchId => Boolean(this.scene.researchManager?.isUnlocked(researchId)),
            onCategorySelect: category => {
                this.activeCategory = category;
                this.createBuildingButtons();
            },
            onToolSelect: type => this.selectBuilding(type),
            selectedBuildingType: this.selectedBuildingType
        });

        this.buttons = renderResult?.buttons ?? this.buttons;
        this.currentTabBuildings = renderResult?.currentTabBuildings ?? displayState.currentTabBuildings;
        this.buildableData = renderResult?.buildableData ?? displayState.buildableData;

        this.updateMobileBuildSummary();
        this.updateMobileControls();
        const categories = (renderResult?.categories ?? displayState.categories).map(cat => ({
            id: cat.id,
            label: cat.label,
            active: cat.active
        }));
        this.publishBuildConsoleDisplay(categories);
    }

    selectBuilding(type: string): void {
        if (type !== 'REMOVE' && type !== 'BASIC' && type !== 'FIBER') {
            this.previousBuildSelection = type;
        }
        this.selectedBuildingType = type;
        updateLegacyBuildSelection(this.buttons, type);
        this.mobileUI.closeCableMenu();
        this.updateMobileBuildSummary();
        this.updateMobileControls();
        this.publishBuildConsoleDisplay();
        EventBus.emit('BUILDING_SELECTED', { type });
    }

    private publishBuildConsoleDisplay(categories?: BuildConsoleSnapshot['categories']): void {
        const display = createBuildConsoleDisplayPayload({
            activeCategory: this.activeCategory,
            buildableData: this.buildableData,
            categories,
            currentTabBuildings: this.currentTabBuildings,
            hotkeys: this.hotkeys,
            selectedBuildingType: this.selectedBuildingType
        });
        updateLegacySelectedToolPanel(
            display.legacySelectedTool.name,
            display.legacySelectedTool.cost,
            display.legacySelectedTool.hint
        );
        EventBus.emit('BUILD_CONSOLE_UPDATED', display.snapshot);
    }

    cancelMobileAction(): void {
        this.mobileUI.cancelAction();
    }

    setMobileActionStatus(status: string | null): void {
        this.mobileUI.setActionStatus(status);
    }

    updateMobileControls(): void {
        this.mobileUI.updateControls();
    }

    openTrainingLab(lab: ModelTrainingLab): void {
        this.trainingLabUI.open(lab);
    }

    private openFirstTrainingLab(tab: 'DEFENSE' | 'SYSTEM' = 'DEFENSE'): void {
        const lab = (this.scene.buildingManager?.getByType('MODEL_TRAINING_LAB') || [])
            .find(building => building instanceof ModelTrainingLab) as ModelTrainingLab | undefined;
        if (!lab) {
            this.logMessage(createTrainingLabMissingLogMessage());
            return;
        }
        this.trainingLabUI.setActiveTab(tab);
        this.openTrainingLab(lab);
    }

    renderTrainingLab(): void {
        this.trainingLabUI.render();
    }

    updateMobileBuildSummary(): void {
        this.mobileUI.updateBuildSummary();
    }

    update(itemCount: number): void {
        const now = this.getUiTime();

        if (this.lastItemCount !== itemCount) {
            this.lastItemCount = itemCount;
            const display = createPacketsHudDisplayPayload(itemCount);
            updateLegacyPackets(this.topHudRefs, display.legacyValue);
            EventBus.emit('HUD_STATE_UPDATED', display.snapshot);
        }

        if (now - this.lastSiliconRenderAt >= SILICON_RENDER_INTERVAL_MS) {
            this.lastSiliconRenderAt = now;
            const mainScene = this.scene;
            if (mainScene.inventoryManager) {
                const siliconCount = mainScene.inventoryManager.getResourceCount('SILICON');
                if (this.lastSiliconCount !== siliconCount) {
                    this.lastSiliconCount = siliconCount;
                    const display = createSiliconHudDisplayPayload(siliconCount);
                    updateLegacySilicon(this.topHudRefs, display.legacyValue);
                    EventBus.emit('HUD_STATE_UPDATED', display.snapshot);
                }
            }
        }

        this.flushTacticalPanels();
    }

    showTooltip(x: number, y: number, title: string, content: string): void {
        if (isMobileLayoutActive()) {
            const display = createMobileTooltipDisplayPayload(title, content);
            EventBus.emit('TOOLTIP_UPDATED', display.snapshot);
            showLegacyMobileTooltip(display.legacyMobileHtml);
            return;
        }

        const display = createDesktopTooltipDisplayPayload(x, y, title, content);
        EventBus.emit('TOOLTIP_UPDATED', display.snapshot);
        showLegacyDesktopTooltip(
            display.legacyDesktop.x,
            display.legacyDesktop.y,
            display.legacyDesktop.title,
            display.legacyDesktop.content
        );
    }

    hideTooltip(): void {
        const display = createClosedTooltipDisplayPayload();
        if (display.legacyHidden) hideLegacyTooltipSurfaces();
        EventBus.emit('TOOLTIP_UPDATED', display.snapshot);
    }

    restoreCanvasFocus(): void {
        restoreGameCanvasFocus();
    }

    logMessage(message: string, isAlert: boolean = false): void {
        const display = createActivityLogDisplayPayload(
            this.activityLogEntries,
            this.activityLogNextId,
            message,
            isAlert
        );
        this.activityLogEntries = display.snapshot.entries;
        this.activityLogNextId = display.nextId;
        EventBus.emit('ACTIVITY_LOG_UPDATED', display.snapshot);

        appendLegacyActivityLogEntry(display.legacyEntry.message, display.legacyEntry.isAlert);
    }

    getSelectedBuildingType(): string {
        return this.selectedBuildingType;
    }
}
