import type { DefenseModelState } from '../types';

export interface RunResultSummaryInput {
    wave: number;
    coreHp: number;
    coreMaxHp: number;
    totalConfidenceEarned: number;
    unlockedResearchCount: number;
    modelStates: Record<string, DefenseModelState>;
    getModelName: (type: string) => string;
}

export interface RunResultSummary {
    wave: number;
    coreHpPercent: number;
    totalConfidenceEarned: number;
    unlockedResearchCount: number;
    bestModelName: string;
    bestModelAccuracy: number;
    bestModelDamageBonus: number;
    bestModelVersion: number;
    lines: string[];
}

export function createRunResultSummary(input: RunResultSummaryInput): RunResultSummary {
    const coreHpPercent = input.coreMaxHp > 0
        ? Math.max(0, Math.min(100, Math.round((input.coreHp / input.coreMaxHp) * 100)))
        : 0;
    const best = Object.entries(input.modelStates)
        .sort(([, a], [, b]) => (b.modelAccuracy + b.damageBonus) - (a.modelAccuracy + a.damageBonus))[0];
    const bestType = best?.[0] ?? 'NONE';
    const bestState = best?.[1] ?? {
        modelAccuracy: 0,
        damageBonus: 0,
        modelVersion: 0,
        inferenceCharge: 0,
        accumulatedTrainingData: 0,
        currentRequirement: 100,
        isTraining: false,
        trainingProgressTicks: 0,
        trainingDurationTicks: 1
    };
    const bestModelName = input.getModelName(bestType);

    return {
        wave: input.wave,
        coreHpPercent,
        totalConfidenceEarned: input.totalConfidenceEarned,
        unlockedResearchCount: input.unlockedResearchCount,
        bestModelName,
        bestModelAccuracy: Math.round(bestState.modelAccuracy),
        bestModelDamageBonus: Math.round(bestState.damageBonus),
        bestModelVersion: bestState.modelVersion,
        lines: [
            `Reached Wave ${input.wave}`,
            `Core integrity ${coreHpPercent}%`,
            `Total Confidence earned ${input.totalConfidenceEarned.toFixed(2)}`,
            `Research unlocked ${input.unlockedResearchCount}`,
            `Best model ${bestModelName} ${Math.round(bestState.modelAccuracy)}% accuracy / +${Math.round(bestState.damageBonus)}% damage`
        ]
    };
}
