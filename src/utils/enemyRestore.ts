import { CONFIG } from '../config';

export function getRestoredEnemyHp(enemyType: string, savedHp: number, effectiveHpMultiplier: number): { maxHp: number; hp: number } {
    const maxHp = CONFIG.ENEMIES[enemyType].BASE_HP * effectiveHpMultiplier;
    return {
        maxHp,
        hp: Math.max(0, Math.min(maxHp, savedHp))
    };
}
