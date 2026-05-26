import Phaser from 'phaser';
import { CONFIG } from '../config';
import type { IMainScene } from '../types';
import {
    applyTutorialProgress,
    completeTutorialStep,
    createTutorialSteps,
    getTutorialProgressIndex,
    TutorialStepId
} from '../utils/tutorialFlow';
import type { TutorialAreaHint, TutorialGhostHint, TutorialStep } from '../utils/tutorialFlow';
import { t } from '../i18n';
import EventBus from './EventBus';
import { getItemColor } from '../visuals/visualTheme';

const STORAGE_COMPLETED = 'gradium_tutorial_completed';
const STORAGE_STEP = 'gradium_tutorial_step';

export default class TutorialManager {
    private scene: IMainScene;
    private panel: HTMLElement;
    private steps: TutorialStep[];
    private completed = false;
    private typingInterval?: number;
    private lastRenderedStepId: string | null = null;
    private guideGraphics: Phaser.GameObjects.Graphics;

    constructor(scene: IMainScene) {
        this.scene = scene;
        this.panel = this.ensurePanel();
        this.steps = createTutorialSteps();

        this.completed = localStorage.getItem(STORAGE_COMPLETED) === 'true';
        const savedStep = Number(localStorage.getItem(STORAGE_STEP) ?? 0);
        this.steps = applyTutorialProgress(this.steps, this.completed, savedStep);

        this.guideGraphics = this.scene.add.graphics();
        this.guideGraphics.setDepth(5);

        this.bindEvents();
        this.checkResourceStep();
        this.render();

        this.scene.events.on('update', this.drawGuideHighlights, this);
        this.scene.events.on('shutdown', this.cleanup, this);
        this.scene.events.on('destroy', this.cleanup, this);
    }

    isCompleted(): boolean {
        return this.completed;
    }

    getSavedStep(): number {
        return getTutorialProgressIndex(this.steps);
    }

    getAllowedBuildings(): string[] | null {
        if (this.completed) return null;
        const activeStep = this.steps.find(step => !step.completed);
        return activeStep?.allowedBuildings ?? null;
    }

    reset(): void {
        this.completed = false;
        this.lastRenderedStepId = null;
        if (this.typingInterval) clearInterval(this.typingInterval);
        this.steps = createTutorialSteps();
        localStorage.setItem(STORAGE_COMPLETED, 'false');
        localStorage.setItem(STORAGE_STEP, '0');
        this.checkResourceStep();
        this.render();
    }

    completeAll(): void {
        this.completed = true;
        if (this.typingInterval) clearInterval(this.typingInterval);
        this.steps = applyTutorialProgress(this.steps, true, this.steps.length);
        localStorage.setItem(STORAGE_COMPLETED, 'true');
        localStorage.setItem(STORAGE_STEP, String(this.steps.length));

        // Sync HUD buttons when tutorial is skipped/completed
        this.scene.uiManager?.createBuildingButtons?.();
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
        EventBus.on('BUILDING_PLACED', ({ type }: { key: string; building: any; type: string }) => {
            if (this.completed) return;

            const activeStep = this.steps.find(step => !step.completed);
            if (!activeStep) return;

            if (activeStep.id === 'POWER' && type === 'POWER_NODE') {
                this.completeStep('POWER');
            } else if (activeStep.id === 'DATA_SOURCE' && (type === 'MINER' || type === 'DATA_DOWNLOADER')) {
                let hasMiner = false;
                let hasDownloader = false;
                this.scene.buildingManager.forEach(building => {
                    if (building.type === 'MINER') hasMiner = true;
                    if (building.type === 'DATA_DOWNLOADER') hasDownloader = true;
                });
                if (hasMiner && hasDownloader) {
                    this.completeStep('DATA_SOURCE');
                }
            } else if (activeStep.id === 'CONNECTION' && type === 'CONVEYOR') {
                this.completeStep('CONNECTION');
            } else if (activeStep.id === 'PROCESSING' && (type === 'PROCESSOR' || type === 'WEIGHT_TRAINER' || type === 'MODEL_TRAINING_LAB')) {
                this.completeStep('PROCESSING');
            }
        }, 'TutorialManager');

        EventBus.on('CABLE_CONNECTED', () => {
            const activeStep = this.steps.find(step => !step.completed);
            if (activeStep?.id === 'CONNECTION') {
                this.completeStep('CONNECTION');
            }
        }, 'TutorialManager');

        EventBus.on('WAVE_STARTED', () => {
            const activeStep = this.steps.find(step => !step.completed);
            if (activeStep?.id === 'DEFENSE') {
                this.completeStep('DEFENSE');
            }
        }, 'TutorialManager');

        EventBus.on('MODEL_TRAINING_TARGET_SET', ({ targetType }) => {
            const activeStep = this.steps.find(step => !step.completed);
            if (activeStep?.id === 'RESEARCH' && targetType) {
                this.completeStep('RESEARCH');
            }
        }, 'TutorialManager');

        EventBus.on('TUTORIAL_RESET', () => this.reset(), 'TutorialManager');
        window.addEventListener('languagechange', () => this.refreshLanguage());
    }

