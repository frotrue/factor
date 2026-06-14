import { describe, expect, it } from 'vitest';

async function readTokensCss(): Promise<string> {
    // @ts-expect-error Vitest runs this source-boundary test in Node, while app tsconfig omits Node types.
    const { readFileSync } = await import('node:fs') as {
        readFileSync(path: URL, encoding: 'utf8'): string;
    };
    return readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
}

function readCssVariable(source: string, name: string): string {
    const match = source.match(new RegExp(`${name}:\\s*([^;]+);`));
    return match?.[1]?.trim() ?? '';
}

describe('Preact UI design tokens', () => {
    it('keeps the tactical hologram palette and typography tokens available globally', async () => {
        const tokensCssSource = await readTokensCss();

        expect(readCssVariable(tokensCssSource, '--holo-cyan')).toBe('#4dd8ff');
        expect(readCssVariable(tokensCssSource, '--holo-magenta')).toBe('#f06cff');
        expect(readCssVariable(tokensCssSource, '--holo-green')).toBe('#64f58d');
        expect(readCssVariable(tokensCssSource, '--holo-amber')).toBe('#f6c453');
        expect(readCssVariable(tokensCssSource, '--holo-red')).toBe('#ff6676');
        expect(readCssVariable(tokensCssSource, '--bg-void')).toBe('#030508');
        expect(readCssVariable(tokensCssSource, '--font-display')).toBe("'Rajdhani', sans-serif");
        expect(readCssVariable(tokensCssSource, '--font-mono')).toBe("'Share Tech Mono', monospace");
    });

    it('keeps spacing, radius, shadow, and transition scales for shared Preact controls', async () => {
        const tokensCssSource = await readTokensCss();

        expect(readCssVariable(tokensCssSource, '--space-1')).toBe('4px');
        expect(readCssVariable(tokensCssSource, '--space-2')).toBe('8px');
        expect(readCssVariable(tokensCssSource, '--space-8')).toBe('32px');
        expect(readCssVariable(tokensCssSource, '--radius-lg')).toBe('8px');
        expect(readCssVariable(tokensCssSource, '--shadow-panel')).toContain('rgba(0, 0, 0, 0.48)');
        expect(readCssVariable(tokensCssSource, '--shadow-glow-cyan')).toContain('rgba(77, 216, 255, 0.45)');
        expect(readCssVariable(tokensCssSource, '--transition-base')).toBe('0.2s ease');
    });

    it('keeps legacy fallback aliases mapped to the new token names during migration', async () => {
        const tokensCssSource = await readTokensCss();

        expect(readCssVariable(tokensCssSource, '--neon-cyan')).toBe('var(--holo-cyan)');
        expect(readCssVariable(tokensCssSource, '--neon-magenta')).toBe('var(--holo-magenta)');
        expect(readCssVariable(tokensCssSource, '--bg-dark')).toBe('var(--bg-void)');
        expect(readCssVariable(tokensCssSource, '--surface-panel')).toBe('var(--bg-panel)');
        expect(readCssVariable(tokensCssSource, '--text-main')).toBe('var(--text-primary)');
        expect(readCssVariable(tokensCssSource, '--state-danger')).toBe('var(--holo-red)');
    });

    it('keeps the Preact HUD overlay above the canvas without intercepting pointer input by default', async () => {
        const tokensCssSource = await readTokensCss();

        expect(tokensCssSource).toMatch(/#preact-hud\s*{[^}]*position:\s*fixed;/s);
        expect(tokensCssSource).toMatch(/#preact-hud\s*{[^}]*inset:\s*0;/s);
        expect(tokensCssSource).toMatch(/#preact-hud\s*{[^}]*z-index:\s*2200;/s);
        expect(tokensCssSource).toMatch(/#preact-hud\s*{[^}]*pointer-events:\s*none;/s);
    });
});
