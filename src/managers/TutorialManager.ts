import EventBus from './EventBus';
import type MainScene from '../scenes/MainScene';

type TutorialStepId = 'RESOURCE' | 'PRODUCTION' | 'CONNECTION' | 'DEFENSE' | 'WAVE' | 'RESEARCH';

interface TutorialStep {
    id: TutorialStepId;
    title: string;
    detail: string;
    completed: boolean;
}

export default class TutorialManager {
    private scene: MainScene;
    private panel: HTMLElement;
    private steps: TutorialStep[];
    private completed = false;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.panel = this.ensurePanel();
        this.steps = [
            { id: 'RESOURCE', title: '자원 노드 확인', detail: '회색 Silicon 또는 노란 Energy 자원 노드를 확인하세요.', completed: false },
            { id: 'PRODUCTION', title: '데이터 생산 시작', detail: 'Data Downloader를 배치해 Signal Packet 다운로드를 시작하세요.', completed: false },
            { id: 'CONNECTION', title: '물류 연결', detail: '케이블을 연결하거나 컨베이어를 배치해 흐름을 만드세요.', completed: false },
            { id: 'DEFENSE', title: '방어 준비', detail: 'Classifier, Anomaly Detection Engine, Firewall 중 하나를 배치하세요.', completed: false },
            { id: 'WAVE', title: '첫 웨이브 대응', detail: '웨이브가 시작되면 코어를 지키세요.', completed: false },
            { id: 'RESEARCH', title: '연구 확인', detail: 'Research 창을 열거나 첫 연구를 해금하세요.', completed: false }
        ];

        this.completed = localStorage.getItem('neural_factory_tutorial_completed') === 'true';
        const savedStep = Number(localStorage.getItem('neural_factory_tutorial_step') ?? 0);
        this.steps.forEach((step, index) => {
            step.completed = index < savedStep || this.completed;
        });

        this.bindEvents();
        this.checkResourceStep();
        this.render();
    }

    isCompleted(): boolean {
        return this.completed;
    }

    getSavedStep(): number {
        return this.steps.findIndex(step => !step.completed);
    }

    reset(): void {
        this.completed = false;
        this.steps.forEach(step => step.completed = false);
        localStorage.setItem('neural_factory_tutorial_completed', 'false');
        localStorage.setItem('neural_factory_tutorial_step', '0');
        this.checkResourceStep();
        this.render();
    }

    completeAll(): void {
        this.completed = true;
        this.steps.forEach(step => step.completed = true);
        localStorage.setItem('neural_factory_tutorial_completed', 'true');
        localStorage.setItem('neural_factory_tutorial_step', String(this.steps.length));
        this.render();
    }

    loadState(completed?: boolean, stepIndex?: number): void {
        if (typeof completed === 'boolean') {
            this.completed = completed;
        }
        const count = Math.max(0, Math.min(this.steps.length, stepIndex ?? 0));
        this.steps.forEach((step, index) => {
            step.completed = this.completed || index < count;
        });
        this.render();
    }

    private bindEvents(): void {
        EventBus.on('BUILDING_PLACED', ({ type }) => {
            if (type === 'DATA_DOWNLOADER') this.completeStep('PRODUCTION');
            if (type === 'CONVEYOR' || type === 'FAST_LINK') this.completeStep('CONNECTION');
            if (['CLASSIFIER', 'FILTER', 'FIREWALL'].includes(type)) this.completeStep('DEFENSE');
        });
        EventBus.on('CABLE_CONNECTED', () => this.completeStep('CONNECTION'));
        EventBus.on('WAVE_STARTED', () => this.completeStep('WAVE'));
        EventBus.on('RESEARCH_OPENED', () => this.completeStep('RESEARCH'));
        EventBus.on('RESEARCH_UNLOCKED', () => this.completeStep('RESEARCH'));
        EventBus.on('TUTORIAL_RESET', () => this.reset());
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
        const step = this.steps.find(s => s.id === id);
        if (!step || step.completed) return;
        step.completed = true;

        const next = this.getSavedStep();
        localStorage.setItem('neural_factory_tutorial_step', String(next < 0 ? this.steps.length : next));

        if (this.steps.every(s => s.completed)) {
            this.completed = true;
            localStorage.setItem('neural_factory_tutorial_completed', 'true');
            this.scene.uiManager.logMessage('Tutorial: 기본 루프를 완료했습니다.');
        }
        this.render();
    }

    private render(): void {
        if (this.completed) {
            this.panel.style.display = 'none';
            return;
        }

        const activeIndex = this.steps.findIndex(step => !step.completed);
        const activeStep = this.steps[activeIndex] ?? this.steps[this.steps.length - 1];

        this.panel.style.display = 'block';
        this.panel.innerHTML = `
            <div class="tutorial-header">
                <div>
                    <div class="tutorial-kicker">Tutorial</div>
                    <div class="tutorial-title">${activeStep.title}</div>
                </div>
                <button id="btn-skip-tutorial" class="tutorial-skip">Skip</button>
            </div>
            <div class="tutorial-detail">${activeStep.detail}</div>
            <div class="tutorial-steps">
                ${this.steps.map((step, index) => `
                    <div class="tutorial-step ${step.completed ? 'complete' : index === activeIndex ? 'active' : ''}">
                        <span class="tutorial-check">${step.completed ? '✓' : index + 1}</span>
                        <span>${step.title}</span>
                    </div>
                `).join('')}
            </div>
        `;

        const skip = document.getElementById('btn-skip-tutorial');
        if (skip) skip.onclick = () => this.completeAll();
    }
}