    private ensurePanel(): HTMLElement {
        let panel = document.getElementById('tutorial-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'tutorial-panel';
            panel.className = 'glass-panel tutorial-terminal-panel';
        }
        const rail = document.getElementById('hud-right-rail');
        if (rail && panel.parentElement !== rail) {
            rail.appendChild(panel);
        } else if (!panel.parentElement) {
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
            this.scene.uiManager.logMessage(t('tutorial.completeDetail'));
        }
        this.render();
    }

    private refreshLanguage(): void {
        const completedById = new Set(this.steps.filter(step => step.completed).map(step => step.id));
        this.steps = createTutorialSteps().map(step => ({
            ...step,
            completed: this.completed || completedById.has(step.id)
        }));
        this.lastRenderedStepId = null;
        this.render();
    }

    private persistProgress(): void {
        localStorage.setItem(STORAGE_COMPLETED, String(this.completed));
        localStorage.setItem(STORAGE_STEP, String(this.getSavedStep()));
    }

    private typeText(text: string, elementId: string): void {
        const element = document.getElementById(elementId);
        if (!element) return;

        let index = 0;
        element.innerHTML = '';

        if (this.typingInterval) clearInterval(this.typingInterval);

        this.typingInterval = window.setInterval(() => {
            if (index < text.length) {
                element.innerHTML += text.charAt(index);
                index++;
                // Sound effect on every few typed characters
                if (index % 4 === 0) {
                    this.scene.soundManager?.play?.('shot');
                }
            } else {
                clearInterval(this.typingInterval);
            }
        }, 22);
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

        if (this.lastRenderedStepId !== activeStep.id) {
            this.lastRenderedStepId = activeStep.id;

            this.panel.innerHTML = `
                <div class="tutorial-header">
                    <div>
                        <div class="tutorial-kicker">${t('tutorial.kicker', { current: completeCount, total: this.steps.length })}</div>
                        <div class="tutorial-title">[G.R.A.D.I.U.M. OS AI Assistant]</div>
                    </div>
                    <button id="btn-skip-tutorial" class="tutorial-skip">${t('tutorial.skip')}</button>
                </div>
                <div id="tutorial-typewriter" class="tutorial-detail typing-text" style="font-family:'Share Tech Mono', monospace; font-size: 11px; line-height: 1.4; min-height: 55px; color: #a5f3fc; text-shadow: 0 0 5px rgba(165, 243, 252, 0.4);"></div>
                <div class="tutorial-steps">
                    ${this.steps.map((step, index) => `
                        <div class="tutorial-step ${step.completed ? 'complete' : index === activeIndex ? 'active' : ''}" data-step-id="${step.id}" style="font-family:'Share Tech Mono', monospace; font-size:10px;">
                            <span class="tutorial-check">${step.completed ? t('tutorial.ok') : index + 1}</span>
                            <span>${step.title}</span>
                        </div>
                    `).join('')}
                </div>
            `;

            // Sync UIManager building buttons whenever active step locks change
            this.scene.uiManager?.createBuildingButtons?.();

            // Run retro console terminal typing simulation
            this.typeText(activeStep.detail, 'tutorial-typewriter');
        } else {
            const stepElements = this.panel.querySelectorAll('.tutorial-step');
            stepElements.forEach((el, index) => {
                const step = this.steps[index];
                el.className = `tutorial-step ${step.completed ? 'complete' : index === activeIndex ? 'active' : ''}`;
                const checkEl = el.querySelector('.tutorial-check');
                if (checkEl) checkEl.textContent = step.completed ? t('tutorial.ok') : String(index + 1);
            });
            const kickerEl = this.panel.querySelector('.tutorial-kicker');
            if (kickerEl) kickerEl.textContent = t('tutorial.kicker', { current: completeCount, total: this.steps.length });
        }

        const skip = document.getElementById('btn-skip-tutorial');
        if (skip) skip.onclick = () => this.completeAll();
    }

