import { t } from '../i18n';
import type { TutorialStep } from '../utils/tutorialFlow';

export function ensureLegacyTutorialPanel(): HTMLElement {
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

export function hideLegacyTutorialPanel(panel: HTMLElement): void {
    syncLegacyTutorialPanelControls(panel, false);
    panel.style.display = 'none';
}

export function showLegacyTutorialPanel(panel: HTMLElement, activeStepId: string): void {
    panel.style.display = 'block';
    panel.dataset.activeStep = activeStepId;
    panel.dataset.preactShadow = 'true';
    panel.setAttribute('aria-hidden', 'true');
    syncLegacyTutorialPanelControls(panel, true);
}

function syncShadowTabIndex(element: HTMLElement, shadow: boolean): void {
    if (shadow) {
        if (element.dataset.preactShadowTabindex === undefined) {
            element.dataset.preactShadowTabindex = element.getAttribute('tabindex') ?? '';
        }
        element.setAttribute('tabindex', '-1');
        return;
    }

    const previous = element.dataset.preactShadowTabindex;
    if (previous === undefined) return;
    if (previous) {
        element.setAttribute('tabindex', previous);
    } else {
        element.removeAttribute('tabindex');
    }
    delete element.dataset.preactShadowTabindex;
}

export function syncLegacyTutorialPanelControls(panel: HTMLElement | null, shadow: boolean): void {
    if (!panel) return;
    panel.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'button,input,select,textarea'
    ).forEach(control => {
        if (shadow && control.dataset.preactShadowDisabled === undefined) {
            control.dataset.preactShadowDisabled = control.disabled ? 'true' : 'false';
        }
        if (!shadow && control.dataset.preactShadowDisabled !== undefined) {
            control.disabled = control.dataset.preactShadowDisabled === 'true';
            delete control.dataset.preactShadowDisabled;
        } else if (shadow) {
            control.disabled = true;
        }
        syncShadowTabIndex(control, shadow);
    });
}

export function renderLegacyTutorialPanel(
    panel: HTMLElement,
    steps: TutorialStep[],
    activeIndex: number,
    completeCount: number,
    onSkip: () => void
): void {
    const header = document.createElement('div');
    header.className = 'tutorial-header';

    const headingGroup = document.createElement('div');
    const kicker = document.createElement('div');
    kicker.className = 'tutorial-kicker';
    kicker.textContent = t('tutorial.kicker', { current: completeCount, total: steps.length });
    const title = document.createElement('div');
    title.className = 'tutorial-title';
    title.textContent = '[G.R.A.D.I.U.M. OS AI Assistant]';
    headingGroup.replaceChildren(kicker, title);

    const skip = document.createElement('button');
    skip.id = 'btn-skip-tutorial';
    skip.className = 'tutorial-skip';
    skip.type = 'button';
    skip.textContent = t('tutorial.skip');
    header.replaceChildren(headingGroup, skip);

    const detail = document.createElement('div');
    detail.id = 'tutorial-typewriter';
    detail.className = 'tutorial-detail typing-text';
    detail.style.fontFamily = "'Share Tech Mono', monospace";
    detail.style.fontSize = '11px';
    detail.style.lineHeight = '1.4';
    detail.style.minHeight = '55px';
    detail.style.color = '#a5f3fc';
    detail.style.textShadow = '0 0 5px rgba(165, 243, 252, 0.4)';

    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'tutorial-steps';
    steps.forEach((step, index) => {
        const stepEl = document.createElement('div');
        stepEl.className = `tutorial-step ${step.completed ? 'complete' : index === activeIndex ? 'active' : ''}`;
        stepEl.dataset.stepId = step.id;
        stepEl.style.fontFamily = "'Share Tech Mono', monospace";
        stepEl.style.fontSize = '10px';

        const check = document.createElement('span');
        check.className = 'tutorial-check';
        check.textContent = step.completed ? t('tutorial.ok') : String(index + 1);

        const stepTitle = document.createElement('span');
        stepTitle.textContent = step.title;

        stepEl.replaceChildren(check, stepTitle);
        stepsContainer.appendChild(stepEl);
    });

    panel.replaceChildren(header, detail, stepsContainer);
    bindLegacyTutorialSkip(onSkip);
    syncLegacyTutorialPanelControls(panel, panel.dataset.preactShadow === 'true');
}

export function updateLegacyTutorialProgress(
    panel: HTMLElement,
    steps: TutorialStep[],
    activeIndex: number,
    completeCount: number
): void {
    const stepElements = panel.querySelectorAll('.tutorial-step');
    stepElements.forEach((el, index) => {
        const step = steps[index];
        el.className = `tutorial-step ${step.completed ? 'complete' : index === activeIndex ? 'active' : ''}`;
        const checkEl = el.querySelector('.tutorial-check');
        if (checkEl) checkEl.textContent = step.completed ? t('tutorial.ok') : String(index + 1);
    });
    const kickerEl = panel.querySelector('.tutorial-kicker');
    if (kickerEl) kickerEl.textContent = t('tutorial.kicker', { current: completeCount, total: steps.length });
}

export function bindLegacyTutorialSkip(onSkip: () => void): void {
    const skip = document.getElementById('btn-skip-tutorial');
    if (skip) skip.onclick = () => onSkip();
}

export function startLegacyTutorialTypewriter(
    text: string,
    previousInterval: number | undefined,
    onTick?: () => void
): number | undefined {
    const element = document.getElementById('tutorial-typewriter');
    if (!element) return previousInterval;

    let index = 0;
    element.textContent = '';

    if (previousInterval) clearInterval(previousInterval);

    const interval = window.setInterval(() => {
        if (index < text.length) {
            element.textContent = text.slice(0, index + 1);
            index++;
            if (index % 4 === 0) onTick?.();
        } else {
            clearInterval(interval);
        }
    }, 22);
    return interval;
}
