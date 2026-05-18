import type { IMainScene } from '../types';
import {
    applyTutorialProgress,
    completeTutorialStep,
    createTutorialSteps,
    getTutorialProgressIndex,
    TutorialStep,
    TutorialStepId
} from '../utils/tutorialFlow';
import EventBus from './EventBus';

const STORAGE_COMPLETED = 'neural_factory_tutorial_completed';
const STORAGE_STEP = 'neural_factory_tutorial_step';

export default class TutorialManager {
    private scene: IMainScene;
    private panel: HTMLElement;
    private steps: TutorialStep[];
    private completed = false;

    constructor(scene: IMainScene) {
        this.scene = scene;
        this.panel = this.ensurePanel();
        this.steps = createTutorialSteps();

        this.completed = localStorage.getItem(STORAGE_COMPLETED) === 'true';
        const savedStep = Number(localStorage.getItem(STORAGE_STEP) ?? 0);
        this.steps = applyTutorialProgress(this.steps, this.completed, savedStep);

        this.bindEvents();
        this.checkResourceStep();
        this.render();
    }

    isCompleted(): boolean {
        return this.completed;
    }

    getSavedStep(): number {
        return getTutorialProgressIndex(this.steps);
    }

    reset(): void {
        this.completed = false;
        this.steps = createTutorialSteps();
        localStorage.setItem(STORAGE_COMPLETED, 'false');
        localStorage.setItem(STORAGE_STEP, '0');
        this.checkResourceStep();
        this.render();
    }

    completeAll(): void {
        this.completed = true;
        this.steps = applyTutorialProgress(this.steps, true, this.steps.length);
        localStorage.setItem(STORAGE_COMPLETED, 'true');
        localStorage.setItem(STORAGE_STEP, String(this.steps.length));
        this.render();
    }

    loadState(completed?: boolean, stepIndex?: number): void {
        if (typeof completed === 'boolean') {
            this.completed = completed;
        }
        this.steps = applyTutorialProgress(this.steps, this.completed, stepIndex ?? 0);
        this.persistProgress();
        this.render();
    }

    private bindEvents(): void {
        EventBus.on('BUILDING_PLACED', ({ type }) => {
            if (['POWER_NODE', 'POWER_PLANT', 'SOLAR_PANEL'].includes(type)) this.completeStep('POWER');
            if (type === 'DATA_DOWNLOADER') this.completeStep('DATA_SOURCE');
            if (['PROCESSOR', 'WEIGHT_TRAINER', 'NEURAL_TRAINER', 'MODEL_TRAINING_LAB'].includes(type)) {
                this.completeStep('PROCESSING');
            }
            if (['CONVEYOR', 'FAST_LINK', 'ACCESS_POINT'].includes(type)) this.completeStep('CONNECTION');
            if (['CLASSIFIER', 'FILTER', 'FIREWALL'].includes(type)) this.completeStep('DEFENSE');
        }, 'TutorialManager');
        EventBus.on('CABLE_CONNECTED', () => this.completeStep('CONNECTION'), 'TutorialManager');
        EventBus.on('WAVE_STARTED', () => this.completeStep('WAVE'), 'TutorialManager');
        EventBus.on('RESEARCH_OPENED', () => this.completeStep('RESEARCH'), 'TutorialManager');
        EventBus.on('RESEARCH_UNLOCKED', () => this.completeStep('RESEARCH'), 'TutorialManager');
        EventBus.on('TUTORIAL_RESET', () => this.reset(), 'TutorialManager');
    }

    private ensurePanel(): HTMLElement {
        let panel = document.getElementById('tutorial-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'tutorial-panel';
            panel.className = 'glass-panel';
            document.body.appendChild(panel);
        }
        return panel;
    }

    private checkResourceStep(): void {
        const hasResource = Array.from(this.scene.mapManager.getResourceMap().values())
            .some(type => type === 'SILICON' || type === 'ENERGY');
        if (hasResource) this.completeStep('RESOURCE');
    }

    private completeStep(id: TutorialStepId): void {
        if (this.completed) return;
        const step = this.steps.find(item => item.id === id);
        if (!step || step.completed) return;

        this.steps = completeTutorialStep(this.steps, id);
        this.persistProgress();

        if (this.steps.every(item => item.completed)) {
            this.completed = true;
            this.persistProgress();
            this.scene.uiManager.logMessage('Tutorial: core factory loop complete.');
        }
        this.render();
    }

    private persistProgress(): void {
        localStorage.setItem(STORAGE_COMPLETED, String(this.completed));
        localStorage.setItem(STORAGE_STEP, String(this.getSavedStep()));
    }

    private render(): void {
        if (this.completed) {
            this.panel.style.display = 'none';
            return;
        }

        const activeIndex = this.steps.findIndex(step => !step.completed);
        const activeStep = this.steps[activeIndex] ?? this.steps[this.steps.length - 1];
        const completeCount = this.steps.filter(step => step.completed).length;

        this.panel.style.display = 'block';
        this.panel.dataset.activeStep = activeStep.id;
        this.panel.innerHTML = `
            <div class="tutorial-header">
                <div>
                    <div class="tutorial-kicker">Tutorial ${completeCount}/${this.steps.length}</div>
                    <div class="tutorial-title">${activeStep.title}</div>
                </div>
                <button id="btn-skip-tutorial" class="tutorial-skip">Skip</button>
            </div>
            <div class="tutorial-detail">${activeStep.detail}</div>
            <div class="tutorial-steps">
                ${this.steps.map((step, index) => `
                    <div class="tutorial-step ${step.completed ? 'complete' : index === activeIndex ? 'active' : ''}" data-step-id="${step.id}">
                        <span class="tutorial-check">${step.completed ? 'OK' : index + 1}</span>
                        <span>${step.title}</span>
                    </div>
                `).join('')}
            </div>
        `;

        const skip = document.getElementById('btn-skip-tutorial');
        if (skip) skip.onclick = () => this.completeAll();
    }
}

