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
import {
    bindLegacyTutorialSkip,
    ensureLegacyTutorialPanel,
    hideLegacyTutorialPanel,
    renderLegacyTutorialPanel,
    showLegacyTutorialPanel,
    startLegacyTutorialTypewriter,
    updateLegacyTutorialProgress
} from '../ui/legacyTutorialPanel';
import {
    createTutorialPanelDisplayPayload,
    type TutorialPanelDisplayPayload
} from '../ui/tutorialPanelDisplay';

const STORAGE_COMPLETED = 'gradium_tutorial_completed';
const STORAGE_STEP = 'gradium_tutorial_step';
export default class TutorialManager {
    private scene: IMainScene;
    private panel: HTMLElement;
    private steps: TutorialStep[];
    private completed = false;
    private typingInterval?: number;
    private lastRenderedStepId: string | null = null;
    private activeStepStartedAt = 0;
    private cableConnectedForStep = false;
    private waveEndedForStep = false;
    private guideGraphics: Phaser.GameObjects.Graphics;
    private languageChangeHandler = () => this.refreshLanguage();

    constructor(scene: IMainScene) {
        this.scene = scene;
        this.scene.tutorialManager = this;
        this.panel = this.ensurePanel();
        this.steps = createTutorialSteps();

        this.completed = localStorage.getItem(STORAGE_COMPLETED) === 'true';
        const savedStep = Number(localStorage.getItem(STORAGE_STEP) ?? 0);
        this.steps = applyTutorialProgress(this.steps, this.completed, savedStep);

        this.guideGraphics = this.scene.add.graphics();
        this.guideGraphics.setDepth(5);

        this.bindEvents();
        this.render();

        this.scene.events.on('update', this.checkActiveStepCompletion, this);
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
        this.activeStepStartedAt = 0;
        this.cableConnectedForStep = false;
        this.waveEndedForStep = false;
        if (this.typingInterval) clearInterval(this.typingInterval);
        this.steps = createTutorialSteps();
        localStorage.setItem(STORAGE_COMPLETED, 'false');
        localStorage.setItem(STORAGE_STEP, '0');
        this.render();
    }

