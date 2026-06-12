import { CONFIG } from '../config';
import { getBuildingName, textForKey } from '../i18n';
import type {
    DefenseModelState,
    LabJobProgress,
    ResearchNode,
    TrainingLabRowSnapshot,
    TrainingLabSnapshot,
    TrainingPlannerMode
} from '../types';
import { getNextTrainingRewardKind } from '../utils/modelTrainingProgress';
import type {
    LegacyTrainingLabDefenseRow,
    LegacyTrainingLabSystemRow
} from './legacyTrainingLab';

export interface TrainingLabSnapshotInput {
    activeTab: 'DEFENSE' | 'SYSTEM';
    autoEnabled: boolean;
    autoToggleLabel: string;
    duration: string;
    open: boolean;
    overview: string;
    plannerReason: string;
    plannerStatus: string;
    rows: TrainingLabRowSnapshot[];
}

export interface TrainingLabShellDisplayInput {
    gpuUnlocked: boolean;
    planner: {
        autoEnabled: boolean;
        mode: TrainingPlannerMode;
        lastDecisionReason?: string | null;
        getEstimatedDurationTicks: () => number;
        getJobLabel: () => string;
    };
    summary: {
        activeGpuCount: number;
        adjacentGpuCount: number;
        speedMultiplier: number;
    };
}

export interface TrainingLabShellDisplay {
    autoActive: boolean;
    autoToggleText: string;
    durationText: string;
    overviewText: string;
    plannerReasonText: string;
    plannerStatusText: string;
}

export interface TrainingLabDisplayPayloadInput {
    activeTab: 'DEFENSE' | 'SYSTEM';
    open: boolean;
    rows: TrainingLabRowSnapshot[];
    shell: TrainingLabShellDisplay;
}

export interface TrainingLabDisplayPayload {
    legacyShell: TrainingLabShellDisplay;
    snapshot: TrainingLabSnapshot;
}

export function createTrainingLabShellDisplay({
    gpuUnlocked,
    planner,
    summary
}: TrainingLabShellDisplayInput): TrainingLabShellDisplay {
    const speedPercent = Math.round((1 - summary.speedMultiplier) * 100);
    const overviewText = gpuUnlocked
        ? textForKey('trainingLab.gpuStatus', {
            active: summary.activeGpuCount,
            adjacent: summary.adjacentGpuCount,
            reduction: speedPercent
        })
        : textForKey('trainingLab.gpuLocked');
    const autoActive = planner.autoEnabled && planner.mode === 'AUTO_DECIDE';
    const modeLabel = autoActive
        ? textForKey('trainingLab.autoMode')
        : textForKey('trainingLab.manualMode');
    const plannerStatusText = `${modeLabel}: ${planner.getJobLabel()}`;

    return {
        autoActive,
        autoToggleText: autoActive ? textForKey('trainingLab.autoOn') : textForKey('trainingLab.autoOff'),
        durationText: textForKey('trainingLab.duration', {
            base: CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS,
            current: planner.getEstimatedDurationTicks()
        }),
        overviewText,
        plannerReasonText: planner.lastDecisionReason ?? textForKey('trainingLab.manualReason'),
        plannerStatusText
    };
}

export function createTrainingLabSnapshot({
    activeTab,
    autoEnabled,
    autoToggleLabel,
    duration,
    open,
    overview,
    plannerReason,
    plannerStatus,
    rows
}: TrainingLabSnapshotInput): TrainingLabSnapshot {
    return {
        open,
        title: textForKey('trainingLab.title'),
        kicker: textForKey('trainingLab.kicker'),
        closeLabel: textForKey('trainingLab.close'),
        overview,
        plannerStatus,
        plannerReason,
        autoToggleLabel,
        autoEnabled,
        activeTab,
        tabs: {
            defense: textForKey('trainingLab.tab.defense'),
            system: textForKey('trainingLab.tab.system')
        },
        rewardModeLabel: textForKey('trainingLab.rewardMode'),
        rewardAccuracyShortLabel: textForKey('trainingLab.rewardAccuracyShort'),
        rewardDamageShortLabel: textForKey('trainingLab.rewardDamageShort'),
        dataProgressLabel: textForKey('trainingLab.dataLabel'),
        workProgressLabel: textForKey('trainingLab.workLabel'),
        toneLabels: {
            active: textForKey('trainingLab.tone.active'),
            complete: textForKey('trainingLab.tone.complete'),
            training: textForKey('trainingLab.tone.training'),
            locked: textForKey('trainingLab.tone.locked'),
            idle: textForKey('trainingLab.tone.idle')
        },
        duration,
        rows
    };
}

export function withTrainingLabOpenState(
    snapshot: TrainingLabSnapshot,
    open: boolean
): TrainingLabSnapshot {
    return {
        ...snapshot,
        open
    };
}

export function createTrainingLabDisplayPayload({
    activeTab,
    open,
    rows,
    shell
}: TrainingLabDisplayPayloadInput): TrainingLabDisplayPayload {
    return {
        legacyShell: shell,
        snapshot: createTrainingLabSnapshot({
            activeTab,
            autoEnabled: shell.autoActive,
            autoToggleLabel: shell.autoToggleText,
            duration: shell.durationText,
            open,
            overview: shell.overviewText,
            plannerReason: shell.plannerReasonText,
            plannerStatus: shell.plannerStatusText,
            rows
        })
    };
}

