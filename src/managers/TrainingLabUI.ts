import ModelTrainingLab from '../buildings/ModelTrainingLab';
import type MainScene from '../scenes/MainScene';
import type UIManager from './UIManager';
import { CONFIG } from '../config';
import { getBuildingName, textForKey } from '../i18n';
import { getNextTrainingRewardKind, getTrainingDurationTicks } from '../utils/modelTrainingProgress';

export default class TrainingLabUI {
    private activeTrainingLab: ModelTrainingLab | null = null;
    private activeTab: 'DEFENSE' | 'SYSTEM' = 'DEFENSE';

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
            document.body.appendChild(modal);
        }

        this.uiManager.guardDomPointer(modal);
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
        const modal = document.getElementById('training-lab-modal');
        if (!lab || !modal) return;

        const summary = lab.getSummary();
        const gpuUnlocked = this.scene.isGpuUnlocked();
        modal.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'training-lab-header';
        header.innerHTML = `
            <div>
                <div class="training-lab-kicker">${textForKey('trainingLab.kicker')}</div>
                <h2>${textForKey('trainingLab.title')}</h2>
            </div>
        `;

        const closeBtn = document.createElement('button');
        closeBtn.id = 'btn-close-training-lab';
        closeBtn.className = 'training-lab-close';
        closeBtn.type = 'button';
        closeBtn.textContent = textForKey('trainingLab.close');
        this.uiManager.guardDomPointer(closeBtn);
        closeBtn.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            modal.style.display = 'none';
            this.uiManager.restoreCanvasFocus();
        };
        header.appendChild(closeBtn);
        modal.appendChild(header);

        const overview = document.createElement('div');
        overview.className = 'training-lab-buffer';
        const speedPercent = Math.round((1 - summary.speedMultiplier) * 100);
        overview.textContent = gpuUnlocked
            ? textForKey('trainingLab.gpuStatus', {
                active: summary.activeGpuCount,
                adjacent: summary.adjacentGpuCount,
                reduction: speedPercent
            })
            : textForKey('trainingLab.gpuLocked');
        modal.appendChild(overview);

        const list = document.createElement('div');
        list.id = 'training-target-list';
        list.className = 'training-target-list';
        modal.appendChild(list);

        const tabs = document.createElement('div');
        tabs.className = 'training-target-list';
        tabs.style.gridTemplateColumns = '1fr 1fr';
        [
            { id: 'DEFENSE' as const, label: textForKey('trainingLab.tab.defense') },
            { id: 'SYSTEM' as const, label: textForKey('trainingLab.tab.system') }
        ].forEach(tab => {
            const tabBtn = document.createElement('button');
            tabBtn.className = `training-target-row ${this.activeTab === tab.id ? 'active' : ''}`;
            tabBtn.type = 'button';
            tabBtn.textContent = tab.label;
            this.uiManager.guardDomPointer(tabBtn);
            tabBtn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                this.activeTab = tab.id;
                this.render();
            };
            tabs.appendChild(tabBtn);
        });
        modal.insertBefore(tabs, list);

        if (this.activeTab === 'DEFENSE') {
            this.renderDefenseJobs(list, lab);
        } else {
            this.renderSystemJobs(list, lab);
        }

        const footer = document.createElement('div');
        footer.className = 'training-lab-buffer';
        footer.textContent = textForKey('trainingLab.duration', {
            base: CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS,
            current: getTrainingDurationTicks(summary.activeGpuCount, summary.selectedState?.currentRequirement)
        });
        modal.appendChild(footer);
    }

    private renderDefenseJobs(list: HTMLElement, lab: ModelTrainingLab): void {
        CONFIG.MODEL_TRAINING.TARGET_TYPES.forEach(type => {
            const state = this.scene.getDefenseModelState(type);
            const selected = lab.activeJobId === lab.getDefenseJobId(type);
            const trainingPercent = state.isTraining
                ? Math.min(100, Math.round((state.trainingProgressTicks / state.trainingDurationTicks) * 100))
                : 0;
            const dataPercent = Math.min(100, Math.round((state.accumulatedTrainingData / state.currentRequirement) * 100));
            const nextReward = getNextTrainingRewardKind(state) === 'accuracy'
                ? textForKey('trainingLab.nextAccuracy', { amount: CONFIG.MODEL_TRAINING.ACCURACY_GAIN })
                : textForKey('trainingLab.nextDamage', { amount: CONFIG.MODEL_TRAINING.DAMAGE_GAIN });
            const row = document.createElement('button');
            row.className = `training-target-row ${selected ? 'active' : ''}`;
            row.type = 'button';
            row.innerHTML = `
                <span class="training-target-name">${getBuildingName(type)}</span>
                <span class="training-target-stat">${textForKey('trainingLab.accuracy')}: ${Math.round(state.modelAccuracy)}% | ${textForKey('trainingLab.damage')}: +${Math.round(state.damageBonus)}%</span>
                <span class="training-target-effect">${nextReward}</span>
                <span class="training-target-effect">${textForKey('trainingLab.dataProgress', { current: Math.floor(state.accumulatedTrainingData), required: state.currentRequirement })}</span>
                <span class="training-progress-track"><span style="width:${dataPercent}%"></span></span>
                <span class="training-target-effect">${state.isTraining ? textForKey('trainingLab.trainingProgress', { progress: trainingPercent }) : textForKey('trainingLab.waiting')}</span>
                <span class="training-progress-track training-progress-work"><span style="width:${trainingPercent}%"></span></span>
            `;
            this.uiManager.guardDomPointer(row);
            row.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                lab.setTarget(type);
                this.uiManager.logMessage(textForKey('trainingLab.targetSet', { name: getBuildingName(type) }));
                this.render();
            };
            list.appendChild(row);
        });
    }

    private renderSystemJobs(list: HTMLElement, lab: ModelTrainingLab): void {
        Object.values(CONFIG.RESEARCH).forEach(node => {
            const progress = this.scene.researchManager.getJobProgress(node.ID);
            const available = this.scene.researchManager.isJobAvailable(node.ID);
            const selected = lab.activeJobId === node.ID;
            const percent = Math.min(100, Math.round((progress.progress / node.COST) * 100));
            const row = document.createElement('button');
            row.className = `training-target-row ${selected ? 'active' : ''}`;
            row.type = 'button';
            row.disabled = !available && !progress.completed;
            row.innerHTML = `
                <span class="training-target-name">${textForKey(`research.${node.ID}.name`)}</span>
                <span class="training-target-stat">${progress.completed ? textForKey('trainingLab.completed') : textForKey('trainingLab.systemProgress', { current: Math.floor(progress.progress), required: node.COST })}</span>
                <span class="training-target-effect">${textForKey(`research.${node.ID}.description`)}</span>
                <span class="training-progress-track"><span style="width:${percent}%"></span></span>
                <span class="training-target-effect">${available ? textForKey('trainingLab.waiting') : textForKey('research.action.locked')}</span>
            `;
            this.uiManager.guardDomPointer(row);
            row.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                if (!available && !progress.completed) return;
                lab.setSystemJob(node.ID);
                this.uiManager.logMessage(textForKey('trainingLab.jobSet', { name: textForKey(`research.${node.ID}.name`) }));
                this.render();
            };
            list.appendChild(row);
        });
    }
}
