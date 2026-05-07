import BaseBuilding from './BaseBuilding.js';
import { CONFIG } from '../config.js';

export default class Processor extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'PROCESSOR', { 
            ...config, 
            color: CONFIG.BUILDINGS.PROCESSOR.COLOR 
        });

        this.recipe = CONFIG.RECIPES.LABELLING; // 기본 레시피
        this.processingTimer = 0;
        this.isProcessing = false;

        // 시각적 피드백 (진행 바)
        this.progressBg = scene.add.rectangle(0, -10, CONFIG.GRID_SIZE, 4, 0x000000);
        this.progressBar = scene.add.rectangle(-CONFIG.GRID_SIZE/2, -10, 0, 4, 0x00ff00);
        this.progressBar.setOrigin(0, 0.5);
        this.container.add([this.progressBg, this.progressBar]);
        this.updateProgressDisplay();
    }

    canAcceptItem(type) {
        // 레시피 재료에 해당하는지 + 버퍼 여유가 있는지 확인
        const isIngredient = this.recipe.INPUTS.some(i => i.type === type);
        return isIngredient && this.inputBuffer.length < this.maxBufferSize;
    }

    onTick(tickCount) {
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

    tryStartProcessing() {
        // 출력 버퍼 꽉 참 방지 (Fix 1)
        if (this.outputBuffer.length >= this.maxBufferSize) return;

        // 재료 확인 (간단하게 1종류만 체크)
        const inputType = this.recipe.INPUTS[0].type;
        const inputAmount = this.recipe.INPUTS[0].amount;

        const count = this.inputBuffer.filter(t => t === inputType).length;
        if (count >= inputAmount) {
            // 재료 소모
            for (let i = 0; i < inputAmount; i++) {
                const index = this.inputBuffer.indexOf(inputType);
                this.inputBuffer.splice(index, 1);
            }
            this.isProcessing = true;
            this.processingTimer = 0;
        }
    }

    finishProcessing() {
        this.outputBuffer.push(this.recipe.OUTPUT);
        this.isProcessing = false;
        this.processingTimer = 0;
    }

    updateProgressDisplay() {
        const progress = this.isProcessing ? this.processingTimer / this.recipe.TIME : 0;
        this.progressBar.width = CONFIG.GRID_SIZE * progress;
        this.progressBg.setVisible(this.isProcessing);
        this.progressBar.setVisible(this.isProcessing);
    }
}
