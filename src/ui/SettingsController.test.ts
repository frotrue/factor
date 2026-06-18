import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EventBus from '../managers/EventBus';
import SettingsController from './SettingsController';

const i18nMock = vi.hoisted(() => {
    let language = 'ko';
    return {
        getLanguage: vi.fn(() => language),
        isLanguage: vi.fn((value: string | undefined) => value === 'ko' || value === 'en'),
        setLanguage: vi.fn((value: string) => {
            language = value;
        }),
        t: vi.fn((key: string) => key),
        __setLanguage: (value: string) => {
            language = value;
        }
    };
});

const settingsDisplayMock = vi.hoisted(() => ({
    DEFAULT_FPS_LIMIT: 60,
    DEFAULT_VOLUME_PERCENT: 60,
    createSettingsDisplayPayload: vi.fn((input: any) => ({
        legacySettings: {
            open: input.open,
            inputs: {
                bloomEnabled: input.bloomEnabled,
                fps: input.fps,
                language: input.language,
                muted: input.muted,
                renderResolutionPreset: input.renderResolutionPreset,
                volume: input.volume
            }
        },
        snapshot: { ...input }
    })),
    normalizeFpsLimit: vi.fn((value: number) => Number.isFinite(value)
        ? Math.max(30, Math.min(240, value))
        : 60),
    normalizeVolumePercent: vi.fn((value: number) => Number.isFinite(value)
        ? Math.max(0, Math.min(100, Math.round(value)))
        : 60)
}));

let refsMock: any;

const legacySettingsMock = vi.hoisted(() => ({
    getLegacySettingsRefs: vi.fn(() => refsMock),
    guardLegacySettingsRefs: vi.fn(),
    setLegacySettingsOpen: vi.fn(),
    syncLegacySettingsInputs: vi.fn()
}));

const domEnvironmentMock = vi.hoisted(() => ({
    guardDomPointer: vi.fn(),
    restoreGameCanvasFocus: vi.fn()
}));

vi.mock('../i18n', () => i18nMock);
vi.mock('./settingsDisplay', () => settingsDisplayMock);
vi.mock('./legacySettings', () => legacySettingsMock);
vi.mock('./domEnvironment', () => domEnvironmentMock);

class FakeSceneEvents {
    private shutdownHandlers: Array<() => void> = [];

    once(event: string, handler: () => void): void {
        if (event === 'shutdown') {
            this.shutdownHandlers.push(handler);
        }
    }

    emitShutdown(): void {
        this.shutdownHandlers.splice(0).forEach(handler => handler());
    }
}

class FakeWindow {
    private languageHandlers = new Set<() => void>();

    addEventListener(event: string, handler: () => void): void {
        if (event === 'languagechange') {
            this.languageHandlers.add(handler);
        }
    }

    removeEventListener(event: string, handler: () => void): void {
        if (event === 'languagechange') {
            this.languageHandlers.delete(handler);
        }
    }

    dispatchLanguageChange(): void {
        this.languageHandlers.forEach(handler => handler());
    }

    listenerCount(): number {
        return this.languageHandlers.size;
    }
}

