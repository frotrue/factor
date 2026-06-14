import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, DefenseModelState, IMainScene, TrainingRewardPreference } from '../types';
import { getBuildingName } from '../i18n';
import EventBus from '../managers/EventBus';
import TrainingPlannerManager from '../managers/TrainingPlannerManager';
import {
    getGpuTrainingSpeedMultiplier,
    getNextTrainingRewardKind,
    getTrainingDataValue,
    getTrainingDurationTicks
} from '../utils/modelTrainingProgress';

const TRAINING_ITEMS = new Set(Object.keys(CONFIG.MODEL_TRAINING.DATA_VALUES));

export interface ModelTrainingLabSummary {
    targetType: string | null;
    activeJobId: string | null;
    activeJobCategory: 'DEFENSE_MODEL' | 'SYSTEM_PROTOCOL' | null;
    selectedState: DefenseModelState | null;
    activeGpuCount: number;
    adjacentGpuCount: number;
    speedMultiplier: number;
    trainingDurationTicks: number;
}

export default class ModelTrainingLab extends BaseBuilding {
    targetType: string | null;
    activeJobId: string | null;
    autoTrain: boolean;
    statusText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'MODEL_TRAINING_LAB', { ...config, color: CONFIG.BUILDINGS.MODEL_TRAINING_LAB.COLOR });
        const savedTarget = config.customState?.targetType;
        this.targetType = savedTarget && CONFIG.BUILDINGS[savedTarget]?.DEFENSE ? savedTarget : null;
        this.activeJobId = config.customState?.activeJobId ?? (this.targetType ? this.getDefenseJobId(this.targetType) : null);
        this.autoTrain = config.customState?.autoTrain ?? true;

        this.statusText = scene.add.text(0, CONFIG.GRID_SIZE * 0.35, 'NO TARGET', {
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '8px',
            color: '#dbeafe',
            align: 'center'
        }).setOrigin(0.5);
        this.container.add(this.statusText);
        this.refreshStatusText();
    }

    canAcceptItem(type: string): boolean {
        return TRAINING_ITEMS.has(type) && this.inputBuffer.length < this.maxBufferSize;
    }

    onTick(tickCount: number): void {
        super.onTick(tickCount);
        if (this.isInfected(tickCount) && tickCount % 2 !== 0) return;

        const planner = (this.scene as IMainScene).trainingPlanner;
        planner.prepareLabTick(this);
        this.drainInputBufferToActiveJob();
        planner.advanceFromLab(this);
        this.refreshStatusText();
    }

    getCustomState(): object {
        return {};
    }

    setTarget(type: string | null): void {
        if (type) {
            (this.scene as IMainScene).trainingPlanner.setManualDefenseJob(type);
        }
        this.syncLegacyFieldsFromPlanner();
        this.refreshStatusText();
        EventBus.emit('MODEL_TRAINING_TARGET_SET', { targetType: type });
    }

    setSystemJob(researchId: string | null): void {
        if (researchId) {
            (this.scene as IMainScene).trainingPlanner.setManualSystemJob(researchId);
        }
        this.syncLegacyFieldsFromPlanner();
        this.refreshStatusText();
        EventBus.emit('MODEL_TRAINING_TARGET_SET', { targetType: null });
    }

    getDefenseJobId(type: string): string {
        return TrainingPlannerManager.getDefenseJobId(type);
    }

    getActiveJobCategory(): 'DEFENSE_MODEL' | 'SYSTEM_PROTOCOL' | null {
        return (this.scene as IMainScene).trainingPlanner.getActiveJobCategory();
    }

    getTargetState(): DefenseModelState | null {
        const targetType = (this.scene as IMainScene).trainingPlanner.getTargetType();
        if (!targetType) return null;
        return (this.scene as IMainScene).getDefenseModelState(targetType);
    }

    setTrainingRewardPreference(type: string, preference: TrainingRewardPreference): void {
        (this.scene as IMainScene).trainingPlanner.setManualRewardPreference(type, preference);
        this.refreshStatusText();
    }

    getSummary(): ModelTrainingLabSummary {
        const planner = (this.scene as IMainScene).trainingPlanner;
        const adjacentGpuCount = this.countAdjacentGpuClusters(false);
        const activeGpuCount = this.countAdjacentGpuClusters(true);
        const speedMultiplier = getGpuTrainingSpeedMultiplier(activeGpuCount);
        const selectedState = this.getTargetState();
        return {
            targetType: planner.getTargetType(),
            activeJobId: planner.activeJobId,
            activeJobCategory: planner.getActiveJobCategory(),
            selectedState,
            activeGpuCount,
            adjacentGpuCount,
            speedMultiplier,
            trainingDurationTicks: getTrainingDurationTicks(activeGpuCount, selectedState?.currentRequirement)
        };
    }

    trainOnce(): boolean {
        this.drainInputBufferToActiveJob();
        return (this.scene as IMainScene).trainingPlanner.advanceFromLab(this);
    }

    drainInputBufferToActiveJob(): void {
        const planner = (this.scene as IMainScene).trainingPlanner;
        const activeJobId = planner.activeJobId;
        if (!activeJobId || this.inputBuffer.length === 0) return;
        const scene = this.scene as IMainScene;
        let accepted = 0;
        this.inputBuffer = this.inputBuffer.filter(item => {
            const value = getTrainingDataValue(item);
            if (value <= 0) return true;

            if (planner.getActiveJobCategory() === 'DEFENSE_MODEL') {
                const targetType = planner.getTargetType();
                if (!targetType) return true;
                scene.addTrainingData(targetType, item);
            } else {
                const progress = scene.researchManager.getJobProgress(activeJobId);
                if (progress.completed || !scene.researchManager.isJobAvailable(activeJobId)) return true;
                scene.researchManager.addJobProgress(activeJobId, value);
            }

            accepted += value;
            return false;
        });
        if (accepted > 0) {
            EventBus.emit('TRAINING_LAB_RENDER_REQUESTED');
        }
    }

    advanceTraining(): boolean {
        return (this.scene as IMainScene).trainingPlanner.advanceFromLab(this);
    }

    advanceSystemProtocolTraining(): boolean {
        return (this.scene as IMainScene).trainingPlanner.advanceFromLab(this);
    }

    countAdjacentGpuClusters(requirePower: boolean): number {
        const scene = this.scene as IMainScene;
        const matches = new Set<BaseBuilding>();
        scene.buildingManager?.forEach(building => {
            if (building.type !== 'GPU_CLUSTER') return;
            if (requirePower && building.hasPower === false) return;
            if (this.isOrthogonallyAdjacent(building)) {
                matches.add(building);
            }
        });
        return Math.min(CONFIG.MODEL_TRAINING.GPU_MAX_ACTIVE, matches.size);
    }

    isOrthogonallyAdjacent(building: BaseBuilding): boolean {
        const gridSize = CONFIG.GRID_SIZE;
        const labConfig = CONFIG.BUILDINGS.MODEL_TRAINING_LAB;
        const buildingConfig = CONFIG.BUILDINGS[building.type];
        const labLeft = this.x / gridSize;
        const labTop = this.y / gridSize;
        const labRight = labLeft + (labConfig.WIDTH || 1);
        const labBottom = labTop + (labConfig.HEIGHT || 1);
        const otherLeft = building.x / gridSize;
        const otherTop = building.y / gridSize;
        const otherRight = otherLeft + (buildingConfig.WIDTH || 1);
        const otherBottom = otherTop + (buildingConfig.HEIGHT || 1);

        const verticalOverlap = otherTop < labBottom && otherBottom > labTop;
        const horizontalOverlap = otherLeft < labRight && otherRight > labLeft;
        return ((otherRight === labLeft || otherLeft === labRight) && verticalOverlap)
            || ((otherBottom === labTop || otherTop === labBottom) && horizontalOverlap);
    }

    refreshStatusText(): void {
        this.syncLegacyFieldsFromPlanner();
        const planner = (this.scene as IMainScene).trainingPlanner;
        if (!planner.activeJobId) {
            this.statusText.setText('NO JOB');
            this.statusText.setColor('#fca5a5');
            return;
        }

        if (planner.getActiveJobCategory() === 'SYSTEM_PROTOCOL') {
            const research = CONFIG.RESEARCH[planner.activeJobId];
            const progress = (this.scene as IMainScene).researchManager.getJobProgress(planner.activeJobId);
            if (!research) {
                this.statusText.setText('BAD JOB');
                this.statusText.setColor('#fca5a5');
                return;
            }

            let progressText = '';
            if (progress.completed) {
                progressText = 'COMPLETED';
            } else if (progress.isTraining) {
                const pct = Math.round(((progress.trainingProgressTicks ?? 0) / (progress.trainingDurationTicks ?? 1)) * 100);
                progressText = `RESEARCHING... ${pct}%`;
            } else {
                progressText = `${Math.floor(progress.progress)}/${research.COST}`;
            }

            this.statusText.setText(`${research.NAME}\n${progressText}\nSYSTEM`);
            this.statusText.setColor(progress.completed ? '#a5b4fc' : '#99f6e4');
            return;
        }

        const state = this.getTargetState();
        const targetType = planner.getTargetType();
        if (!targetType || !state) {
            this.statusText.setText('NO TARGET');
            this.statusText.setColor('#fca5a5');
            return;
        }

        const displayName = getBuildingName(targetType);
        const nextReward = getNextTrainingRewardKind(state) === 'accuracy' ? 'ACC' : 'DMG';
        const trainingLine = state.isTraining
            ? `${Math.round((state.trainingProgressTicks / state.trainingDurationTicks) * 100)}% ${nextReward}`
            : `${Math.floor(state.accumulatedTrainingData)}/${state.currentRequirement}`;
        this.statusText.setText(`${displayName}\n${Math.round(state.modelAccuracy)}% +${Math.round(state.damageBonus)}%\n${trainingLine}`);
        this.statusText.setColor('#99f6e4');
    }

    private syncLegacyFieldsFromPlanner(): void {
        const planner = (this.scene as IMainScene).trainingPlanner;
        this.activeJobId = planner.activeJobId;
        this.targetType = planner.getTargetType();
        this.autoTrain = planner.autoEnabled;
    }
}
