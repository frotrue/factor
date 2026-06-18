export interface WaveResultSummaryInput {
    wave: number;
    enemiesDestroyed: number;
    coreHpBefore: number;
    coreHpAfter: number;
    coreMaxHp: number;
    dataBefore: number;
    dataAfter: number;
    buildingsDamaged: number;
    buildingsDestroyed: number;
}

export interface WaveResultSummary {
    wave: number;
    outcome: 'survived' | 'failed';
    enemiesDestroyed: number;
    coreDamage: number;
    coreHpPercent: number;
    dataProcessed: number;
    buildingsDamaged: number;
    buildingsDestroyed: number;
    lines: string[];
}

export function createWaveResultSummary(input: WaveResultSummaryInput): WaveResultSummary {
    const coreDamage = Math.max(0, input.coreHpBefore - input.coreHpAfter);
    const dataProcessed = Math.max(0, input.dataAfter - input.dataBefore);
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
        dataProcessed,
        buildingsDamaged: input.buildingsDamaged,
        buildingsDestroyed: input.buildingsDestroyed,
        lines: [
            `Wave ${input.wave} ${outcome}`,
            `Defense removed ${input.enemiesDestroyed} intrusions`,
            `+${dataProcessed} data delivered to Core`,
            `Core integrity ${coreHpPercent}% (-${coreDamage} HP)`,
            `${lostText}, ${damagedText}`
        ]
    };
}
