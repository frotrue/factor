import Phaser from 'phaser';
import AbstractProcessor from './AbstractProcessor';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';
import EventBus from '../managers/EventBus';

export default class NeuralTrainer extends AbstractProcessor {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'NEURAL_TRAINER', 'MODEL_TRAINING', config);
    }

    cycleRecipe(): void {
        if (this.recipe === CONFIG.RECIPES.MODEL_TRAINING) {
            this.recipe = CONFIG.RECIPES.INFERENCE_UNIT_PRODUCTION;
        } else {
            this.recipe = CONFIG.RECIPES.MODEL_TRAINING;
        }
        
        this.inputBuffer = [];
        this.isProcessing = false;
        this.processingTimer = 0;
        this.updateProgressDisplay();

        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', {
            message: `System: Neural Trainer recipe updated to [${this.recipe.OUTPUT}]`
        });
    }
}
