import { CONFIG } from '../config';

export interface EnemyBuildingCandidate<T = unknown> {
    key: string;
    type: string;
    building?: T;
}

const PRIORITY: Record<string, number> = {
    FIREWALL: 0,
    CLASSIFIER: 1,
    FILTER: 1
};

export function selectEnemyBuildingTarget<T>(
    candidates: EnemyBuildingCandidate<T>[]
): EnemyBuildingCandidate<T> | null {
    const attackable = candidates.filter(candidate => candidate.type !== 'CORE' && CONFIG.BUILDINGS[candidate.type]);
    if (attackable.length === 0) return null;

    return attackable.slice().sort((a, b) => getPriority(a.type) - getPriority(b.type))[0];
}

function getPriority(type: string): number {
    return PRIORITY[type] ?? 2;
}
