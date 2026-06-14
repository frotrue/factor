import ModelTrainingLab from '../buildings/ModelTrainingLab';
import { getBuildingName } from '../i18n';
import EventBus from '../managers/EventBus';
import type MainScene from '../scenes/MainScene';
import type { PowerUpdateData } from '../types';
import { getObjectiveState } from '../utils/progressionGates';
import { createWaveBriefing, type WaveBriefing } from '../utils/waveSimulation';
import {
    getLegacyTacticalPanelRefs,
    showLegacyTacticalPanels,
    updateLegacyDefensePanel,
    updateLegacyObjectivePanel,
    updateLegacyPowerStatus,
    updateLegacyWavePanel
} from './legacyTacticalPanels';
import type { LegacyTopHudRefs } from './legacyTopHud';
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
} from './tacticalPanelDisplay';

const OWNER = 'TacticalPanelController';
const TACTICAL_RENDER_INTERVAL_MS = 250;

export default class TacticalPanelController {
    private currentWaveBriefing: WaveBriefing | null;
    private lastPowerData: PowerUpdateData | null = null;
    private tacticalDirty = true;
    private lastTacticalRenderAt = Number.NEGATIVE_INFINITY;

    constructor(
        private readonly scene: MainScene,
        private readonly topHudRefs: LegacyTopHudRefs
    ) {
        this.currentWaveBriefing = createWaveBriefing(scene.waveManager.currentWave + 1, scene.difficultyId);
    }

    setupEvents(): void {
        EventBus.offAll(OWNER);
        this.scene.events.once('shutdown', () => this.teardown());
        EventBus.on('CORE_DATA_RECEIVED', () => {
            this.markDirty();
        }, OWNER);
        EventBus.on('POWER_UPDATED', data => {
            this.lastPowerData = data;
            this.renderPowerStatus();
        }, OWNER);
        EventBus.on('WAVE_STARTED', () => {
            this.markDirty();
        }, OWNER);
        EventBus.on('WAVE_BRIEFING_UPDATED', briefing => {
            this.currentWaveBriefing = briefing;
            this.renderWaveBriefing();
            this.markDirty();
        }, OWNER);
        EventBus.on('WAVE_UPDATE', ({ timer }) => {
            this.renderWaveBriefing(timer);
        }, OWNER);
        EventBus.on('WAVE_ENDED', () => {
            this.markDirty();
            this.flush(true);
        }, OWNER);
        EventBus.on('BUILDING_PLACED', () => {
            this.markDirty();
        }, OWNER);
        EventBus.on('BUILDING_REMOVED', () => {
            this.markDirty();
        }, OWNER);
        EventBus.on('BUILDING_DESTROYED', () => {
            this.markDirty();
        }, OWNER);
        EventBus.on('RESEARCH_UNLOCKED', () => {
            this.markDirty();
            this.flush(true);
        }, OWNER);
        EventBus.on('GAME_SPEED_CHANGED', () => {
            this.markDirty();
        }, OWNER);
        EventBus.on('TACTICAL_PANELS_REFRESH_REQUESTED', () => {
            this.markDirty();
            this.flush(true);
        }, OWNER);
        EventBus.on('UI_FRAME_REFRESH_REQUESTED', () => {
            this.flush();
        }, OWNER);

        this.show();
    }

    private getUiTime(): number {
        return this.scene.time?.now ?? globalThis.performance?.now?.() ?? Date.now();
    }

    private markDirty(): void {
        this.tacticalDirty = true;
    }

    private getLegacyRefs() {
        return getLegacyTacticalPanelRefs(this.topHudRefs.waveTimerEl);
    }

    private flush(force = false): void {
        if (!this.tacticalDirty && !force) return;

        const now = this.getUiTime();
        if (!force && now - this.lastTacticalRenderAt < TACTICAL_RENDER_INTERVAL_MS) return;

        this.scene.performanceStats?.increment('uiTacticalRenders');
        this.renderAll();
        this.tacticalDirty = false;
        this.lastTacticalRenderAt = now;
    }

    private show(): void {
        showLegacyTacticalPanels();
        this.markDirty();
        this.flush(true);
    }

    private renderAll(): void {
        const objective = this.renderCurrentObjective();
        const wave = this.renderWaveBriefing();
        const defense = this.renderDefenseStatus();
        const powerStatus = this.renderPowerStatus();
        this.publishDisplay(objective, wave, defense, powerStatus);
    }

    private publishDisplay(
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

    private renderWaveBriefing(timer?: number): LegacyWavePanelDisplay | null {
        const display = createLegacyWavePanelDisplay(this.currentWaveBriefing, timer);
        if (!display) return null;
        updateLegacyWavePanel(this.getLegacyRefs(), display);
        return display;
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
            this.getLegacyRefs(),
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
            this.getLegacyRefs(),
            display.title,
            display.detail
        );
        return display;
    }

    private renderPowerStatus(): LegacyPowerStatusDisplay {
        const display = createLegacyPowerStatusDisplay(this.lastPowerData);
        updateLegacyPowerStatus(this.getLegacyRefs(), display.text, display.tone);
        return display;
    }

    private countBuildings(types: string[]): number {
        return this.scene.buildingManager?.countByTypes(types) || 0;
    }

    private hasFirstDefenseSuccess(): boolean {
        const waveManager = this.scene.waveManager;
        if (!waveManager) return false;
        return waveManager.currentWave > 1 || (waveManager.currentWave >= 1 && !waveManager.waveActive);
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

    private teardown(): void {
        EventBus.offAll(OWNER);
    }
}
