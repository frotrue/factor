export interface RunResultSummaryInput {
    wave: number;
    coreHp: number;
    coreMaxHp: number;
    totalDataReceived: number;
    unlockedResearchCount: number;
}

export interface RunResultSummary {
    wave: number;
    coreHpPercent: number;
    totalDataReceived: number;
    unlockedResearchCount: number;
    lines: string[];
}

export function createRunResultSummary(input: RunResultSummaryInput): RunResultSummary {
    const coreHpPercent = input.coreMaxHp > 0
        ? Math.max(0, Math.min(100, Math.round((input.coreHp / input.coreMaxHp) * 100)))
        : 0;

    return {
        wave: input.wave,
        coreHpPercent,
        totalDataReceived: input.totalDataReceived,
        unlockedResearchCount: input.unlockedResearchCount,
        lines: [
            `Reached Wave ${input.wave}`,
            `Core integrity ${coreHpPercent}%`,
            `Data delivered ${input.totalDataReceived}`,
            `Research completed ${input.unlockedResearchCount}`
        ]
    };
}
