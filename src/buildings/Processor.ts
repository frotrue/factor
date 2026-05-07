import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { Recipe, BuildingOptions } from '../types';

export default class Processor extends BaseBuilding {
    recipe: Recipe;
    processingTimer: number;
    isProcessing: boolean;
    progressBg: Phaser.GameObjects.Rectangle;
    progressBar: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'PROCESSOR', { ...config, color: CONFIG.BUILDINGS.PROCESSOR.COLOR });

        this.recipe = CONFIG.RECIPES.LABELLING;
        this.processingTimer = 0;
        this.isProcessing = false;

        this.progressBg = scene.add.rectangle(0, -10, CONFIG.GRID_SIZE, 4, 0x000000);
        this.progressBar = scene.add.rectangle(-CONFIG.GRID_SIZE / 2, -10, 0, 4, 0x00ff00);
        this.progressBar.setOrigin(0, 0.5);
        this.container.add([this.progressBg, this.progressBar]);
        this.updateProgressDisplay();
    }

    canAcceptItem(type: string): boolean {
        const isIngredient = this.recipe.INPUTS.some(i => i.type === type);
        return isIngredient && this.inputBuffer.length < this.maxBufferSize;
    }

    onTick(_tickCount: number): void {
        if (this.isProcessing) {
            this.processingTimer++;
            if (this.processingTimer >= this.recipe.TIME) {
                this.finishProcessing();
            }
        } else {
            this.tryStartProcessing();
        }
        this.updateProgressDisplay();
    }

    tryStartProcessing(): void {
        if (this.outputBuffer.length >= this.maxBufferSize) return;

        const inputType = this.recipe.INPUTS[0].type;
        const inputAmount = this.recipe.INPUTS[0].amount;

        const count = this.inputBuffer.filter(t => t === inputType).length;
        if (count >= inputAmount) {
            for (let i = 0; i < inputAmount; i++) {
                const index = this.inputBuffer.indexOf(inputType);
                this.inputBuffer.splice(index, 1);
            }
            this.isProcessing = true;
            this.processingTimer = 0;
        }
    }

    finishProcessing(): void {
        this.outputBuffer.push(this.recipe.OUTPUT);
        this.isProcessing = false;
        this.processingTimer = 0;
    }

    updateProgressDisplay(): void {
        const progress = this.isProcessing ? this.processingTimer / this.recipe.TIME : 0;
        this.progressBar.width = CONFIG.GRID_SIZE * progress;
        this.progressBg.setVisible(this.isProcessing);
        this.progressBar.setVisible(this.isProcessing);
    }
}
