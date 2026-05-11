import AbstractProcessor from './AbstractProcessor';
import { CONFIG } from '../config';
export default class NeuralTrainer extends AbstractProcessor {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'NEURAL_TRAINER', 'MODEL_TRAINING', config);
    }
    cycleRecipe() {
        if (this.recipe === CONFIG.RECIPES.MODEL_TRAINING) {
            this.recipe = CONFIG.RECIPES.INFERENCE_UNIT_PRODUCTION;
        }
        else {
            this.recipe = CONFIG.RECIPES.MODEL_TRAINING;
        }
        this.inputBuffer = [];
        this.isProcessing = false;
        this.processingTimer = 0;
        this.updateProgressDisplay();
        const uiManager = this.scene.uiManager;
        if (uiManager) {
            uiManager.logMessage(`System: Neural Trainer recipe updated to [${this.recipe.OUTPUT}]`);
        }
    }
}
//# sourceMappingURL=NeuralTrainer.js.map