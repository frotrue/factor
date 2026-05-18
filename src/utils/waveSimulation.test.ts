import { describe, expect, it } from 'vitest';
import { createWavePlan, estimateWaveHitPoints, getBaseWaveStats } from './waveSimulation';

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

