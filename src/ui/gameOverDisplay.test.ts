import { describe, expect, it } from 'vitest';
import type { RunResultSummary } from '../utils/runResultSummary';
import {
    createGameOverDisplayPayload,
    createGameOverModelStatLine,
    createGameOverSnapshot,
    createGameOverStatDisplays,
    createGameOverStats,
    createLegacyGameOverStatLines,
    getGameOverCoreTone
} from './gameOverDisplay';

function createSummary(overrides: Partial<RunResultSummary> = {}): RunResultSummary {
    return {
        bestModelAccuracy: 71,
        bestModelDamageBonus: 18,
        bestModelName: 'Firewall',
        bestModelVersion: 3,
        coreHpPercent: 24,
        lines: [],
        totalDataReceived: 450,
        unlockedResearchCount: 6,
        wave: 12,
        ...overrides
    };
}

describe('gameOverDisplay', () => {
    it('uses shared stat display entries for legacy lines and Preact stat cards', () => {
        const summary = createSummary();
        const displays = createGameOverStatDisplays(summary);
        const snapshot = createGameOverSnapshot(summary);
        const legacyLines = createLegacyGameOverStatLines(summary);

        expect(displays.map(display => display.id)).toEqual(['wave', 'core', 'data', 'research']);
        expect(snapshot.stats).toEqual(displays.map(({ legacyLine, ...stat }) => stat));
        expect(legacyLines.slice(0, displays.length)).toEqual(displays.map(display => display.legacyLine));
        expect(legacyLines.at(-1)).toBe(createGameOverModelStatLine(summary));
    });

    it('keeps display payload surfaces aligned', () => {
        const summary = createSummary({ coreHpPercent: 80 });
        const payload = createGameOverDisplayPayload(summary);

        expect(payload.snapshot.stats).toEqual(createGameOverStats(summary));
        expect(payload.legacyStatLines.slice(0, payload.snapshot.stats.length)).toEqual(
            createGameOverStatDisplays(summary).map(display => display.legacyLine)
        );
        expect(payload.snapshot.stats.find(stat => stat.id === 'core')?.tone).toBe('warn');
        expect(payload.snapshot.bestModelName).toBe(summary.bestModelName);
    });

    it('classifies core integrity tone at the display boundary', () => {
        expect(getGameOverCoreTone(0)).toBe('danger');
        expect(getGameOverCoreTone(25)).toBe('danger');
        expect(getGameOverCoreTone(26)).toBe('warn');

        expect(createGameOverStats(createSummary({ coreHpPercent: 25 }))[1].tone).toBe('danger');
    });
});
