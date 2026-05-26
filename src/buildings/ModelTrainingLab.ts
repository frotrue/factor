import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, IMainScene } from '../types';
import { getBuildingName } from '../i18n';
import EventBus from '../managers/EventBus';

const TRAINING_ITEMS = new Set(['WEIGHT_UPDATE', 'TRAINED_MODEL', 'INFERENCE_UNIT']);
const TRAINING_INTERVAL_BUILDING_TICKS = 4;

export default class ModelTrainingLab extends BaseBuilding {
    targetType: string | null;
    autoTrain: boolean;
    statusText: Phaser.GameObjects.Text;
    private trainingTickCounter: number;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'MODEL_TRAINING_LAB', { ...config, color: CONFIG.BUILDINGS.MODEL_TRAINING_LAB.COLOR });
        const savedTarget = config.customState?.targetType;
        this.targetType = savedTarget && CONFIG.BUILDINGS[savedTarget]?.DEFENSE ? savedTarget : null;
        this.autoTrain = config.customState?.autoTrain ?? true;
        this.trainingTickCounter = config.customState?.trainingTickCounter ?? 0;

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
        if (this.autoTrain) {
            this.trainingTickCounter++;
            if (this.trainingTickCounter >= TRAINING_INTERVAL_BUILDING_TICKS) {
                this.trainingTickCounter = 0;
                this.trainOnce();
            }
        }
        this.refreshStatusText();
    }

    getCustomState(): object {
        return {
            targetType: this.targetType,
            autoTrain: this.autoTrain,
            trainingTickCounter: this.trainingTickCounter
        };
    }

    setTarget(type: string | null): void {
        this.targetType = type;
        this.refreshStatusText();
        EventBus.emit('MODEL_TRAINING_TARGET_SET', { targetType: type });
    }

    getTargetState() {
        if (!this.targetType) return null;
        return (this.scene as IMainScene).getDefenseModelState(this.targetType);
    }

    trainOnce(): boolean {
        if (!this.targetType || this.inputBuffer.length === 0) return false;

        const item = this.inputBuffer.shift()!;
        const scene = this.scene as IMainScene;
        const trained = scene.trainDefenseModelType(this.targetType, item);
        if (!trained) return false;

        const state = scene.getDefenseModelState(this.targetType);
        const displayName = getBuildingName(this.targetType);
        scene.uiManager?.logMessage(
            `Training: ${displayName} model consumed ${item}. Shared confidence ${Math.round(state.modelConfidence)}%.`
        );
        scene.buildingManager.forEach(building => {
            if (building.type === this.targetType) {
                scene.effectsManager?.playModelTrainingPulse(building, item);
            }
        });
        return true;
    }

    refreshStatusText(): void {
        const state = this.getTargetState();
        if (!this.targetType || !state) {
            this.statusText.setText('NO TARGET');
            this.statusText.setColor('#fca5a5');
            return;
        }

        const displayName = getBuildingName(this.targetType);
        this.statusText.setText(`${displayName}\n${Math.round(state.modelConfidence)}% v${state.modelVersion}`);
        this.statusText.setColor('#99f6e4');
    }
}
