import type Phaser from 'phaser';
import type { RenderResolutionPreset } from '../types';

export const RENDER_RESOLUTION_STORAGE_KEY = 'gradium_render_resolution';
export const RENDER_RESOLUTION_CHANGED_EVENT = 'gradiumrenderresolutionchange';
export const RENDER_RESOLUTION_PRESETS = ['auto', '1920x1080', '2560x1440', '3840x2160'] as const;

type FixedRenderResolutionPreset = Exclude<RenderResolutionPreset, 'auto'>;
export type RenderResolutionProfile = 'fhd' | 'qhd' | 'uhd';

export interface ResolvedRenderResolution {
    preset: RenderResolutionPreset;
    width: number;
    height: number;
    profile: RenderResolutionProfile;
}

export interface HudStageSnapshot extends ResolvedRenderResolution {
    canvasLeft: number;
    canvasTop: number;
    canvasWidth: number;
    canvasHeight: number;
    scaleX: number;
    scaleY: number;
    style: Record<string, string>;
}

const FIXED_RENDER_RESOLUTIONS: Record<FixedRenderResolutionPreset, { width: number; height: number }> = {
    '1920x1080': { width: 1920, height: 1080 },
    '2560x1440': { width: 2560, height: 1440 },
    '3840x2160': { width: 3840, height: 2160 }
};

const FALLBACK_VIEWPORT = { width: 1920, height: 1080 };

export function normalizeRenderResolutionPreset(value: unknown): RenderResolutionPreset {
    return RENDER_RESOLUTION_PRESETS.includes(value as RenderResolutionPreset)
        ? value as RenderResolutionPreset
        : 'auto';
}

export function readStoredRenderResolutionPreset(): RenderResolutionPreset {
    if (typeof localStorage === 'undefined') return 'auto';
    return normalizeRenderResolutionPreset(localStorage.getItem(RENDER_RESOLUTION_STORAGE_KEY));
}

export function resolveRenderResolutionPreset(
    preset: RenderResolutionPreset,
    viewport = readViewportSize()
): ResolvedRenderResolution {
    const normalized = normalizeRenderResolutionPreset(preset);
    const size = normalized === 'auto'
        ? viewport
        : FIXED_RENDER_RESOLUTIONS[normalized];

    return {
        preset: normalized,
        width: Math.max(1, Math.round(size.width)),
        height: Math.max(1, Math.round(size.height)),
        profile: getRenderResolutionProfile(size.width)
    };
}

export function getInitialRenderResolution(): ResolvedRenderResolution {
    return resolveRenderResolutionPreset(readStoredRenderResolutionPreset());
}

export function applyRenderResolution(
    game: Phaser.Game | null | undefined,
    preset: RenderResolutionPreset
): ResolvedRenderResolution {
    const resolution = resolveRenderResolutionPreset(normalizeRenderResolutionPreset(preset));
    updateRenderResolutionMetadata(resolution);

    const scale = game?.scale;
    if (scale) {
        const currentWidth = scale.gameSize?.width ?? scale.width;
        const currentHeight = scale.gameSize?.height ?? scale.height;
        if (currentWidth !== resolution.width || currentHeight !== resolution.height) {
            scale.setGameSize(resolution.width, resolution.height);
        }
        (scale as unknown as { refresh?: () => void }).refresh?.();
    }

    dispatchRenderResolutionChanged(resolution);
    return resolution;
}

export function bindAutoRenderResolutionResize(game: Phaser.Game): () => void {
    if (typeof window === 'undefined') return () => undefined;
    let frame = 0;

    const syncAutoResolution = () => {
        if (frame) window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
            frame = 0;
            if (readStoredRenderResolutionPreset() === 'auto') {
                applyRenderResolution(game, 'auto');
            }
        });
    };

    window.addEventListener('resize', syncAutoResolution);
    window.addEventListener('orientationchange', syncAutoResolution);

    return () => {
        if (frame) window.cancelAnimationFrame(frame);
        window.removeEventListener('resize', syncAutoResolution);
        window.removeEventListener('orientationchange', syncAutoResolution);
    };
}

export function createHudStageSnapshot(game: Phaser.Game | null | undefined): HudStageSnapshot {
    const resolution = resolveGameResolution(game);
    const canvas = game?.canvas ?? (typeof document !== 'undefined'
        ? document.querySelector<HTMLCanvasElement>('#game-container canvas')
        : null);
    const rect = canvas?.getBoundingClientRect();
    const canvasWidth = rect?.width && rect.width > 0 ? rect.width : resolution.width;
    const canvasHeight = rect?.height && rect.height > 0 ? rect.height : resolution.height;
    const canvasLeft = rect?.left ?? 0;
    const canvasTop = rect?.top ?? 0;
    const scaleX = canvasWidth / resolution.width;
    const scaleY = canvasHeight / resolution.height;

    return {
        ...resolution,
        canvasLeft,
        canvasTop,
        canvasWidth,
        canvasHeight,
        scaleX,
        scaleY,
        style: {
            '--hud-stage-width': `${resolution.width}px`,
            '--hud-stage-height': `${resolution.height}px`,
            '--hud-canvas-width': `${canvasWidth}px`,
            '--hud-canvas-height': `${canvasHeight}px`,
            '--hud-scale-x': String(scaleX),
            '--hud-scale-y': String(scaleY),
            width: `${resolution.width}px`,
            height: `${resolution.height}px`,
            transform: `translate3d(${canvasLeft}px, ${canvasTop}px, 0) scale(${scaleX}, ${scaleY})`
        }
    };
}

function resolveGameResolution(game: Phaser.Game | null | undefined): ResolvedRenderResolution {
    const width = game?.scale?.gameSize?.width ?? game?.scale?.width ?? readViewportSize().width;
    const height = game?.scale?.gameSize?.height ?? game?.scale?.height ?? readViewportSize().height;
    const preset = readStoredRenderResolutionPreset();
    const fixed = preset !== 'auto' ? FIXED_RENDER_RESOLUTIONS[preset] : null;

    return {
        preset,
        width: fixed?.width ?? Math.max(1, Math.round(width)),
        height: fixed?.height ?? Math.max(1, Math.round(height)),
        profile: getRenderResolutionProfile(fixed?.width ?? width)
    };
}

function readViewportSize(): { width: number; height: number } {
    if (typeof window === 'undefined') return FALLBACK_VIEWPORT;
    const width = Number.isFinite(window.innerWidth) ? window.innerWidth : FALLBACK_VIEWPORT.width;
    const height = Number.isFinite(window.innerHeight) ? window.innerHeight : FALLBACK_VIEWPORT.height;
    return {
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height))
    };
}

function getRenderResolutionProfile(width: number): RenderResolutionProfile {
    if (width >= 3200) return 'uhd';
    if (width >= 2300) return 'qhd';
    return 'fhd';
}

function updateRenderResolutionMetadata(resolution: ResolvedRenderResolution): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.renderResolutionPreset = resolution.preset;
    document.documentElement.dataset.renderResolutionProfile = resolution.profile;
}

function dispatchRenderResolutionChanged(resolution: ResolvedRenderResolution): void {
    if (
        typeof window === 'undefined'
        || typeof window.dispatchEvent !== 'function'
        || typeof CustomEvent !== 'function'
    ) {
        return;
    }
    window.dispatchEvent(new CustomEvent(RENDER_RESOLUTION_CHANGED_EVENT, { detail: resolution }));
}
