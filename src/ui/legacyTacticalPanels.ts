import type { TacticalPanelSnapshot } from '../types';
export interface LegacyTacticalPanelRefs {
    objectiveTitleEl: HTMLElement | null;
    objectiveDetailEl: HTMLElement | null;
    waveTitleEl: HTMLElement | null;
    waveDetailEl: HTMLElement | null;
    waveRecommendationEl: HTMLElement | null;
    waveTimerEl: HTMLElement | null;
    defenseTitleEl: HTMLElement | null;
    defenseDetailEl: HTMLElement | null;
    powerStatusChipEl: HTMLElement | null;
}

export type LegacyPowerTone = TacticalPanelSnapshot['powerStatus']['tone'];

export function getLegacyTacticalPanelRefs(waveTimerEl: HTMLElement | null): LegacyTacticalPanelRefs {
    return {
        objectiveTitleEl: document.getElementById('current-objective-title'),
        objectiveDetailEl: document.getElementById('current-objective-detail'),
        waveTitleEl: document.getElementById('next-wave-title'),
        waveDetailEl: document.getElementById('next-wave-detail'),
        waveRecommendationEl: document.getElementById('next-wave-recommendation'),
        waveTimerEl,
        defenseTitleEl: document.getElementById('defense-status-title'),
        defenseDetailEl: document.getElementById('defense-status-detail'),
        powerStatusChipEl: document.getElementById('power-status-chip')
    };
}

export function showLegacyTacticalPanels(): void {
    ['mission-panel', 'threat-panel', 'systems-panel'].forEach(id => {
        const panel = document.getElementById(id);
        if (panel) panel.style.display = 'block';
    });
}

export function updateLegacyObjectivePanel(
    refs: Pick<LegacyTacticalPanelRefs, 'objectiveTitleEl' | 'objectiveDetailEl'>,
    title: string,
    detail: string
): void {
    if (refs.objectiveTitleEl) refs.objectiveTitleEl.textContent = title;
    if (refs.objectiveDetailEl) refs.objectiveDetailEl.textContent = detail;
}

export function updateLegacyWavePanel(
    refs: Pick<LegacyTacticalPanelRefs, 'waveTitleEl' | 'waveDetailEl' | 'waveRecommendationEl' | 'waveTimerEl'>,
    values: { title?: string; detail?: string; recommendation?: string; timer?: string }
): void {
    if (typeof values.timer === 'string' && refs.waveTimerEl) refs.waveTimerEl.textContent = values.timer;
    if (typeof values.title === 'string' && refs.waveTitleEl) refs.waveTitleEl.textContent = values.title;
    if (typeof values.detail === 'string' && refs.waveDetailEl) refs.waveDetailEl.textContent = values.detail;
    if (typeof values.recommendation === 'string' && refs.waveRecommendationEl) {
        refs.waveRecommendationEl.textContent = values.recommendation;
    }
}

export function updateLegacyDefensePanel(
    refs: Pick<LegacyTacticalPanelRefs, 'defenseTitleEl' | 'defenseDetailEl'>,
    title: string,
    detail: string
): void {
    if (refs.defenseTitleEl) refs.defenseTitleEl.textContent = title;
    if (refs.defenseDetailEl) refs.defenseDetailEl.textContent = detail;
}

export function updateLegacyPowerStatus(
    refs: Pick<LegacyTacticalPanelRefs, 'powerStatusChipEl'>,
    text: string,
    tone: LegacyPowerTone
): void {
    const chip = refs.powerStatusChipEl;
    if (!chip) return;
    chip.classList.remove('panel-chip-danger', 'panel-chip-warning');
    chip.textContent = text;
    if (tone === 'danger') chip.classList.add('panel-chip-danger');
    if (tone === 'warning') chip.classList.add('panel-chip-warning');
}
