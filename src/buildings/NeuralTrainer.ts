import Phaser from 'phaser';
import AbstractProcessor from './AbstractProcessor';
import { CONFIG } from '../config';
import { BuildingOptions, IMainScene } from '../types';

export default class NeuralTrainer extends AbstractProcessor {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'NEURAL_TRAINER', 'TACTICAL_DATA_SYNTHESIS', config);
    }

    finishProcessing(): void {
        (this.scene as IMainScene).researchManager.depositData(
            'tactical',
            CONFIG.RESEARCH_SETTINGS.DATA_OUTPUT.tactical
        );
        this.isProcessing = false;
        this.processingTimer = 0;
    }
}
