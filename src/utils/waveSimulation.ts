import { CONFIG } from '../config';

export type IntrusionRouteId = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

export interface IntrusionRoute {
    id: IntrusionRouteId;
    label: string;
}

export interface SpawnPoint {
    x: number;
    y: number;
}

const MAP_TILE_SPAN = 60;
const INTRUSION_ROUTES: IntrusionRoute[] = [
    { id: 'NORTH', label: 'North Port' },
    { id: 'EAST', label: 'East Port' },
    { id: 'SOUTH', label: 'South Port' },
    { id: 'WEST', label: 'West Port' }
];

const ROUTE_COUNT_BY_DIFFICULTY: Record<string, number> = {
    EASY: 1,
    NORMAL: 2,
    HARD: 3,
    NIGHTMARE: 4
};

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

export function getIntrusionRoutesForDifficulty(difficultyId = 'NORMAL'): IntrusionRoute[] {
    const difficulty = getDifficultyConfig(difficultyId);
    const routeCount = ROUTE_COUNT_BY_DIFFICULTY[difficulty.ID] ?? ROUTE_COUNT_BY_DIFFICULTY.NORMAL;
    return INTRUSION_ROUTES.slice(0, routeCount);
}

export function selectActiveIntrusionRoutes(wave: number, difficultyId = 'NORMAL'): IntrusionRoute[] {
    const routes = getIntrusionRoutesForDifficulty(difficultyId);
    const currentWave = Math.max(1, Math.floor(wave));
    if (routes.length <= 1) return routes;

    const rotation = currentWave % routes.length;
    return routes.map((_, index) => routes[(index + rotation) % routes.length]);
}

export function getSpawnPointForRoute(routeId: IntrusionRouteId, progress: number): SpawnPoint {
    const mapSize = MAP_TILE_SPAN * CONFIG.GRID_SIZE;
    const halfMap = mapSize / 2;
    const offset = -halfMap + clampUnit(progress) * mapSize;

    switch (routeId) {
        case 'NORTH':
            return { x: offset, y: -halfMap };
        case 'EAST':
            return { x: halfMap, y: offset };
        case 'SOUTH':
            return { x: offset, y: halfMap };
        case 'WEST':
            return { x: -halfMap, y: offset };
    }
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
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