    completeAll(options: { transitionToCampaign?: boolean } = {}): void {
        const wasCompleted = this.completed;
        this.completed = true;
        if (this.typingInterval) clearInterval(this.typingInterval);
        this.steps = applyTutorialProgress(this.steps, true, this.steps.length);
        localStorage.setItem(STORAGE_COMPLETED, 'true');
        localStorage.setItem(STORAGE_STEP, String(this.steps.length));
        if (!wasCompleted && options.transitionToCampaign) {
            this.transitionToCampaign();
        }

        // Sync build controls when tutorial is skipped/completed.
        this.requestBuildConsoleRefresh();
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
            const activeStep = this.getActiveStep();
            if (activeStep?.completion.kind === 'place-building' && activeStep.completion.buildingType === type) {
                this.completeStep(activeStep.id);
            }
        }, 'TutorialManager');

        EventBus.on('CABLE_CONNECTED', () => {
            const activeStep = this.getActiveStep();
            if (activeStep?.completion.kind === 'connect-cable') {
                this.cableConnectedForStep = true;
                this.completeStep(activeStep.id);
            }
        }, 'TutorialManager');

        EventBus.on('WAVE_ENDED', () => {
            const activeStep = this.getActiveStep();
            if (activeStep?.completion.kind === 'wave-ended') {
                this.waveEndedForStep = true;
                this.completeStep(activeStep.id);
            }
        }, 'TutorialManager');

        EventBus.on('TUTORIAL_RESET', () => this.reset(), 'TutorialManager');
        EventBus.on('TUTORIAL_SKIP_REQUESTED', () => this.completeAll({ transitionToCampaign: true }), 'TutorialManager');
        window.addEventListener('languagechange', this.languageChangeHandler);
    }

    private ensurePanel(): HTMLElement {
        return ensureLegacyTutorialPanel();
    }

    private getActiveStep(): TutorialStep | undefined {
        if (this.completed) return undefined;
        return this.steps.find(step => !step.completed);
    }

    private checkActiveStepCompletion(): void {
        const activeStep = this.getActiveStep();
        if (!activeStep) return;

        const completion = activeStep.completion;
        if (completion.kind === 'auto') {
            if (this.scene.time.now - this.activeStepStartedAt >= completion.delayMs) {
                this.completeStep(activeStep.id);
            }
        } else if (completion.kind === 'produce-item') {
            if (this.hasBuildingItem(completion.buildingType, completion.itemType)) {
                this.completeStep(activeStep.id);
            }
        } else if (completion.kind === 'power-online') {
            if (this.hasPoweredBuilding(completion.buildingType)) {
                this.completeStep(activeStep.id);
            }
        } else if (completion.kind === 'connect-cable' && this.cableConnectedForStep) {
            this.completeStep(activeStep.id);
        } else if (completion.kind === 'wave-ended' && this.waveEndedForStep) {
            this.completeStep(activeStep.id);
        }
    }

    private hasBuildingItem(buildingType: string, itemType: string): boolean {
        let found = false;
        this.scene.buildingManager.forEach(building => {
            if (found || building.type !== buildingType) return;
            found = building.inputBuffer.includes(itemType) || building.outputBuffer.includes(itemType);
        });
        return found;
    }

    private hasPoweredBuilding(buildingType: string): boolean {
        let found = false;
        this.scene.powerManager?.updatePowerGrid?.();
        this.scene.buildingManager.forEach(building => {
            if (found || building.type !== buildingType) return;
            found = building.hasPower === true;
        });
        return found;
    }

    private completeStep(id: TutorialStepId): void {
        if (this.completed) return;
        const step = this.steps.find(item => item.id === id);
        if (!step || step.completed) return;

        this.steps = completeTutorialStep(this.steps, id);
        this.persistProgress();
        this.logMessage(t('tutorial.stepComplete' as any, { title: step.title }));

        if (this.steps.every(item => item.completed)) {
            this.completed = true;
            this.persistProgress();
            this.logMessage(t('tutorial.completeDetail'));
            this.requestBuildConsoleRefresh();
            this.transitionToCampaign();
        }
        this.render();
    }

    private logMessage(message: string, isAlert: boolean = false): void {
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', { message, isAlert });
    }

    private requestBuildConsoleRefresh(): void {
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');
    }

    private transitionToCampaign(): void {
        window.setTimeout(() => {
            this.scene.scene.start('MainScene', {
                mode: 'campaign',
                difficulty: this.scene.difficultyId
            });
        }, 500);
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
        if (elementId !== 'tutorial-typewriter') return;
        this.typingInterval = startLegacyTutorialTypewriter(
            text,
            this.typingInterval,
            () => this.scene.soundManager?.play?.('shot')
        );
    }

    private render(): void {
        if (this.completed) {
            const display = createTutorialPanelDisplayPayload({
                activeIndex: 0,
                activeStep: null,
                completeCount: 0,
                completed: this.completed,
                steps: this.steps
            });
            hideLegacyTutorialPanel(this.panel);
            this.publishPanelSnapshot(display);
            return;
        }

        const activeIndex = this.steps.findIndex(step => !step.completed);
        const activeStep = this.steps[activeIndex] ?? this.steps[this.steps.length - 1];
        const completeCount = this.steps.filter(step => step.completed).length;
        const display = createTutorialPanelDisplayPayload({
            activeIndex,
            activeStep,
            completeCount,
            completed: this.completed,
            steps: this.steps
        });
        this.publishPanelSnapshot(display);

        showLegacyTutorialPanel(this.panel, display.legacyPanel.activeStepId);

        if (this.lastRenderedStepId !== activeStep.id) {
            this.lastRenderedStepId = activeStep.id;
            this.activeStepStartedAt = this.scene.time.now;
            this.cableConnectedForStep = false;
            this.waveEndedForStep = false;

            renderLegacyTutorialPanel(
                this.panel,
                display.legacyPanel.steps,
                display.legacyPanel.activeIndex,
                display.legacyPanel.completeCount,
                () => this.completeAll({ transitionToCampaign: true })
            );

            // Sync build controls whenever active step locks change.
            this.requestBuildConsoleRefresh();

            // Run retro console terminal typing simulation
            this.typeText(display.legacyPanel.detail, 'tutorial-typewriter');
        } else {
            updateLegacyTutorialProgress(
                this.panel,
                display.legacyPanel.steps,
                display.legacyPanel.activeIndex,
                display.legacyPanel.completeCount
            );
        }

        bindLegacyTutorialSkip(() => this.completeAll({ transitionToCampaign: true }));
    }

    private publishPanelSnapshot(display: TutorialPanelDisplayPayload): void {
        EventBus.emit('TUTORIAL_PANEL_UPDATED', display.snapshot);
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
        const colorGlow = ghost.type === 'RESEARCH_CENTER' ? 0x64ffcf : 0x59e0ff;
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
        } else if (type === 'RESEARCH_CENTER') {
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
        this.scene.events.off('update', this.checkActiveStepCompletion, this);
        this.scene.events.off('update', this.drawGuideHighlights, this);
        window.removeEventListener('languagechange', this.languageChangeHandler);
        if (this.guideGraphics) {
            this.guideGraphics.destroy();
        }
    }
}
