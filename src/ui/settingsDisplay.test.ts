import { describe, expect, it } from 'vitest';
import {
    DEFAULT_FPS_LIMIT,
    DEFAULT_VOLUME_PERCENT,
    MAX_FPS_LIMIT,
    MIN_FPS_LIMIT,
    createSettingsDisplayPayload,
    normalizeFpsLimit,
    normalizeVolumePercent
} from './settingsDisplay';

describe('settingsDisplay', () => {
    it('normalizes FPS limits at the display boundary', () => {
        expect(normalizeFpsLimit(5)).toBe(MIN_FPS_LIMIT);
        expect(normalizeFpsLimit(500)).toBe(MAX_FPS_LIMIT);
        expect(normalizeFpsLimit(Number.NaN)).toBe(DEFAULT_FPS_LIMIT);
    });

    it('normalizes volume percentages at the display boundary', () => {
        expect(normalizeVolumePercent(-1)).toBe(0);
        expect(normalizeVolumePercent(101)).toBe(100);
        expect(normalizeVolumePercent(42.7)).toBe(43);
        expect(normalizeVolumePercent(Number.NaN)).toBe(DEFAULT_VOLUME_PERCENT);
    });

    it('keeps legacy settings inputs and Preact snapshot on the same normalized values', () => {
        const payload = createSettingsDisplayPayload({
            bloomEnabled: true,
            fps: 999,
            language: 'ko',
            muted: false,
            open: true,
            speed: 2,
            volume: Number.NaN
        });

        expect(payload.legacySettings.inputs.fps).toBe(MAX_FPS_LIMIT);
        expect(payload.snapshot.fps).toBe(MAX_FPS_LIMIT);
        expect(payload.legacySettings.inputs.volume).toBe(DEFAULT_VOLUME_PERCENT);
        expect(payload.snapshot.volume).toBe(DEFAULT_VOLUME_PERCENT);
        expect(payload.legacySettings.open).toBe(true);
        expect(payload.snapshot.open).toBe(true);
    });
});
