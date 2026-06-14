import { CONFIG } from '../config';
import type { DefenseModelState, TrainingRewardPreference } from '../types';

export type TrainingRewardKind = TrainingRewardPreference;

export interface TrainingRewardResult {
    kind: TrainingRewardKind;
    accuracyGain: number;
    damageGain: number;
}

export function createDefaultDefenseModelState(): DefenseModelState {
    return {
        modelAccuracy: CONFIG.MODEL_TRAINING.BASE_ACCURACY,
        damageBonus: 0,
        trainingRewardPreference: 'accuracy',
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
        trainingRewardPreference: raw.trainingRewardPreference === 'damage' ? 'damage' : 'accuracy',
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

export function getTrainingDurationTicks(
    activeGpuCount: number,
    consumedTrainingData: number = CONFIG.MODEL_TRAINING.INITIAL_DATA_REQUIREMENT
): number {
    const dataMultiplier = Math.max(1, consumedTrainingData) / CONFIG.MODEL_TRAINING.INITIAL_DATA_REQUIREMENT;
    return Math.max(1, Math.ceil(
        CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS
        * dataMultiplier
        * getGpuTrainingSpeedMultiplier(activeGpuCount)
    ));
}

export function getNextTrainingRewardKind(state: DefenseModelState): TrainingRewardKind {
    return state.trainingRewardPreference;
}

export function getTimeAdjustedModelAccuracy(modelAccuracy: number, currentTimeMs: number): number {
    const intervalMs = Math.max(1, CONFIG.MODEL_TRAINING.ACCURACY_DECAY_INTERVAL_MS);
    const elapsedIntervals = Math.max(0, Math.floor(currentTimeMs / intervalMs));
    const decay = elapsedIntervals * Math.max(0, CONFIG.MODEL_TRAINING.ACCURACY_DECAY_PER_INTERVAL);
    return clamp(modelAccuracy - decay, CONFIG.MODEL_TRAINING.MIN_EFFECTIVE_ACCURACY, 100);
}

export function applyCompletedTraining(state: DefenseModelState): TrainingRewardResult {
    if (getNextTrainingRewardKind(state) === 'accuracy') {
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
