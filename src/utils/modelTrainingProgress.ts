import { CONFIG } from '../config';
import type { DefenseModelState } from '../types';

export type TrainingRewardKind = 'accuracy' | 'damage';

export interface TrainingRewardResult {
    kind: TrainingRewardKind;
    accuracyGain: number;
    damageGain: number;
}

export function createDefaultDefenseModelState(): DefenseModelState {
    return {
        modelAccuracy: CONFIG.MODEL_TRAINING.BASE_ACCURACY,
        damageBonus: 0,
        modelVersion: 1,
        inferenceCharge: 0,
        accumulatedTrainingData: 0,
        currentRequirement: CONFIG.MODEL_TRAINING.INITIAL_DATA_REQUIREMENT,
        isTraining: false,
        trainingProgressTicks: 0,
        trainingDurationTicks: CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS
    };
}

export function normalizeDefenseModelState(raw: Partial<DefenseModelState> & { modelConfidence?: number } = {}): DefenseModelState {
    const defaults = createDefaultDefenseModelState();
    const legacyAccuracy = typeof raw.modelConfidence === 'number' ? raw.modelConfidence : undefined;
    return {
        modelAccuracy: clamp(raw.modelAccuracy ?? legacyAccuracy ?? defaults.modelAccuracy, 0, 100),
        damageBonus: Math.max(0, raw.damageBonus ?? defaults.damageBonus),
        modelVersion: Math.max(1, raw.modelVersion ?? defaults.modelVersion),
        inferenceCharge: Math.max(0, raw.inferenceCharge ?? defaults.inferenceCharge),
        accumulatedTrainingData: Math.max(0, raw.accumulatedTrainingData ?? defaults.accumulatedTrainingData),
        currentRequirement: Math.max(1, Math.ceil(raw.currentRequirement ?? defaults.currentRequirement)),
        isTraining: Boolean(raw.isTraining ?? defaults.isTraining),
        trainingProgressTicks: Math.max(0, raw.trainingProgressTicks ?? defaults.trainingProgressTicks),
        trainingDurationTicks: Math.max(1, Math.ceil(raw.trainingDurationTicks ?? defaults.trainingDurationTicks))
    };
}

export function getTrainingDataValue(itemType: string): number {
    return CONFIG.MODEL_TRAINING.DATA_VALUES[itemType] ?? 0;
}

export function getNextTrainingRequirement(currentRequirement: number): number {
    return Math.max(1, Math.ceil(currentRequirement * CONFIG.MODEL_TRAINING.REQUIREMENT_MULTIPLIER));
}

export function getGpuTrainingSpeedMultiplier(activeGpuCount: number): number {
    const clamped = Math.max(0, Math.min(CONFIG.MODEL_TRAINING.GPU_MAX_ACTIVE, activeGpuCount));
    return Math.max(0.05, 1 - clamped * CONFIG.MODEL_TRAINING.GPU_SPEED_BONUS);
}

export function getTrainingDurationTicks(activeGpuCount: number): number {
    return Math.max(1, Math.ceil(CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS * getGpuTrainingSpeedMultiplier(activeGpuCount)));
}

export function getNextTrainingRewardKind(state: DefenseModelState): TrainingRewardKind {
    return state.modelAccuracy < CONFIG.MODEL_TRAINING.GPU_UNLOCK_ACCURACY ? 'accuracy' : 'damage';
}

export function applyCompletedTraining(state: DefenseModelState): TrainingRewardResult {
    if (state.modelAccuracy < CONFIG.MODEL_TRAINING.GPU_UNLOCK_ACCURACY) {
        const previous = state.modelAccuracy;
        state.modelAccuracy = clamp(state.modelAccuracy + CONFIG.MODEL_TRAINING.ACCURACY_GAIN, 0, 100);
        state.modelVersion += 1;
        return { kind: 'accuracy', accuracyGain: state.modelAccuracy - previous, damageGain: 0 };
    }

    state.damageBonus += CONFIG.MODEL_TRAINING.DAMAGE_GAIN;
    state.modelVersion += 1;
    return { kind: 'damage', accuracyGain: 0, damageGain: CONFIG.MODEL_TRAINING.DAMAGE_GAIN };
}

export function isGpuUnlocked(modelStates: Record<string, DefenseModelState>): boolean {
    return Object.values(modelStates).some(state => state.modelAccuracy >= CONFIG.MODEL_TRAINING.GPU_UNLOCK_ACCURACY);
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
