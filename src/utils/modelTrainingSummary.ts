export interface TrainingItemEffect {
    confidenceGain: number;
    versionGain: number;
    inferenceChargeGain: number;
}

export interface TrainingTargetSummaryInput {
    displayName: string;
    confidence: number;
    version: number;
    onlineCount: number;
    inputCounts: Record<string, number>;
}

export interface TrainingTargetSummary {
    title: string;
    modelLine: string;
    inputLine: string;
    effectLine: string;
}

export function getTrainingItemEffect(itemType: string): TrainingItemEffect {
    if (itemType === 'WEIGHT_UPDATE') {
        return { confidenceGain: 2, versionGain: 0, inferenceChargeGain: 0 };
    }
    if (itemType === 'TRAINED_MODEL') {
        return { confidenceGain: 10, versionGain: 1, inferenceChargeGain: 0 };
    }
    if (itemType === 'INFERENCE_UNIT') {
        return { confidenceGain: 0, versionGain: 0, inferenceChargeGain: 5 };
    }
    return { confidenceGain: 0, versionGain: 0, inferenceChargeGain: 0 };
}

export function summarizeTrainingTarget(input: TrainingTargetSummaryInput): TrainingTargetSummary {
    const weightUpdates = input.inputCounts.WEIGHT_UPDATE || 0;
    const trainedModels = input.inputCounts.TRAINED_MODEL || 0;
    const inferenceUnits = input.inputCounts.INFERENCE_UNIT || 0;

    return {
        title: input.displayName,
        modelLine: `${Math.round(input.confidence)}% confidence | v${input.version} | ${input.onlineCount} online`,
        inputLine: `Training input: ${weightUpdates} Weight Updates, ${trainedModels} Trained Models, ${inferenceUnits} Inference Units`,
        effectLine: 'Permanent growth: Weight Update +2% confidence, Trained Model +10% and +1 version'
    };
}
