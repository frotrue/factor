import { textForKey, type Language } from '../i18n';
import type { RenderResolutionPreset, SettingsModalSnapshot } from '../types';
import { normalizeRenderResolutionPreset } from './renderResolution';

export const DEFAULT_FPS_LIMIT = 60;
export const MIN_FPS_LIMIT = 30;
export const MAX_FPS_LIMIT = 240;
export const DEFAULT_VOLUME_PERCENT = 60;

export interface SettingsSnapshotInput {
    bloomEnabled: boolean;
    fps: number;
    language: Language;
    muted: boolean;
    open: boolean;
    renderResolutionPreset: RenderResolutionPreset;
    speed: number;
    volume: number;
}

export interface SettingsLegacyDisplay {
    open: boolean;
    inputs: {
        bloomEnabled: boolean;
        fps: number;
        language: Language;
        muted: boolean;
        renderResolutionPreset: RenderResolutionPreset;
        volume: number;
    };
}

export interface SettingsDisplayPayload {
    legacySettings: SettingsLegacyDisplay;
    snapshot: SettingsModalSnapshot;
}

export function normalizeFpsLimit(value: number): number {
    return Number.isFinite(value)
        ? Math.max(MIN_FPS_LIMIT, Math.min(MAX_FPS_LIMIT, value))
        : DEFAULT_FPS_LIMIT;
}

export function normalizeVolumePercent(value: number): number {
    return Number.isFinite(value)
        ? Math.max(0, Math.min(100, Math.round(value)))
        : DEFAULT_VOLUME_PERCENT;
}

export function createSettingsModalSnapshot({
    bloomEnabled,
    fps,
    language,
    muted,
    open,
    renderResolutionPreset,
    speed,
    volume
}: SettingsSnapshotInput): SettingsModalSnapshot {
    const normalizedFps = normalizeFpsLimit(fps);
    const normalizedVolume = normalizeVolumePercent(volume);
    const normalizedRenderResolutionPreset = normalizeRenderResolutionPreset(renderResolutionPreset);

    return {
        open,
        speed,
        fps: normalizedFps,
        renderResolutionPreset: normalizedRenderResolutionPreset,
        volume: normalizedVolume,
        muted,
        bloomEnabled,
        language,
        labels: createSettingsLabels()
    };
}

function createSettingsLabels(): SettingsModalSnapshot['labels'] {
    return {
        aria: textForKey('settings.aria'),
        kicker: textForKey('settings.title'),
        title: textForKey('settings.controlTitle'),
        close: textForKey('settings.close'),
        tabs: {
            game: textForKey('settings.tab.game'),
            audio: textForKey('settings.tab.audio'),
            graphics: textForKey('settings.tab.graphics'),
            system: textForKey('settings.tab.system')
        },
        speed: textForKey('settings.speed'),
        language: textForKey('settings.language'),
        languageKo: textForKey('settings.language.ko'),
        languageEn: textForKey('settings.language.en'),
        masterVolume: textForKey('settings.masterVolume'),
        muted: textForKey('settings.muted'),
        graphics: textForKey('settings.graphics'),
        fps: textForKey('settings.fps'),
        renderResolution: textForKey('settings.renderResolution'),
        renderResolutionOptions: {
            auto: textForKey('settings.renderResolution.auto'),
            '1920x1080': textForKey('settings.renderResolution.1920'),
            '2560x1440': textForKey('settings.renderResolution.2560'),
            '3840x2160': textForKey('settings.renderResolution.3840')
        },
        saveData: textForKey('settings.saveData'),
        save: textForKey('settings.save'),
        load: textForKey('settings.load'),
        tutorial: textForKey('settings.tutorial'),
        restartTutorial: textForKey('settings.restartTutorial'),
        note: textForKey('settings.syncedNote'),
        bloomOn: textForKey('settings.bloomOn'),
        bloomOff: textForKey('settings.bloomOff')
    };
}

export function withSettingsModalOpenState(
    snapshot: SettingsModalSnapshot,
    open: boolean
): SettingsModalSnapshot {
    return {
        ...snapshot,
        open
    };
}

export function createSettingsDisplayPayload(input: SettingsSnapshotInput): SettingsDisplayPayload {
    const normalizedFps = normalizeFpsLimit(input.fps);
    const normalizedVolume = normalizeVolumePercent(input.volume);
    const normalizedRenderResolutionPreset = normalizeRenderResolutionPreset(input.renderResolutionPreset);

    return {
        legacySettings: {
            open: input.open,
            inputs: {
                bloomEnabled: input.bloomEnabled,
                fps: normalizedFps,
                language: input.language,
                muted: input.muted,
                renderResolutionPreset: normalizedRenderResolutionPreset,
                volume: normalizedVolume
            }
        },
        snapshot: createSettingsModalSnapshot({
            ...input,
            fps: normalizedFps,
            renderResolutionPreset: normalizedRenderResolutionPreset,
            volume: normalizedVolume
        })
    };
}
