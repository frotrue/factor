export interface WaveResultSummaryInput {
    wave: number;
    enemiesDestroyed: number;
    coreHpBefore: number;
    coreHpAfter: number;
    coreMaxHp: number;
    confidenceBefore: number;
    confidenceAfter: number;
    buildingsDamaged: number;
    buildingsDestroyed: number;
}

export interface WaveResultSummary {
    wave: number;
    outcome: 'survived' | 'failed';
    enemiesDestroyed: number;
    coreDamage: number;
    coreHpPercent: number;
    confidenceGained: number;
    buildingsDamaged: number;
    buildingsDestroyed: number;
    lines: string[];
}

export function createWaveResultSummary(input: WaveResultSummaryInput): WaveResultSummary {
    const coreDamage = Math.max(0, input.coreHpBefore - input.coreHpAfter);
    const confidenceGained = Math.max(0, input.confidenceAfter - input.confidenceBefore);
    const coreHpPercent = input.coreMaxHp > 0
        ? Math.max(0, Math.min(100, Math.round((input.coreHpAfter / input.coreMaxHp) * 100)))
        : 0;
    const outcome = input.coreHpAfter > 0 ? 'survived' : 'failed';
    const lostText = input.buildingsDestroyed === 1 ? '1 building lost' : `${input.buildingsDestroyed} buildings lost`;
    const damagedText = input.buildingsDamaged === 1 ? '1 damaged' : `${input.buildingsDamaged} damaged`;

    return {
        wave: input.wave,
        outcome,
        enemiesDestroyed: input.enemiesDestroyed,
        coreDamage,
        coreHpPercent,
        confidenceGained,
        buildingsDamaged: input.buildingsDamaged,
        buildingsDestroyed: input.buildingsDestroyed,
        lines: [
            `Wave ${input.wave} ${outcome}`,
            `Defense removed ${input.enemiesDestroyed} intrusions`,
            `+${confidenceGained.toFixed(2)} Confidence from factory growth`,
            `Core integrity ${coreHpPercent}% (-${coreDamage} HP)`,
            `${lostText}, ${damagedText}`
        ]
    };
}
