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
    panel.style.display = 'none';
}

export function showLegacyTutorialPanel(panel: HTMLElement, activeStepId: string): void {
    panel.style.display = 'block';
    panel.dataset.activeStep = activeStepId;
    panel.dataset.preactShadow = 'true';
    panel.setAttribute('aria-hidden', 'true');
}

export function renderLegacyTutorialPanel(
    panel: HTMLElement,
    steps: TutorialStep[],
    activeIndex: number,
    completeCount: number,
    onSkip: () => void
): void {
    panel.innerHTML = `
        <div class="tutorial-header">
            <div>
                <div class="tutorial-kicker">${t('tutorial.kicker', { current: completeCount, total: steps.length })}</div>
                <div class="tutorial-title">[G.R.A.D.I.U.M. OS AI Assistant]</div>
            </div>
            <button id="btn-skip-tutorial" class="tutorial-skip">${t('tutorial.skip')}</button>
        </div>
        <div id="tutorial-typewriter" class="tutorial-detail typing-text" style="font-family:'Share Tech Mono', monospace; font-size: 11px; line-height: 1.4; min-height: 55px; color: #a5f3fc; text-shadow: 0 0 5px rgba(165, 243, 252, 0.4);"></div>
        <div class="tutorial-steps">
            ${steps.map((step, index) => `
                <div class="tutorial-step ${step.completed ? 'complete' : index === activeIndex ? 'active' : ''}" data-step-id="${step.id}" style="font-family:'Share Tech Mono', monospace; font-size:10px;">
                    <span class="tutorial-check">${step.completed ? t('tutorial.ok') : index + 1}</span>
                    <span>${step.title}</span>
                </div>
            `).join('')}
        </div>
    `;
    bindLegacyTutorialSkip(onSkip);
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
    element.innerHTML = '';

    if (previousInterval) clearInterval(previousInterval);

    const interval = window.setInterval(() => {
        if (index < text.length) {
            element.innerHTML += text.charAt(index);
            index++;
            if (index % 4 === 0) onTick?.();
        } else {
            clearInterval(interval);
        }
    }, 22);
    return interval;
}
