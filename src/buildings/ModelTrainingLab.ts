import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, DefenseModelState, IMainScene } from '../types';
import { getBuildingName } from '../i18n';
import EventBus from '../managers/EventBus';
import {
    getGpuTrainingSpeedMultiplier,
    getNextTrainingRewardKind,
    getTrainingDataValue,
    getTrainingDurationTicks
} from '../utils/modelTrainingProgress';

const TRAINING_ITEMS = new Set(Object.keys(CONFIG.MODEL_TRAINING.DATA_VALUES));

export interface ModelTrainingLabSummary {
    targetType: string | null;
    selectedState: DefenseModelState | null;
    activeGpuCount: number;
    adjacentGpuCount: number;
    speedMultiplier: number;
    trainingDurationTicks: number;
}

export default class ModelTrainingLab extends BaseBuilding {
    targetType: string | null;
    autoTrain: boolean;
    statusText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'MODEL_TRAINING_LAB', { ...config, color: CONFIG.BUILDINGS.MODEL_TRAINING_LAB.COLOR });
        const savedTarget = config.customState?.targetType;
        this.targetType = savedTarget && CONFIG.BUILDINGS[savedTarget]?.DEFENSE ? savedTarget : null;
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

        this.drainInputBufferToTrainingData();
        if (this.autoTrain) {
            this.advanceTraining();
        }
        this.refreshStatusText();
    }

    getCustomState(): object {
        return {
            targetType: this.targetType,
            autoTrain: this.autoTrain
        };
    }

    setTarget(type: string | null): void {
        this.targetType = type;
        this.refreshStatusText();
        EventBus.emit('MODEL_TRAINING_TARGET_SET', { targetType: type });
    }

    getTargetState(): DefenseModelState | null {
        if (!this.targetType) return null;
        return (this.scene as IMainScene).getDefenseModelState(this.targetType);
    }

    getSummary(): ModelTrainingLabSummary {
        const adjacentGpuCount = this.countAdjacentGpuClusters(false);
        const activeGpuCount = this.countAdjacentGpuClusters(true);
        const speedMultiplier = getGpuTrainingSpeedMultiplier(activeGpuCount);
        return {
            targetType: this.targetType,
            selectedState: this.getTargetState(),
            activeGpuCount,
            adjacentGpuCount,
            speedMultiplier,
            trainingDurationTicks: getTrainingDurationTicks(activeGpuCount)
        };
    }

    trainOnce(): boolean {
        this.drainInputBufferToTrainingData();
        return this.advanceTraining();
    }

    drainInputBufferToTrainingData(): void {
        if (!this.targetType || this.inputBuffer.length === 0) return;
        const scene = this.scene as IMainScene;
        let accepted = 0;
        this.inputBuffer = this.inputBuffer.filter(item => {
            const value = scene.addTrainingData(this.targetType!, item);
            if (value > 0) {
                accepted += value;
                return false;
            }
            return true;
        });
        if (accepted > 0) {
            scene.uiManager?.renderTrainingLab();
        }
    }

    advanceTraining(): boolean {
        if (!this.targetType) return false;

        const scene = this.scene as IMainScene;
        const state = scene.getDefenseModelState(this.targetType);
        const activeGpuCount = this.countAdjacentGpuClusters(true);

        if (!state.isTraining) {
            const started = scene.startTrainingIfReady(this.targetType, getTrainingDurationTicks(activeGpuCount));
            if (!started) return false;
        }

        const currentState = scene.getDefenseModelState(this.targetType);
        currentState.trainingProgressTicks += 1;
        if (currentState.trainingProgressTicks < currentState.trainingDurationTicks) {
            return true;
        }

        const rewardKind = scene.completeTraining(this.targetType);
        const displayName = getBuildingName(this.targetType);
        const updated = scene.getDefenseModelState(this.targetType);
        const rewardText = rewardKind === 'accuracy'
            ? `accuracy ${Math.round(updated.modelAccuracy)}%`
            : `damage +${Math.round(updated.damageBonus)}%`;
        scene.uiManager?.logMessage(`Training: ${displayName} model complete. ${rewardText}.`);
        scene.buildingManager.forEach(building => {
            if (building.type === this.targetType) {
                scene.effectsManager?.playModelTrainingPulse(building, rewardKind);
            }
        });

        scene.startTrainingIfReady(this.targetType, getTrainingDurationTicks(this.countAdjacentGpuClusters(true)));
        scene.uiManager?.renderTrainingLab();
        return true;
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
        const state = this.getTargetState();
        if (!this.targetType || !state) {
            this.statusText.setText('NO TARGET');
            this.statusText.setColor('#fca5a5');
            return;
        }

        const displayName = getBuildingName(this.targetType);
        const nextReward = getNextTrainingRewardKind(state) === 'accuracy' ? 'ACC' : 'DMG';
        const trainingLine = state.isTraining
            ? `${Math.round((state.trainingProgressTicks / state.trainingDurationTicks) * 100)}% ${nextReward}`
            : `${Math.floor(state.accumulatedTrainingData)}/${state.currentRequirement}`;
        this.statusText.setText(`${displayName}\n${Math.round(state.modelAccuracy)}% +${Math.round(state.damageBonus)}%\n${trainingLine}`);
        this.statusText.setColor('#99f6e4');
    }
}
