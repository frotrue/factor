import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EventBus from '../managers/EventBus';
import HudLocalizationController from './HudLocalizationController';

const i18nMock = vi.hoisted(() => ({
    translateStaticDom: vi.fn()
}));

vi.mock('../i18n', () => i18nMock);

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

const owner = 'HudLocalizationController.test';
let originalWindow: typeof globalThis.window | undefined;

function createController() {
    const events = new FakeSceneEvents();
    const scene = { events };

    return {
        controller: new HudLocalizationController(scene as any),
        events
    };
}

function collectRefreshEvents() {
    const refreshEvents: string[] = [];

    EventBus.on('BUILD_CONSOLE_REFRESH_REQUESTED', () => {
        refreshEvents.push('build');
    }, owner);
    EventBus.on('MOBILE_UI_REBUILD_REQUESTED', () => {
        refreshEvents.push('mobile');
    }, owner);
    EventBus.on('TACTICAL_PANELS_REFRESH_REQUESTED', () => {
        refreshEvents.push('tactical');
    }, owner);

    return refreshEvents;
}

describe('HudLocalizationController', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: new FakeWindow()
        });
    });

    afterEach(() => {
        EventBus.offAll(owner);
        EventBus.offAll('HudLocalizationController');
        vi.clearAllMocks();
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: originalWindow
        });
    });

    it('translates static DOM and requests localized UI refreshes on setup', () => {
        const refreshEvents = collectRefreshEvents();
        const { controller } = createController();

        controller.setupEvents();

        expect(i18nMock.translateStaticDom).toHaveBeenCalledTimes(1);
        expect(refreshEvents).toEqual(['build', 'mobile', 'tactical']);
        expect((globalThis.window as unknown as FakeWindow).listenerCount()).toBe(1);
    });

    it('refreshes build, mobile, and tactical UI when language changes', () => {
        const refreshEvents = collectRefreshEvents();
        const { controller } = createController();

        controller.setupEvents();
        (globalThis.window as unknown as FakeWindow).dispatchLanguageChange();

        expect(i18nMock.translateStaticDom).toHaveBeenCalledTimes(2);
        expect(refreshEvents).toEqual([
            'build',
            'mobile',
            'tactical',
            'build',
            'mobile',
            'tactical'
        ]);
    });

    it('does not duplicate the window language listener when setup reruns', () => {
        const refreshEvents = collectRefreshEvents();
        const { controller } = createController();
        const fakeWindow = globalThis.window as unknown as FakeWindow;

        controller.setupEvents();
        controller.setupEvents();
        expect(fakeWindow.listenerCount()).toBe(1);

        fakeWindow.dispatchLanguageChange();

        expect(i18nMock.translateStaticDom).toHaveBeenCalledTimes(3);
        expect(refreshEvents).toHaveLength(9);
    });

    it('removes the language listener on scene shutdown', () => {
        const refreshEvents = collectRefreshEvents();
        const { controller, events } = createController();
        const fakeWindow = globalThis.window as unknown as FakeWindow;

        controller.setupEvents();
        events.emitShutdown();
        expect(fakeWindow.listenerCount()).toBe(0);

        fakeWindow.dispatchLanguageChange();

        expect(i18nMock.translateStaticDom).toHaveBeenCalledTimes(1);
        expect(refreshEvents).toEqual(['build', 'mobile', 'tactical']);
    });
});