    private drawGuideHighlights(): void {
        this.guideGraphics.clear();
        if (this.completed) return;

        const activeStep = this.steps.find(step => !step.completed);
        if (!activeStep) return;

        const time = this.scene.time.now;
        const pulse = 0.5 + 0.2 * Math.sin(time / 200);
        const glowPulse = 0.2 + 0.1 * Math.sin(time / 200);

        const hints = activeStep.visualHints;
        if (!hints) return;

        const isExplicit = hints.mode === 'explicit';
        const ghostAlpha = isExplicit ? pulse : pulse * 0.72;
        const glowAlpha = isExplicit ? glowPulse : glowPulse * 0.68;

        hints.areas?.forEach(area => this.drawAreaHint(area.x, area.y, area.radius, area.color ?? 0x59e0ff, area.kind, pulse, time));
        hints.ghosts?.forEach(ghost => this.drawGhostHint(ghost, ghostAlpha, glowAlpha));
        hints.flows?.forEach(flow => {
            const color = flow.color ?? (flow.itemType ? getItemColor(flow.itemType) : 0x52f7ff);
            this.drawNeonLine(flow.from.x, flow.from.y, flow.to.x, flow.to.y, color, pulse, time, flow.dotted ?? false);
        });
    }

    private drawGhostHint(ghost: TutorialGhostHint, pulse: number, glowPulse: number): void {
        const colorValid = ghost.exact ? 0x64ff9f : 0x59e0ff;
        const colorGlow = ghost.type === 'MODEL_LAB' ? 0x64ffcf : 0x59e0ff;
        const width = ghost.width ?? 1;
        const height = ghost.height ?? 1;

        this.drawNeonBox(ghost.x, ghost.y, width, height, colorValid, colorGlow, pulse, glowPulse);
        this.drawSymbol(ghost.x, ghost.y, ghost);
    }

    private drawNeonBox(x: number, y: number, w: number, h: number, color: number, glowColor: number, pulse: number, glowPulse: number): void {
        const sizeX = w * CONFIG.GRID_SIZE;
        const sizeY = h * CONFIG.GRID_SIZE;

        this.guideGraphics.lineStyle(6, glowColor, glowPulse);
        this.guideGraphics.strokeRect(x, y, sizeX, sizeY);

        this.guideGraphics.fillStyle(glowColor, glowPulse * 0.35);
        this.guideGraphics.fillRect(x, y, sizeX, sizeY);

        this.guideGraphics.lineStyle(2, color, pulse);
        this.guideGraphics.strokeRect(x, y, sizeX, sizeY);
    }

