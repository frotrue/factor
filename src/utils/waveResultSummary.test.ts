import { describe, expect, test } from 'vitest';
import { createWaveResultSummary } from './waveResultSummary';

describe('createWaveResultSummary', () => {
    test('summarizes survival, factory growth, and defense outcome', () => {
        const summary = createWaveResultSummary({
            wave: 4,
            enemiesDestroyed: 12,
            coreHpBefore: 900,
            coreHpAfter: 820,
            coreMaxHp: 1000,
            confidenceBefore: 30,
            confidenceAfter: 54,
            buildingsDamaged: 3,
            buildingsDestroyed: 1
        });

        expect(summary.coreDamage).toBe(80);
        expect(summary.confidenceGained).toBe(24);
        expect(summary.coreHpPercent).toBe(82);
        expect(summary.outcome).toBe('survived');
        expect(summary.lines).toEqual([
            'Wave 4 survived',
            'Defense removed 12 intrusions',
            '+24.00 Confidence from factory growth',
            'Core integrity 82% (-80 HP)',
            '1 building lost, 3 damaged'
        ]);
    });

    test('clamps negative deltas so summaries stay readable', () => {
        const summary = createWaveResultSummary({
            wave: 2,
            enemiesDestroyed: 0,
            coreHpBefore: 700,
            coreHpAfter: 720,
            coreMaxHp: 1000,
            confidenceBefore: 12,
            confidenceAfter: 10,
            buildingsDamaged: 0,
            buildingsDestroyed: 0
        });

        expect(summary.coreDamage).toBe(0);
        expect(summary.confidenceGained).toBe(0);
        expect(summary.lines).toContain('+0.00 Confidence from factory growth');
    });
});
