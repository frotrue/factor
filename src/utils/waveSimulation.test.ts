import { describe, expect, it } from 'vitest';
import {
    createWavePlan,
    estimateWaveHitPoints,
    getBaseWaveStats,
    getIntrusionRoutesForDifficulty,
    getSpawnPointForRoute,
    selectActiveIntrusionRoutes
} from './waveSimulation';

describe('wave simulation planning', () => {
    it('keeps early wave counts approachable', () => {
        expect(getBaseWaveStats(1)).toEqual({ baseEnemyCount: 5, hpMultiplier: 1 });
        expect(getBaseWaveStats(5)).toEqual({ baseEnemyCount: 9, hpMultiplier: 1 });
    });

    it('adds boss and DDoS pressure on milestone waves', () => {
        const wave10 = createWavePlan({ wave: 10, difficultyId: 'NORMAL', ddosBots: 10 });

        expect(wave10.bossCount).toBe(1);
        expect(wave10.ddosBots).toBe(10);
        expect(wave10.enemiesToSpawn).toBe(34);
        expect(estimateWaveHitPoints(wave10)).toBeGreaterThan(2500);
    });

    it('applies difficulty modifiers without changing the base formula', () => {
        const easy = createWavePlan({ wave: 12, difficultyId: 'EASY', ddosBots: 10 });
        const normal = createWavePlan({ wave: 12, difficultyId: 'NORMAL', ddosBots: 10 });
        const hard = createWavePlan({ wave: 12, difficultyId: 'HARD', ddosBots: 10 });

        expect(easy.enemiesToSpawn).toBeLessThan(normal.enemiesToSpawn);
        expect(hard.enemiesToSpawn).toBeGreaterThan(normal.enemiesToSpawn);
        expect(easy.effectiveHpMultiplier).toBeLessThan(normal.effectiveHpMultiplier);
        expect(hard.effectiveHpMultiplier).toBeGreaterThan(normal.effectiveHpMultiplier);
    });

    it('keeps wave 20 substantially harder than wave 5', () => {
        const wave5 = createWavePlan({ wave: 5, difficultyId: 'NORMAL' });
        const wave20 = createWavePlan({ wave: 20, difficultyId: 'NORMAL', ddosBots: 10 });

        expect(wave20.enemiesToSpawn).toBeGreaterThan(wave5.enemiesToSpawn * 4);
        expect(estimateWaveHitPoints(wave20)).toBeGreaterThan(estimateWaveHitPoints(wave5) * 15);
    });
});

describe('intrusion route planning', () => {
    it('assigns more intrusion routes as difficulty increases', () => {
        expect(getIntrusionRoutesForDifficulty('EASY').map(route => route.id)).toEqual(['NORTH']);
        expect(getIntrusionRoutesForDifficulty('NORMAL').map(route => route.id)).toEqual(['NORTH', 'EAST']);
        expect(getIntrusionRoutesForDifficulty('HARD').map(route => route.id)).toEqual(['NORTH', 'EAST', 'SOUTH']);
        expect(getIntrusionRoutesForDifficulty('NIGHTMARE').map(route => route.id)).toEqual(['NORTH', 'EAST', 'SOUTH', 'WEST']);
    });

    it('selects deterministic active intrusion routes for the same wave and difficulty', () => {
        const firstPlan = selectActiveIntrusionRoutes(7, 'HARD').map(route => route.id);
        const secondPlan = selectActiveIntrusionRoutes(7, 'HARD').map(route => route.id);

        expect(firstPlan).toEqual(secondPlan);
        expect(firstPlan.length).toBeGreaterThanOrEqual(1);
        expect(firstPlan.length).toBeLessThanOrEqual(3);
    });

    it('keeps generated spawn points on the selected route edge', () => {
        const halfMap = 60 * 32 / 2;

        expect(getSpawnPointForRoute('NORTH', 0.5)).toEqual({ x: 0, y: -halfMap });
        expect(getSpawnPointForRoute('EAST', 0.5)).toEqual({ x: halfMap, y: 0 });
        expect(getSpawnPointForRoute('SOUTH', 0.5)).toEqual({ x: 0, y: halfMap });
        expect(getSpawnPointForRoute('WEST', 0.5)).toEqual({ x: -halfMap, y: 0 });
    });
});
