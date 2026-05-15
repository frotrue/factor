import { CONFIG } from '../config';
import ModelTrainingLab from '../buildings/ModelTrainingLab';
import type MainScene from '../scenes/MainScene';
import type UIManager from './UIManager';

export default class TrainingLabUI {
    private activeTrainingLab: ModelTrainingLab | null = null;

    constructor(
        private scene: MainScene,
        private uiManager: UIManager
    ) {}

    setup(): void {
        let modal = document.getElementById('training-lab-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'training-lab-modal';
            modal.className = 'glass-panel';
            modal.innerHTML = `
                <div class="training-lab-header">
                    <div>
                        <div class="training-lab-kicker">Target Selection</div>
                        <h2>Model Training Lab</h2>
                    </div>
                    <button id="btn-close-training-lab" class="training-lab-close" type="button">Close</button>
                </div>
                <div id="training-lab-buffer" class="training-lab-buffer"></div>
                <div id="training-target-list" class="training-target-list"></div>
            `;
            document.body.appendChild(modal);
        }

        this.uiManager.guardDomPointer(modal);
        const closeBtn = document.getElementById('btn-close-training-lab');
        this.uiManager.guardDomPointer(closeBtn);
        if (closeBtn) {
            closeBtn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modal!.style.display = 'none';
            };
        }
    }

    open(lab: ModelTrainingLab): void {
        this.activeTrainingLab = lab;
        const modal = document.getElementById('training-lab-modal');
        if (!modal) return;
        modal.style.display = 'block';
        this.render();
    }

    render(): void {
        const lab = this.activeTrainingLab;
        const buffer = document.getElementById('training-lab-buffer');
        const list = document.getElementById('training-target-list');
        if (!lab || !buffer || !list) return;

        const counts = lab.inputBuffer.reduce<Record<string, number>>((acc, item) => {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {});
        const bufferText = ['WEIGHT_UPDATE', 'TRAINED_MODEL', 'INFERENCE_UNIT']
            .map(type => `${CONFIG.ITEMS[type]?.NAME || type}: ${counts[type] || 0}`)
            .join(' | ');
        buffer.textContent = bufferText;

        list.innerHTML = '';
        const targetTypes = ['CLASSIFIER', 'FILTER', 'FIREWALL'];
        targetTypes.forEach(type => {
            const displayName = CONFIG.BUILDINGS[type]?.NAME.split('(')[0].trim() || type;
            const state = this.scene.getDefenseModelState(type);
            let onlineCount = 0;
            this.scene.buildingManager.forEach(building => {
                if (building.type === type) onlineCount++;
            });
            const selected = lab.targetType === type;
            const row = document.createElement('button');
            row.className = `training-target-row ${selected ? 'active' : ''}`;
            row.type = 'button';
            row.innerHTML = `
                <span class="training-target-title">${displayName}</span>
                <span>Confidence ${Math.round(state.modelConfidence)}%</span>
                <span>v${state.modelVersion}</span>
                <span>${onlineCount} online</span>
            `;
            this.uiManager.guardDomPointer(row);
            row.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                lab.setTarget(type);
                this.uiManager.logMessage(`Training: target set to all ${displayName} models.`);
                this.render();
            };
            list.appendChild(row);
        });

        const actions = document.createElement('div');
        actions.className = 'training-actions';
        const trainBtn = document.createElement('button');
        trainBtn.className = 'training-action-btn';
        trainBtn.type = 'button';
        trainBtn.textContent = 'Train Once';
        this.uiManager.guardDomPointer(trainBtn);
        trainBtn.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            if (!lab.trainOnce()) {
                this.uiManager.logMessage('Training: select a target and provide training input first.', true);
            }
            this.render();
        };

        const autoBtn = document.createElement('button');
        autoBtn.className = `training-action-btn ${lab.autoTrain ? 'active' : ''}`;
        autoBtn.type = 'button';
        autoBtn.textContent = lab.autoTrain ? 'Auto Train: ON' : 'Auto Train: OFF';
        this.uiManager.guardDomPointer(autoBtn);
        autoBtn.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            lab.autoTrain = !lab.autoTrain;
            this.render();
        };

        actions.appendChild(trainBtn);
        actions.appendChild(autoBtn);
        list.appendChild(actions);
    }
}
