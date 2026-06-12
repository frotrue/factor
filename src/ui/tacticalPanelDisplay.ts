import { t, textForKey } from '../i18n';
import type { DefenseModelState, PowerUpdateData, TacticalPanelSnapshot } from '../types';
import type { ObjectiveState } from '../utils/progressionGates';
import type { WaveBriefing } from '../utils/waveSimulation';

export interface LegacyWavePanelDisplay {
    title?: string;
    detail?: string;
    recommendation?: string;
    timer?: string;
}

export interface LegacyPowerStatusDisplay {
    text: string;
    tone: TacticalPanelSnapshot['powerStatus']['tone'];
}

export interface LegacyDefenseStatusEntry {
    name: string;
    count: number;
    state: DefenseModelState;
}

export interface LegacyTrainingDefenseStatus {
    name: string;
    state: DefenseModelState;
}

export interface LegacyDefenseStatusDisplay {
    title: string;
    detail: string;
}

export interface LegacyObjectiveDisplay {
    title: string;
    detail: string;
}

export interface TacticalPanelSnapshotDisplayInput {
    objective: LegacyObjectiveDisplay;
    wave: LegacyWavePanelDisplay | null;
    defense: LegacyDefenseStatusDisplay;
    powerStatus: LegacyPowerStatusDisplay;
    briefing: WaveBriefing | null;
}

export interface TacticalPanelDisplayPayload {
    legacyObjective: LegacyObjectiveDisplay;
    legacyWave: LegacyWavePanelDisplay | null;
    legacyDefense: LegacyDefenseStatusDisplay;
    legacyPowerStatus: LegacyPowerStatusDisplay;
    snapshot: TacticalPanelSnapshot;
}

export function createTacticalPanelDisplayPayload(input: TacticalPanelSnapshotDisplayInput): TacticalPanelDisplayPayload {
    return {
        legacyObjective: input.objective,
        legacyWave: input.wave,
        legacyDefense: input.defense,
        legacyPowerStatus: input.powerStatus,
        snapshot: createTacticalPanelSnapshotFromDisplay(input)
    };
}

export function createTacticalPanelSnapshotFromDisplay({
    objective,
    wave,
    defense,
    powerStatus,
    briefing
}: TacticalPanelSnapshotDisplayInput): TacticalPanelSnapshot {
    return {
        labels: createTacticalPanelLabels(),
        objective: {
            title: objective.title,
            detail: objective.detail
        },
        threat: {
            title: wave?.title ?? '',
            detail: wave?.detail ?? '',
            recommendation: wave?.recommendation ?? '',
            threatLevel: briefing?.threat ?? 'Low',
            routeNames: briefing?.routeNames ?? [],
            special: briefing?.special ?? null
        },
        defense: {
            title: defense.title,
            detail: defense.detail
        },
        powerStatus: {
            text: powerStatus.text,
            tone: powerStatus.tone
        }
    };
}

function createTacticalPanelLabels(): TacticalPanelSnapshot['labels'] {
    return {
        aria: textForKey('panel.aria'),
        expand: textForKey('panel.expand'),
        collapse: textForKey('panel.collapse'),
        panelNames: {
            objective: textForKey('panel.objectivePanel'),
            threat: textForKey('panel.threatPanel'),
            systems: textForKey('panel.systemsPanel')
        },
        objective: textForKey('panel.objective'),
        threat: textForKey('panel.nextWave'),
        systems: textForKey('panel.systems'),
        powerLoad: textForKey('panel.powerLoad')
    };
}

export function createLegacyWavePanelDisplay(
    briefing: WaveBriefing | null,
    timer?: number
): LegacyWavePanelDisplay | null {
    if (!briefing) {
        if (typeof timer !== 'number') return null;
        return { timer: `${Math.ceil(timer / 1000)}s` };
    }

    const countdown = typeof timer === 'number'
        ? `${Math.max(0, Math.ceil(timer / 1000))}s`
        : null;
    const routeText = briefing.routeNames.join(' + ');
    const specialText = briefing.special ? ` | ${briefing.special}` : '';

    return {
        timer: countdown || t('hud.waveActive'),
        title: `Wave ${briefing.wave}`,
        detail: `${routeText} | ${briefing.threat}${specialText}`,
        recommendation: briefing.recommendedDefense
    };
}

export function createLegacyPowerStatusDisplay(data: PowerUpdateData | null): LegacyPowerStatusDisplay {
    if (!data) {
        return {
            text: textForKey('powerStatus.core'),
            tone: 'warning'
        };
    }

    if (data.isBlackout || data.net < 0) {
        return {
            text: textForKey('powerStatus.blackout', { net: data.net }),
            tone: 'danger'
        };
    }

    return {
        text: textForKey('powerStatus.stable', { net: data.net }),
        tone: 'default'
    };
}

export function createLegacyDefenseStatusDisplay(
    entries: LegacyDefenseStatusEntry[],
    activeTraining: LegacyTrainingDefenseStatus | null
): LegacyDefenseStatusDisplay {
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);

    if (total === 0) {
        return {
            title: textForKey('defenseStatus.empty.title'),
            detail: textForKey('defenseStatus.empty.detail')
        };
    }

    const lines = entries
        .filter(entry => entry.count > 0)
        .map(entry => `${entry.name} x${entry.count} | ${Math.round(entry.state.modelAccuracy)}% | DMG +${Math.round(entry.state.damageBonus)}%`);

    if (activeTraining) {
        lines.push(textForKey('defenseStatus.training', {
            name: activeTraining.name,
            confidence: Math.round(activeTraining.state.modelAccuracy),
            version: activeTraining.state.modelVersion
        }));
    }

    return {
        title: textForKey('defenseStatus.ready.title', { count: total }),
        detail: lines.join('\n')
    };
}

export function createLegacyObjectiveDisplay(state: ObjectiveState): LegacyObjectiveDisplay {
    return {
        title: textForKey(state.titleKey),
        detail: textForKey(state.detailKey)
    };
}
