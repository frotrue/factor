import { afterEach, describe, expect, it, vi } from 'vitest';
import EventBus from '../managers/EventBus';
import HudShellController from './HudShellController';

const legacyHudDomMock = vi.hoisted(() => ({
    hideLegacyModalFallbacks: vi.fn(),
    syncLegacyHudShellShadow: vi.fn(),
    updateLegacySpeedButtons: vi.fn()
}));

const domEnvironmentMock = vi.hoisted(() => ({
    isMobileLayoutActive: vi.fn(() => false),
    isShortLandscapeLayout: vi.fn(() => false),
    restoreGameCanvasFocus: vi.fn()
}));

vi.mock('./legacyHudDom', () => legacyHudDomMock);
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

class FakeKeyboard {
    private keydownHandlers = new Set<(event: KeyboardEvent) => void>();

    on(event: string, handler: (event: KeyboardEvent) => void): void {
        if (event === 'keydown') {
            this.keydownHandlers.add(handler);
        }
    }

    off(event: string, handler: (event: KeyboardEvent) => void): void {
        if (event === 'keydown') {
            this.keydownHandlers.delete(handler);
        }
    }

    emitKey(key: string): void {
        this.keydownHandlers.forEach(handler => handler({ key } as KeyboardEvent));
    }

    listenerCount(): number {
        return this.keydownHandlers.size;
    }
}

const owner = 'HudShellController.test';

function createController(handleKeyboard = vi.fn(() => false)) {
    const events = new FakeSceneEvents();
    const keyboard = new FakeKeyboard();
    const scene = {
        events,
        input: { keyboard }
    };
    const buildConsole = { handleKeyboard };

    return {
        buildConsole,
        controller: new HudShellController(scene as any, buildConsole as any),
        events,
        keyboard
    };
}

describe('HudShellController', () => {
    afterEach(() => {
        EventBus.offAll(owner);
        EventBus.offAll('HudShellController');
        vi.clearAllMocks();
        domEnvironmentMock.isMobileLayoutActive.mockReturnValue(false);
        domEnvironmentMock.isShortLandscapeLayout.mockReturnValue(false);
    });

    it('routes shell sync and speed events through legacy DOM display helpers', () => {
        const { controller } = createController();
        domEnvironmentMock.isMobileLayoutActive.mockReturnValue(true);
        domEnvironmentMock.isShortLandscapeLayout.mockReturnValue(false);

        controller.setupEvents();
        EventBus.emit('GAME_SPEED_CHANGED', { speed: 2 });
        EventBus.emit('HUD_SHELL_SYNC_REQUESTED');

        expect(legacyHudDomMock.updateLegacySpeedButtons).toHaveBeenCalledWith(2);
        expect(legacyHudDomMock.syncLegacyHudShellShadow).toHaveBeenCalledWith(true, false);
    });

    it('closes legacy modal fallbacks and Preact modal snapshots on Escape', () => {
        const settingsOpenStates: boolean[] = [];
        const { controller, keyboard, buildConsole } = createController();

        EventBus.on('SETTINGS_MODAL_OPEN_CHANGED', ({ open }) => {
            settingsOpenStates.push(open);
        }, owner);

        controller.setupEvents();
        keyboard.emitKey('Escape');

        expect(buildConsole.handleKeyboard).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
        expect(legacyHudDomMock.hideLegacyModalFallbacks).toHaveBeenCalledTimes(1);
        expect(settingsOpenStates).toEqual([false]);
        expect(domEnvironmentMock.restoreGameCanvasFocus).toHaveBeenCalledTimes(1);
    });

    it('lets the build console consume keyboard events before Escape handling', () => {
        const { controller, keyboard } = createController(vi.fn(() => true));

        controller.setupEvents();
        keyboard.emitKey('Escape');

        expect(legacyHudDomMock.hideLegacyModalFallbacks).not.toHaveBeenCalled();
        expect(domEnvironmentMock.restoreGameCanvasFocus).not.toHaveBeenCalled();
    });

    it('removes keyboard and EventBus listeners on scene shutdown', () => {
        const { controller, events, keyboard } = createController();

        controller.setupEvents();
        expect(keyboard.listenerCount()).toBe(1);

        events.emitShutdown();
        expect(keyboard.listenerCount()).toBe(0);

        EventBus.emit('GAME_SPEED_CHANGED', { speed: 3 });
        EventBus.emit('HUD_SHELL_SYNC_REQUESTED');

        expect(legacyHudDomMock.updateLegacySpeedButtons).not.toHaveBeenCalled();
        expect(legacyHudDomMock.syncLegacyHudShellShadow).not.toHaveBeenCalled();
    });
});
