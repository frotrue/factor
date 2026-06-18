import { describe, expect, test } from 'vitest';
import { createRunResultSummary } from './runResultSummary';

describe('createRunResultSummary', () => {
    test('summarizes reached wave, core integrity, data, and research', () => {
        const summary = createRunResultSummary({
            wave: 9,
            coreHp: 240,
            coreMaxHp: 1000,
            totalDataReceived: 180,
            unlockedResearchCount: 3
        });

        expect(summary.coreHpPercent).toBe(24);
        expect(summary.lines).toEqual([
            'Reached Wave 9',
            'Core integrity 24%',
            'Data delivered 180',
            'Research completed 3'
        ]);
    });
});