export function createTrainingLabDefenseRowSnapshots(
    rows: LegacyTrainingLabDefenseRow[]
): TrainingLabRowSnapshot[] {
    return rows.map(row => ({
        id: row.id,
        kind: 'DEFENSE',
        title: row.name,
        detail: `${row.statText} | ${row.nextRewardText}`,
        progress: `${row.dataPercent}% / ${row.trainingPercent}%`,
        active: row.selected,
        rewardPreference: row.rewardPreference
    }));
}

export function createTrainingLabDefenseRows({
    activeJobId,
    getDefenseJobId,
    getDefenseModelState,
    targetTypes = CONFIG.MODEL_TRAINING.TARGET_TYPES
}: {
    activeJobId: string | null;
    getDefenseJobId: (type: string) => string;
    getDefenseModelState: (type: string) => DefenseModelState;
    targetTypes?: readonly string[];
}): LegacyTrainingLabDefenseRow[] {
    return targetTypes.map(type => {
        const state = getDefenseModelState(type);
        const selected = activeJobId === getDefenseJobId(type);
        const trainingPercent = state.isTraining
            ? Math.min(100, Math.round((state.trainingProgressTicks / state.trainingDurationTicks) * 100))
            : 0;
        const dataPercent = Math.min(100, Math.round((state.accumulatedTrainingData / state.currentRequirement) * 100));
        const nextReward = getNextTrainingRewardKind(state) === 'accuracy'
            ? textForKey('trainingLab.nextAccuracy', { amount: CONFIG.MODEL_TRAINING.ACCURACY_GAIN })
            : textForKey('trainingLab.nextDamage', { amount: CONFIG.MODEL_TRAINING.DAMAGE_GAIN });

        return {
            dataPercent,
            dataProgressText: textForKey('trainingLab.dataProgress', {
                current: Math.floor(state.accumulatedTrainingData),
                required: state.currentRequirement
            }),
            id: type,
            name: getBuildingName(type),
            nextRewardText: nextReward,
            rewardAccuracyText: textForKey('trainingLab.rewardAccuracy'),
            rewardDamageText: textForKey('trainingLab.rewardDamage'),
            rewardModeText: textForKey('trainingLab.rewardMode'),
            rewardPreference: state.trainingRewardPreference,
            selected,
            statText: `${textForKey('trainingLab.accuracy')}: ${Math.round(state.modelAccuracy)}% | ${textForKey('trainingLab.damage')}: +${Math.round(state.damageBonus)}%`,
            trainingPercent,
            trainingStatusText: state.isTraining
                ? textForKey('trainingLab.trainingProgress', { progress: trainingPercent })
                : textForKey('trainingLab.waiting')
        };
    });
}

export function createTrainingLabSystemRowSnapshots(
    rows: LegacyTrainingLabSystemRow[]
): TrainingLabRowSnapshot[] {
    return rows.map(row => ({
        id: row.id,
        kind: 'SYSTEM',
        title: row.name,
        detail: `${row.statText} | ${row.effectText}`,
        progress: `${row.progressPercent}% / ${row.trainingPercent}%`,
        active: row.selected,
        disabled: row.disabled
    }));
}

export function createTrainingLabSystemRows({
    activeJobId,
    getJobProgress,
    isJobAvailable,
    researchNodes = Object.values(CONFIG.RESEARCH)
}: {
    activeJobId: string | null;
    getJobProgress: (id: string) => LabJobProgress;
    isJobAvailable: (id: string) => boolean;
    researchNodes?: ResearchNode[];
}): LegacyTrainingLabSystemRow[] {
    return researchNodes.map(node => {
        const progress = getJobProgress(node.ID);
        const available = isJobAvailable(node.ID);
        const selected = activeJobId === node.ID;
        const percent = Math.min(100, Math.round((progress.progress / node.COST) * 100));
        const trainingPercent = progress.isTraining
            ? Math.min(100, Math.round(((progress.trainingProgressTicks ?? 0) / (progress.trainingDurationTicks ?? 1)) * 100))
            : 0;

        let statusText = '';
        if (progress.completed) {
            statusText = textForKey('trainingLab.completed');
        } else if (progress.isTraining) {
            statusText = `Researching: ${trainingPercent}%`;
        } else {
            statusText = available ? textForKey('trainingLab.waiting') : textForKey('research.action.locked');
        }

        return {
            disabled: !available && !progress.completed,
            effectText: textForKey(`research.${node.ID}.description`),
            id: node.ID,
            name: textForKey(`research.${node.ID}.name`),
            progressPercent: percent,
            selected,
            statText: progress.completed
                ? textForKey('trainingLab.completed')
                : textForKey('trainingLab.systemProgress', {
                    current: Math.floor(progress.progress),
                    required: node.COST
                }),
            statusText,
            trainingPercent
        };
    });
}
