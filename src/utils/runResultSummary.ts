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
    bestModelConfidence: number;
    bestModelVersion: number;
    lines: string[];
}

export function createRunResultSummary(input: RunResultSummaryInput): RunResultSummary {
    const coreHpPercent = input.coreMaxHp > 0
        ? Math.max(0, Math.min(100, Math.round((input.coreHp / input.coreMaxHp) * 100)))
        : 0;
    const best = Object.entries(input.modelStates)
        .sort(([, a], [, b]) => b.modelConfidence - a.modelConfidence)[0];
    const bestType = best?.[0] ?? 'NONE';
    const bestState = best?.[1] ?? { modelConfidence: 0, modelVersion: 0, inferenceCharge: 0 };
    const bestModelName = input.getModelName(bestType);

    return {
        wave: input.wave,
        coreHpPercent,
        totalConfidenceEarned: input.totalConfidenceEarned,
        unlockedResearchCount: input.unlockedResearchCount,
        bestModelName,
        bestModelConfidence: Math.round(bestState.modelConfidence),
        bestModelVersion: bestState.modelVersion,
        lines: [
            `Reached Wave ${input.wave}`,
            `Core integrity ${coreHpPercent}%`,
            `Total Confidence earned ${input.totalConfidenceEarned.toFixed(2)}`,
            `Research unlocked ${input.unlockedResearchCount}`,
            `Best model ${bestModelName} ${Math.round(bestState.modelConfidence)}% v${bestState.modelVersion}`
        ]
    };
}
