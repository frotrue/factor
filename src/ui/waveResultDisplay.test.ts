import { describe, expect, it } from 'vitest';
import type { WaveResultSummary } from '../utils/waveResultSummary';
import {
    createLegacyWaveResultContent,
    createWaveResultDisplayPayload,
    createWaveResultSnapshot,
    createWaveResultStats,
    getWaveIntegrityTone
} from './waveResultDisplay';

function createSummary(overrides: Partial<WaveResultSummary> = {}): WaveResultSummary {
    return {
        buildingsDamaged: 2,
        buildingsDestroyed: 1,
        coreDamage: 30,
        coreHpPercent: 55,
        dataProcessed: 120,
        enemiesDestroyed: 8,
        lines: [],
        outcome: 'survived',
        wave: 4,
        ...overrides
    };
}

describe('waveResultDisplay', () => {
    it('uses shared stat labels for legacy cards and Preact snapshots', () => {
        const summary = createSummary();
        const snapshot = createWaveResultSnapshot(summary);
        const legacy = createLegacyWaveResultContent(summary);

        expect(legacy.items).toEqual(snapshot.stats.map(stat => stat.label));
        expect(snapshot.stats.map(stat => stat.id)).toEqual([
            'destroyed',
            'data',
            'integrity',
            'buildings'
        ]);
        expect(snapshot.stats.find(stat => stat.id === 'buildings')?.tone).toBe('warning');
    });

    it('keeps the display payload surfaces aligned', () => {
        const summary = createSummary({ buildingsDestroyed: 0, coreHpPercent: 90 });
        const payload = createWaveResultDisplayPayload(summary);

        expect(payload.legacyContent.items).toEqual(payload.snapshot.stats.map(stat => stat.label));
        expect(payload.snapshot.integrityTone).toBe('good');
        expect(payload.snapshot.stats.find(stat => stat.id === 'buildings')?.tone).toBe('default');
        expect(payload.logMessage).toContain(String(summary.wave));
    });

    it('classifies core integrity tones at the display boundary', () => {
        expect(getWaveIntegrityTone(10)).toBe('danger');
        expect(getWaveIntegrityTone(25)).toBe('danger');
        expect(getWaveIntegrityTone(26)).toBe('warning');
        expect(getWaveIntegrityTone(60)).toBe('warning');
        expect(getWaveIntegrityTone(61)).toBe('good');

        expect(createWaveResultStats(createSummary({ coreHpPercent: 25 }))[2].tone).toBe('danger');
    });
});
