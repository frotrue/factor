import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { Recipe, BuildingOptions, IMainScene } from '../types';

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
    processorGraphics: Phaser.GameObjects.Graphics;
    sweepY: number;
    rotationAngle: number;
    processorTween1: Phaser.Tweens.Tween;
    processorTween2: Phaser.Tweens.Tween;

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

        this.processorGraphics = scene.add.graphics();
        this.container.add(this.processorGraphics);
        this.sweepY = -12;
        this.rotationAngle = 0;

        this.processorTween1 = scene.tweens.add({
            targets: this,
            sweepY: 12,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            onUpdate: () => this.drawProcessorVisuals()
        });

        this.processorTween2 = scene.tweens.add({
            targets: this,
            rotationAngle: Math.PI * 2,
            duration: 6000,
            repeat: -1,
            onUpdate: () => this.drawProcessorVisuals()
        });
    }

    drawProcessorVisuals(): void {
        this.processorGraphics.clear();
        if (this.destroyed) return;

        const pulse = 0.55 + 0.25 * Math.sin(this.scene.time.now / 200);

        if (this.type === 'PROCESSOR') {
            // 1. Processor: Sweep laser scan line & 2x2 data grid
            const color = 0xb789ff; // Neon purple

            this.processorGraphics.fillStyle(0xffffff, 0.25);
            this.processorGraphics.fillCircle(-6, -6, 2);
            this.processorGraphics.fillCircle(6, -6, 2);
            this.processorGraphics.fillCircle(-6, 6, 2);
            this.processorGraphics.fillCircle(6, 6, 2);

            this.processorGraphics.lineStyle(3, color, pulse * 0.25);
            this.processorGraphics.lineBetween(-12, this.sweepY, 12, this.sweepY);
            this.processorGraphics.lineStyle(1, 0xffffff, pulse * 0.7);
            this.processorGraphics.lineBetween(-10, this.sweepY, 10, this.sweepY);

        } else if (this.type === 'WEIGHT_TRAINER') {
            // 2. Weight Trainer: Neural Network connections diagram with pulsing nodes
            const color = 0xa970ff;
            this.processorGraphics.lineStyle(1, 0xffffff, 0.25);

            const inNodes = [-8, 0, 8];
            const outNodes = [-6, 6];

            for (const iy of inNodes) {
                for (const oy of outNodes) {
                    this.processorGraphics.lineBetween(-8, iy, 8, oy);
                }
            }

            this.processorGraphics.fillStyle(color, 0.75);
            for (let i = 0; i < inNodes.length; i++) {
                const nodePulse = 0.5 + 0.4 * Math.sin(this.scene.time.now / 150 + i * Math.PI / 3);
                this.processorGraphics.fillCircle(-8, inNodes[i], 2.5 * nodePulse);
            }

            this.processorGraphics.fillStyle(0x63ffb1, 0.75);
            for (let i = 0; i < outNodes.length; i++) {
                const nodePulse = 0.5 + 0.4 * Math.sin(this.scene.time.now / 150 - i * Math.PI / 3);
                this.processorGraphics.fillCircle(8, outNodes[i], 2.5 * nodePulse);
            }

        } else if (this.type === 'NEURAL_TRAINER' || this.type === 'RECYCLER') {
            // 3. Neural Trainer / Recycler: Rotating gear symbols representing recovery/training
            const color = 0x7dd3fc;
            this.processorGraphics.lineStyle(1.5, color, 0.6);

            const r = 8;
            this.processorGraphics.strokeCircle(0, 0, r);

            const teeth = 8;
            for (let i = 0; i < teeth; i++) {
                const angle = this.rotationAngle + (i * Math.PI * 2) / teeth;
                const sx = Math.cos(angle) * r;
                const sy = Math.sin(angle) * r;
                const ex = Math.cos(angle) * (r + 3);
                const ey = Math.sin(angle) * (r + 3);
                this.processorGraphics.lineBetween(sx, sy, ex, ey);
            }
        }
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
            const researchManager = (this.scene as IMainScene).researchManager;
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

        const available = new Map<string, number>();
        this.inputBuffer.forEach(t => available.set(t, (available.get(t) || 0) + 1));

        for (const input of this.recipe.INPUTS) {
            if ((available.get(input.type) || 0) < input.amount) return;
        }

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
        const researchManager = (this.scene as IMainScene).researchManager;
        const multiplier = researchManager?.getEffectValue('PROCESSING_SPEED_MULTIPLIER', 1) ?? 1;
        const requiredTime = Math.max(1, Math.round(this.recipe.TIME * multiplier));
        const progress = this.isProcessing ? this.processingTimer / requiredTime : 0;
        this.progressBar.width = CONFIG.GRID_SIZE * progress;
        this.progressBg.setVisible(this.isProcessing);
        this.progressBar.setVisible(this.isProcessing);
    }

    destroy(): void {
        if (this.processorTween1) this.processorTween1.remove();
        if (this.processorTween2) this.processorTween2.remove();
        super.destroy();
    }
}
