import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    RENDER_RESOLUTION_STORAGE_KEY,
    applyRenderResolution,
    normalizeRenderResolutionPreset,
    resolveRenderResolutionPreset
} from './renderResolution';

class FakeStorage {
    private values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

describe('renderResolution', () => {
    const originalLocalStorage = globalThis.localStorage;
    const originalDocument = globalThis.document;

    afterEach(() => {
        vi.restoreAllMocks();
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: originalLocalStorage
        });
        Object.defineProperty(globalThis, 'document', {
            configurable: true,
            value: originalDocument
        });
    });

    it('normalizes unknown presets to auto and resolves fixed 16:9 sizes', () => {
        expect(normalizeRenderResolutionPreset('nope')).toBe('auto');
        expect(resolveRenderResolutionPreset('1920x1080')).toMatchObject({
            height: 1080,
            preset: '1920x1080',
            profile: 'fhd',
            width: 1920
        });
        expect(resolveRenderResolutionPreset('3840x2160')).toMatchObject({
            height: 2160,
            preset: '3840x2160',
            profile: 'uhd',
            width: 3840
        });
    });

    it('uses viewport dimensions for auto', () => {
        expect(resolveRenderResolutionPreset('auto', { width: 2111, height: 977 })).toMatchObject({
            height: 977,
            preset: 'auto',
            profile: 'fhd',
            width: 2111
        });
    });

    it('applies a preset to Phaser scale without requiring campaign save state', () => {
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: new FakeStorage()
        });
        globalThis.localStorage.setItem(RENDER_RESOLUTION_STORAGE_KEY, '1920x1080');

        const scale = {
            gameSize: { width: 1280, height: 720 },
            height: 720,
            refresh: vi.fn(),
            setGameSize: vi.fn((width: number, height: number) => {
                scale.gameSize.width = width;
                scale.gameSize.height = height;
                scale.width = width;
                scale.height = height;
            }),
            width: 1280
        };

        const result = applyRenderResolution({ scale } as any, '2560x1440');

        expect(result).toMatchObject({
            height: 1440,
            preset: '2560x1440',
            width: 2560
        });
        expect(scale.setGameSize).toHaveBeenCalledWith(2560, 1440);
        expect(scale.refresh).toHaveBeenCalledTimes(1);
    });
});
