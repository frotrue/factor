import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';
import tsconfig from '../../tsconfig.json';
import viteConfigSource from '../../vite.config.ts?raw';
import viteEnvSource from '../vite-env.d.ts?raw';

describe('Preact UI infrastructure', () => {
    it('keeps Preact, signals, and the Vite preset installed for DOM HUD overlays', () => {
        expect(packageJson.dependencies.preact).toBeTruthy();
        expect(packageJson.dependencies['@preact/signals']).toBeTruthy();
        expect(packageJson.devDependencies['@preact/preset-vite']).toBeTruthy();

        expect(viteConfigSource).toMatch(/from ['"]@preact\/preset-vite['"]/);
        expect(viteConfigSource).toMatch(/plugins:\s*\[\s*preact\(\)\s*\]/);
    });

    it('keeps Phaser and Preact split into explicit production chunks', () => {
        expect(viteConfigSource).toMatch(/manualChunks/);
        expect(viteConfigSource).toMatch(/phaser:\s*\[\s*['"]phaser['"]\s*\]/);
        expect(viteConfigSource).toMatch(/preact:\s*\[\s*['"]preact['"]\s*,\s*['"]@preact\/signals['"]\s*\]/);
        expect(viteConfigSource).toMatch(/chunkSizeWarningLimit:\s*1600/);
    });

    it('keeps TypeScript configured for Preact TSX and CSS modules', () => {
        expect(tsconfig.compilerOptions.jsx).toBe('react-jsx');
        expect(tsconfig.compilerOptions.jsxImportSource).toBe('preact');
        expect(tsconfig.include).toContain('src/**/*.tsx');

        expect(viteEnvSource).toMatch(/declare module ['"]\*\.module\.css['"]/);
        expect(viteEnvSource).toMatch(/Record<string, string>/);
    });
});
