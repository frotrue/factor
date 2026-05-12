import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { Recipe, BuildingOptions } from '../types';

/**
 * Processor/WeightTrainer/NeuralTrainer의 공통 기반 클래스.
 * 레시피 기반 가공 로직(입력 소비 → 타이머 → 출력 생산)을 통합 관리합니다.
 */
export default class AbstractProcessor extends BaseBuilding {
    recipe: Recipe;
    processingTimer: number;
    isProcessing: boolean;
    progressBg: Phaser.GameObjects.Rectangle;
    progressBar: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number, type: string, recipeKey: string, config: BuildingOptions = {}) {
        super(scene, x, y, type, { ...config, color: CONFIG.BUILDINGS[type].COLOR });

        this.recipe = CONFIG.RECIPES[recipeKey];
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
        if (this.isInfected(_tickCount) && _tickCount % 2 !== 0) {
            this.updateProgressDisplay();
            return;
        }

        if (this.isProcessing) {
            this.processingTimer++;
            const researchManager = (this.scene as any).researchManager;
            const multiplier = researchManager?.getEffectValue('PROCESSING_SPEED_MULTIPLIER', 1) ?? 1;
            const requiredTime = Math.max(1, Math.round(this.recipe.TIME * multiplier));
            if (this.processingTimer >= requiredTime) {
                this.finishProcessing();
            }
        } else {
            this.tryStartProcessing();
        }
        this.updateProgressDisplay();
    }

    tryStartProcessing(): void {
        if (this.outputBuffer.length >= this.maxBufferSize) return;

        // Check all recipe inputs are satisfied
        const available = new Map<string, number>();
        this.inputBuffer.forEach(t => available.set(t, (available.get(t) || 0) + 1));

        for (const input of this.recipe.INPUTS) {
            if ((available.get(input.type) || 0) < input.amount) return;
        }

        // Consume inputs
        for (const input of this.recipe.INPUTS) {
            for (let i = 0; i < input.amount; i++) {
                const index = this.inputBuffer.indexOf(input.type);
                this.inputBuffer.splice(index, 1);
            }
        }

        this.isProcessing = true;
        this.processingTimer = 0;
    }

    finishProcessing(): void {
        this.outputBuffer.push(this.recipe.OUTPUT);
        this.isProcessing = false;
        this.processingTimer = 0;
    }

    updateProgressDisplay(): void {
        const researchManager = (this.scene as any).researchManager;
        const multiplier = researchManager?.getEffectValue('PROCESSING_SPEED_MULTIPLIER', 1) ?? 1;
        const requiredTime = Math.max(1, Math.round(this.recipe.TIME * multiplier));
        const progress = this.isProcessing ? this.processingTimer / requiredTime : 0;
        this.progressBar.width = CONFIG.GRID_SIZE * progress;
        this.progressBg.setVisible(this.isProcessing);
        this.progressBar.setVisible(this.isProcessing);
    }
}
