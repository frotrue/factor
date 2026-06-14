import { afterEach, describe, expect, it, vi } from 'vitest';

class FakeGameEvents {
    private destroyHandlers: Array<() => void> = [];

    once(event: string, handler: () => void): void {
        if (event === 'destroy') {
            this.destroyHandlers.push(handler);
        }
    }

    emitDestroy(): void {
        this.destroyHandlers.splice(0).forEach(handler => handler());
    }
}

function installDocument(root: HTMLElement | null) {
    vi.stubGlobal('document', {
        getElementById: vi.fn((id: string) => id === 'preact-hud' ? root : null)
    });
}

async function loadMountHud() {
    vi.resetModules();
    const render = vi.fn();
    const disconnects = [vi.fn(), vi.fn(), vi.fn()];
    const connectGameStateBridge = vi.fn(() => disconnects[connectGameStateBridge.mock.calls.length - 1]);

    vi.doMock('preact', () => ({ render }));
    vi.doMock('./HudApp', () => ({ default: () => null }));
    vi.doMock('./signals/bridge', () => ({ connectGameStateBridge }));

    const { mountHud } = await import('./mountHud');
    return { connectGameStateBridge, disconnects, mountHud, render };
}

function createGame() {
    return {
        events: new FakeGameEvents()
    };
}

describe('mountHud', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        vi.resetModules();
    });

    it('warns and skips bridge/render work when #preact-hud is missing', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        installDocument(null);
        const { connectGameStateBridge, mountHud, render } = await loadMountHud();

        mountHud(createGame() as any);

        expect(warn).toHaveBeenCalledWith('Preact HUD root #preact-hud was not found.');
        expect(connectGameStateBridge).not.toHaveBeenCalled();
        expect(render).not.toHaveBeenCalled();
    });

    it('connects the bridge, renders the HUD, and unmounts on Phaser game destroy', async () => {
        const root = {} as HTMLElement;
        const game = createGame();
        installDocument(root);
        const { connectGameStateBridge, disconnects, mountHud, render } = await loadMountHud();

        mountHud(game as any);
        expect(connectGameStateBridge).toHaveBeenCalledTimes(1);
        expect(render).toHaveBeenCalledWith(expect.anything(), root);

        game.events.emitDestroy();

        expect(disconnects[0]).toHaveBeenCalledTimes(1);
        expect(render).toHaveBeenLastCalledWith(null, root);
    });

    it('tears down the previous HUD before remounting a new one', async () => {
        const root = {} as HTMLElement;
        const firstGame = createGame();
        const secondGame = createGame();
        installDocument(root);
        const { connectGameStateBridge, disconnects, mountHud, render } = await loadMountHud();

        mountHud(firstGame as any);
        mountHud(secondGame as any);

        expect(connectGameStateBridge).toHaveBeenCalledTimes(2);
        expect(disconnects[0]).toHaveBeenCalledTimes(1);
        expect(render).toHaveBeenCalledWith(null, root);

        firstGame.events.emitDestroy();
        expect(disconnects[0]).toHaveBeenCalledTimes(1);

        secondGame.events.emitDestroy();
        expect(disconnects[1]).toHaveBeenCalledTimes(1);
        expect(render).toHaveBeenLastCalledWith(null, root);
    });
});
