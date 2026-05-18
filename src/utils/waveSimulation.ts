import { CONFIG } from '../config';

export interface WavePlanOptions {
    wave: number;
    difficultyId?: string;
    ddosBots?: number;
}

export interface WavePlan {
    wave: number;
    difficultyId: string;
    baseEnemyCount: number;
    bossCount: number;
    ddosBots: number;
    enemiesToSpawn: number;
    hpMultiplier: number;
    effectiveHpMultiplier: number;
    rewardMultiplier: number;
    cooldownMs: number;
}

export function getDifficultyConfig(difficultyId = 'NORMAL') {
    return CONFIG.DIFFICULTY[difficultyId] || CONFIG.DIFFICULTY.NORMAL;
}

export function getBaseWaveStats(wave: number): { baseEnemyCount: number; hpMultiplier: number } {
    const currentWave = Math.max(1, Math.floor(wave));

    if (currentWave <= 5) {
        return {
            baseEnemyCount: 4 + currentWave,
            hpMultiplier: 1
        };
    }

    if (currentWave <= 15) {
        return {
            baseEnemyCount: 8 + Math.floor(currentWave * 1.5),
            hpMultiplier: 1.25 + (currentWave - 5) * 0.04
        };
    }

    return {
        baseEnemyCount: 18 + Math.floor(currentWave * 1.8),
        hpMultiplier: 1.8 + (currentWave - 15) * 0.12
    };
}

export function createWavePlan(options: WavePlanOptions): WavePlan {
    const wave = Math.max(1, Math.floor(options.wave));
    const difficultyId = getDifficultyConfig(options.difficultyId).ID;
    const difficulty = getDifficultyConfig(difficultyId);
    const { baseEnemyCount, hpMultiplier } = getBaseWaveStats(wave);
    const bossCount = wave % 10 === 0 ? 1 : 0;
    const ddosBots = wave >= 8 ? Math.max(0, Math.floor(options.ddosBots ?? 10)) : 0;
    const scaledEnemyCount = Math.max(
        1,
        Math.round((baseEnemyCount + bossCount) * difficulty.ENEMY_SPAWN_MULTIPLIER)
    );

    return {
        wave,
        difficultyId,
        baseEnemyCount,
        bossCount,
        ddosBots,
        enemiesToSpawn: scaledEnemyCount + ddosBots,
        hpMultiplier,
        effectiveHpMultiplier: hpMultiplier * difficulty.ENEMY_HP_MULTIPLIER,
        rewardMultiplier: difficulty.REWARD_MULTIPLIER,
        cooldownMs: difficulty.WAVE_COOLDOWN_MS
    };
}

export function estimateWaveHitPoints(plan: WavePlan): number {
    const regularCount = Math.max(0, plan.enemiesToSpawn - plan.ddosBots - plan.bossCount);
    const regularHp = regularCount * CONFIG.ENEMIES.NOISE.BASE_HP * plan.effectiveHpMultiplier;
    const ddosHp = plan.ddosBots * CONFIG.ENEMIES.DDOS_BOT.BASE_HP * plan.effectiveHpMultiplier;
    const bossHp = plan.bossCount * CONFIG.ENEMIES.OVERFITTED_MODEL.BASE_HP * plan.effectiveHpMultiplier;
    return Math.round(regularHp + ddosHp + bossHp);
}

