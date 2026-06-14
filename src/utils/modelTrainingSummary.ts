import type { DefenseModelState } from '../types';
import { getNextTrainingRewardKind } from './modelTrainingProgress';

export interface TrainingTargetSummaryInput {
    displayName: string;
    state: DefenseModelState;
    onlineCount: number;
}

export interface TrainingTargetSummary {
    title: string;
    modelLine: string;
    dataLine: string;
    trainingLine: string;
    effectLine: string;
}

export function summarizeTrainingTarget(input: TrainingTargetSummaryInput): TrainingTargetSummary {
    const state = input.state;
    const reward = getNextTrainingRewardKind(state) === 'accuracy'
        ? 'Next reward: accuracy +10%'
        : 'Next reward: damage +5%';
    const trainingLine = state.isTraining
        ? `Training ${Math.round((state.trainingProgressTicks / state.trainingDurationTicks) * 100)}%`
        : 'Waiting for data';

    return {
        title: input.displayName,
        modelLine: `${Math.round(state.modelAccuracy)}% accuracy | +${Math.round(state.damageBonus)}% damage | ${input.onlineCount} online`,
        dataLine: `Training data: ${Math.floor(state.accumulatedTrainingData)} / ${state.currentRequirement}`,
        trainingLine,
        effectLine: reward
    };
}