class FakeStorage {
    private values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

const owner = 'SettingsController.test';
let originalWindow: typeof globalThis.window | undefined;
let originalLocalStorage: typeof globalThis.localStorage | undefined;

function createButton(id = '') {
    return {
        dataset: {} as Record<string, string>,
        id,
        onclick: null as ((event: any) => void) | null
    };
}

function createRefs() {
    return {
        bloomInput: { checked: true, onchange: null },
        btnClose: createButton('btn-close-settings'),
        btnLoad: createButton('btn-load'),
        btnResetTutorial: createButton('btn-reset-tutorial'),
        btnSave: createButton('btn-save'),
        btnSettings: createButton('btn-settings'),
        fpsButtons: [
            { ...createButton('fps-60'), dataset: { fps: '60' } },
            { ...createButton('fps-144'), dataset: { fps: '144' } }
        ],
        languageButtons: [
            { ...createButton('lang-ko'), dataset: { language: 'ko' } },
            { ...createButton('lang-en'), dataset: { language: 'en' } }
        ],
        modalSettings: { id: 'settings-modal' },
        mutedInput: { checked: false, onchange: null },
        speedButtons: [1, 2, 3].map(speed => createButton(`btn-speed-${speed}`)),
        volumeInput: { oninput: null, value: '60' }
    };
}

function createController() {
    const events = new FakeSceneEvents();
    const scene = {
        bloomEnabled: true,
        difficultyId: 'NORMAL',
        events,
        game: {
            loop: { targetFps: 60 },
            scale: {
                gameSize: { width: 1280, height: 720 },
                height: 720,
                refresh: vi.fn(),
                setGameSize: vi.fn((width: number, height: number) => {
                    scene.game.scale.gameSize.width = width;
                    scene.game.scale.gameSize.height = height;
                    scene.game.scale.width = width;
                    scene.game.scale.height = height;
                }),
                width: 1280
            }
        },
        gameSpeed: 1,
        scene: {
            start: vi.fn()
        },
        setBloomEnabled: vi.fn((enabled: boolean) => {
            scene.bloomEnabled = enabled;
        }),
        setGameSpeed: vi.fn((speed: number) => {
            scene.gameSpeed = speed;
        }),
        soundManager: {
            getSettings: vi.fn(() => ({ masterVolume: 0.42, muted: true }))
        }
    };

    return {
        controller: new SettingsController(scene as any),
        events,
        scene
    };
}

function collectEvents() {
    const audio: any[] = [];
    const load: unknown[] = [];
    const save: unknown[] = [];
    const snapshots: any[] = [];
    const activity: any[] = [];

    EventBus.on('SETTINGS_MODAL_UPDATED', snapshot => {
        snapshots.push(snapshot);
    }, owner);
    EventBus.on('AUDIO_SETTINGS_CHANGED', payload => {
        audio.push(payload);
    }, owner);
    EventBus.on('SAVE_REQUESTED', payload => {
        save.push(payload);
    }, owner);
    EventBus.on('LOAD_REQUESTED', payload => {
        load.push(payload);
    }, owner);
    EventBus.on('ACTIVITY_LOG_ENTRY_REQUESTED', payload => {
        activity.push(payload);
    }, owner);

    return { activity, audio, load, save, snapshots };
}

function setupController() {
    refsMock = createRefs();
    const events = collectEvents();
    const setup = createController();
    setup.controller.setup();
    events.snapshots.length = 0;
    legacySettingsMock.setLegacySettingsOpen.mockClear();
    legacySettingsMock.syncLegacySettingsInputs.mockClear();
    return { ...setup, collected: events, refs: refsMock };
}

describe('SettingsController', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        originalLocalStorage = globalThis.localStorage;
        refsMock = createRefs();
        i18nMock.__setLanguage('ko');
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: new FakeWindow()
        });
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: new FakeStorage()
        });
    });

    afterEach(() => {
        EventBus.offAll(owner);
        EventBus.offAll('SettingsController');
        vi.clearAllMocks();
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: originalWindow
        });
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: originalLocalStorage
        });
    });

    it('initializes legacy settings controls and publishes a closed snapshot on setup', () => {
        const collected = collectEvents();
        const { controller, scene } = createController();

        controller.setup();

        expect(legacySettingsMock.guardLegacySettingsRefs).toHaveBeenCalledWith(refsMock, domEnvironmentMock.guardDomPointer);
        expect(legacySettingsMock.syncLegacySettingsInputs).toHaveBeenCalledWith(refsMock, expect.objectContaining({
            bloomEnabled: true,
            fps: 60,
            language: 'ko',
            muted: true,
            volume: 42
        }));
        expect(scene.game.loop.targetFps).toBe(60);
        expect(collected.snapshots.at(-1)).toMatchObject({
            bloomEnabled: true,
            fps: 60,
            language: 'ko',
            muted: true,
            open: false,
            renderResolutionPreset: 'auto',
            speed: 1,
            volume: 42
        });
        expect((globalThis.window as unknown as FakeWindow).listenerCount()).toBe(1);
    });

    it('opens and closes through EventBus while keeping legacy shadow fallback synced', () => {
        const { collected } = setupController();

        EventBus.emit('SETTINGS_OPEN_REQUESTED');
        EventBus.emit('SETTINGS_CLOSE_REQUESTED');

        expect(legacySettingsMock.setLegacySettingsOpen).toHaveBeenCalledWith(refsMock, true);
        expect(legacySettingsMock.setLegacySettingsOpen).toHaveBeenLastCalledWith(refsMock, false);
        expect(collected.snapshots.map(snapshot => snapshot.open)).toEqual([true, false]);
        expect(domEnvironmentMock.restoreGameCanvasFocus).toHaveBeenCalledTimes(1);
    });

    it('applies speed, fps, audio, bloom, and language requests through existing scene and settings paths', () => {
        const { collected, refs, scene } = setupController();

        EventBus.emit('SETTINGS_SPEED_REQUESTED', { speed: 3 });
        EventBus.emit('SETTINGS_FPS_REQUESTED', { fps: 999 });
        EventBus.emit('SETTINGS_RENDER_RESOLUTION_REQUESTED', { preset: '2560x1440' });
        EventBus.emit('SETTINGS_AUDIO_REQUESTED', { volume: 150, muted: false });
        EventBus.emit('SETTINGS_BLOOM_REQUESTED', { enabled: false });
        EventBus.emit('SETTINGS_LANGUAGE_REQUESTED', { language: 'en' });

        expect(scene.setGameSpeed).toHaveBeenCalledWith(3);
        expect(scene.game.loop.targetFps).toBe(240);
        expect(globalThis.localStorage.getItem('gradium_fps_limit')).toBe('240');
        expect(scene.game.scale.setGameSize).toHaveBeenCalledWith(2560, 1440);
        expect(globalThis.localStorage.getItem('gradium_render_resolution')).toBe('2560x1440');
        expect(refs.volumeInput.value).toBe('100');
        expect(refs.mutedInput.checked).toBe(false);
        expect(collected.audio).toEqual([{ masterVolume: 1, muted: false }]);
        expect(refs.bloomInput.checked).toBe(false);
        expect(scene.setBloomEnabled).toHaveBeenCalledWith(false);
        expect(i18nMock.setLanguage).toHaveBeenCalledWith('en');
        expect(collected.snapshots.at(-1)).toMatchObject({
            bloomEnabled: false,
            fps: 240,
            language: 'en',
            muted: false,
            renderResolutionPreset: '2560x1440',
            speed: 3,
            volume: 100
        });
    });

    it('keeps legacy button fallbacks wired to existing save, load, language, and tutorial paths', () => {
        const { collected, refs, scene } = setupController();
        const event = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn()
        };

        refs.btnSave.onclick?.(event);
        refs.btnLoad.onclick?.(event);
        refs.languageButtons[1].onclick?.(event);
        refs.btnResetTutorial.onclick?.(event);

        expect(collected.save).toHaveLength(1);
        expect(collected.load).toHaveLength(1);
        expect(i18nMock.setLanguage).toHaveBeenCalledWith('en');
        expect(globalThis.localStorage.getItem('gradium_tutorial_completed')).toBe('false');
        expect(globalThis.localStorage.getItem('gradium_tutorial_step')).toBe('0');
        expect(collected.activity).toEqual([{ message: 'log.tutorialRestarted' }]);
        expect(scene.scene.start).toHaveBeenCalledWith('MainScene', {
            difficulty: 'NORMAL',
            mode: 'tutorial'
        });
    });

    it('removes EventBus and language listeners on scene shutdown', () => {
        const { collected, events, scene } = setupController();
        const fakeWindow = globalThis.window as unknown as FakeWindow;

        events.emitShutdown();
        expect(fakeWindow.listenerCount()).toBe(0);

        EventBus.emit('SETTINGS_SPEED_REQUESTED', { speed: 2 });
        fakeWindow.dispatchLanguageChange();

        expect(scene.setGameSpeed).not.toHaveBeenCalled();
        expect(collected.snapshots).toEqual([]);
    });
});