    private drawSymbol(x: number, y: number, ghost: TutorialGhostHint): void {
        const cx = x + (ghost.width ?? 1) * CONFIG.GRID_SIZE / 2;
        const cy = y + (ghost.height ?? 1) * CONFIG.GRID_SIZE / 2;
        const type = ghost.type;

        this.guideGraphics.lineStyle(2, 0xffffff, 0.4);

        if (type === 'POWER') {
            // Lightning symbol
            this.guideGraphics.beginPath();
            this.guideGraphics.moveTo(cx + 2, cy - 8);
            this.guideGraphics.lineTo(cx - 4, cy + 2);
            this.guideGraphics.lineTo(cx + 1, cy + 2);
            this.guideGraphics.lineTo(cx - 2, cy + 8);
            this.guideGraphics.lineTo(cx + 4, cy - 2);
            this.guideGraphics.lineTo(cx - 1, cy - 2);
            this.guideGraphics.closePath();
            this.guideGraphics.strokePath();
        } else if (type === 'MINER') {
            // Diamond resource shape
            this.guideGraphics.beginPath();
            this.guideGraphics.moveTo(cx, cy - 7);
            this.guideGraphics.lineTo(cx + 7, cy);
            this.guideGraphics.lineTo(cx, cy + 7);
            this.guideGraphics.lineTo(cx - 7, cy);
            this.guideGraphics.closePath();
            this.guideGraphics.strokePath();
        } else if (type === 'DOWNLOAD') {
            this.guideGraphics.beginPath();
            this.guideGraphics.moveTo(cx, cy + 6);
            this.guideGraphics.lineTo(cx, cy - 6);
            this.guideGraphics.strokePath();

            this.guideGraphics.beginPath();
            this.guideGraphics.moveTo(cx - 4, cy + 2);
            this.guideGraphics.lineTo(cx, cy + 6);
            this.guideGraphics.lineTo(cx + 4, cy + 2);
            this.guideGraphics.strokePath();
        } else if (type === 'PROCESSOR') {
            this.guideGraphics.strokeRect(cx - 5, cy - 5, 10, 10);

            this.guideGraphics.lineStyle(1, 0xffffff, 0.35);
            this.guideGraphics.lineBetween(cx - 7, cy - 3, cx - 5, cy - 3);
            this.guideGraphics.lineBetween(cx - 7, cy + 3, cx - 5, cy + 3);
            this.guideGraphics.lineBetween(cx + 5, cy - 3, cx + 7, cy - 3);
            this.guideGraphics.lineBetween(cx + 5, cy + 3, cx + 7, cy + 3);
            this.guideGraphics.lineBetween(cx - 3, cy - 7, cx - 3, cy - 5);
            this.guideGraphics.lineBetween(cx + 3, cy - 7, cx + 3, cy - 5);
            this.guideGraphics.lineBetween(cx - 3, cy + 5, cx - 3, cy + 7);
            this.guideGraphics.lineBetween(cx + 3, cy + 5, cx + 3, cy + 7);
        } else if (type === 'TRAINER') {
            this.guideGraphics.lineStyle(1, 0xffffff, 0.32);
            [-7, 0, 7].forEach(iy => {
                [-5, 5].forEach(oy => this.guideGraphics.lineBetween(cx - 8, cy + iy, cx + 8, cy + oy));
            });
            this.guideGraphics.fillStyle(0xa970ff, 0.78);
            [-7, 0, 7].forEach(iy => this.guideGraphics.fillCircle(cx - 8, cy + iy, 2.5));
            [-5, 5].forEach(oy => this.guideGraphics.fillCircle(cx + 8, cy + oy, 2.5));
        } else if (type === 'DEFENSE') {
            this.guideGraphics.strokeCircle(cx, cy, 6);
            this.guideGraphics.lineStyle(1, 0xffffff, 0.35);
            this.guideGraphics.lineBetween(cx - 9, cy, cx + 9, cy);
            this.guideGraphics.lineBetween(cx, cy - 9, cx, cy + 9);
        } else if (type === 'STORAGE') {
            this.guideGraphics.strokeRect(cx - 8, cy - 8, 16, 16);
            this.guideGraphics.lineStyle(1, 0xffffff, 0.35);
            this.guideGraphics.lineBetween(cx, cy - 8, cx, cy + 8);
            this.guideGraphics.lineBetween(cx - 8, cy, cx + 8, cy);
        } else if (type === 'MODEL_LAB') {
            this.guideGraphics.strokeCircle(cx, cy, 12);
            this.guideGraphics.lineStyle(1.5, 0x64ffcf, 0.72);
            this.guideGraphics.strokeCircle(cx, cy, 5);
            this.guideGraphics.lineStyle(1, 0xffffff, 0.38);
            this.guideGraphics.lineBetween(cx - 13, cy, cx + 13, cy);
            this.guideGraphics.lineBetween(cx, cy - 13, cx, cy + 13);
        }
    }

    private drawAreaHint(x: number, y: number, radius: number, color: number, kind: TutorialAreaHint['kind'], pulse: number, time: number): void {
        const alpha = kind === 'resource' ? 0.18 : 0.12;
        const wave = 0.85 + 0.08 * Math.sin(time / 260);

        this.guideGraphics.lineStyle(kind === 'route' ? 3 : 2, color, alpha + pulse * 0.12);
        this.guideGraphics.strokeCircle(x, y, radius * wave);

        if (kind === 'model-growth') {
            this.guideGraphics.lineStyle(1, 0xffffff, 0.35);
            this.guideGraphics.strokeCircle(x, y, radius * 0.45);
        }
    }

    private drawNeonLine(fromX: number, fromY: number, toX: number, toY: number, color: number, pulse: number, time: number, dotted = false): void {
        this.guideGraphics.lineStyle(5, color, 0.15);
        this.guideGraphics.lineBetween(fromX, fromY, toX, toY);

        if (!dotted) {
            this.guideGraphics.lineStyle(1, color, 0.45);
            this.guideGraphics.lineBetween(fromX, fromY, toX, toY);
        }

        const dx = toX - fromX;
        const dy = toY - fromY;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return;

        const numDots = Math.floor(length / 16);
        const speed = 0.05;
        const offsetRatio = ((time * speed) % 16) / 16;

        this.guideGraphics.fillStyle(0xffffff, pulse);
        for (let i = 0; i <= numDots; i++) {
            const ratio = (i + offsetRatio) / (numDots + 1);
            if (ratio > 1) continue;
            const px = fromX + dx * ratio;
            const py = fromY + dy * ratio;
            this.guideGraphics.fillCircle(px, py, 2.5);
        }
    }

    private cleanup(): void {
        this.scene.events.off('update', this.drawGuideHighlights, this);
        if (this.guideGraphics) {
            this.guideGraphics.destroy();
        }
    }
}
