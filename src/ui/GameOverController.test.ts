import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EventBus from '../managers/EventBus';
import GameOverController from './GameOverController';

const runResultSummaryMock = vi.hoisted(() => ({
    createRunResultSummary: vi.fn((input: any) => ({
        bestModelAccuracy: 91,
        bestModelDamageBonus: 18,
        bestModelName: 'Classifier',
        bestModelVersion: 4,
        coreHpPercent: 25,
        totalDataReceived: input.totalDataReceived,
        unlockedResearchCount: input.unlockedResearchCount,
        wave: input.wave
    }))
}));

const gameOverDisplayMock = vi.hoisted(() => ({
    createGameOverDisplayPayload: vi.fn((summary: any) => ({
        legacyStatLines: [`wave:${summary.wave}`, `data:${summary.totalDataReceived}`],
        snapshot: {
            coreHpPercent: summary.coreHpPercent,
            open: true,
            totalDataReceived: summary.totalDataReceived,
            wave: summary.wave
        }
    }))
}));

const legacyGameOverMock = vi.hoisted(() => ({
    bindLegacyGameOverRestart: vi.fn(),
    showLegacyGameOverScreen: vi.fn(),
    updateLegacyGameOverStats: vi.fn()
}));

vi.mock('../utils/runResultSummary', () => runResultSummaryMock);
vi.mock('./gameOverDisplay', () => gameOverDisplayMock);
vi.mock('./legacyGameOver', () => legacyGameOverMock);
vi.mock('../i18n', () => ({
    getBuildingName: vi.fn((type: string) => type)
}));

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

const owner = 'GameOverController.test';
let originalWindow: typeof globalThis.window | undefined;
let reloadMock: ReturnType<typeof vi.fn>;

function createController() {
    const events = new FakeSceneEvents();
    const scene = {
        buildingManager: {
            get: vi.fn(() => null)
        },
        defenseModelStates: {
            CLASSIFIER: { modelAccuracy: 91, damageBonus: 18, modelVersion: 4 }
        },
        events,
        researchManager: {
            getUnlockedResearch: vi.fn(() => ['AP_RELAY'])
        },
        waveManager: {
            currentWave: 7
        }
    };

    return {
        controller: new GameOverController(scene as any),
        events,
        scene
    };
}

describe('GameOverController', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        reloadMock = vi.fn();
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: { location: { reload: reloadMock } }
        });
    });

    afterEach(() => {
        EventBus.offAll(owner);
        EventBus.offAll('GameOverController');
        vi.clearAllMocks();
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: originalWindow
        });
    });

    it('publishes the Preact game-over snapshot and mirrors legacy stats on GAME_OVER', () => {
        const snapshots: any[] = [];
        const { controller } = createController();

        EventBus.on('GAME_OVER_UPDATED', snapshot => {
            snapshots.push(snapshot);
        }, owner);

        controller.setupEvents();
        EventBus.emit('GAME_OVER');

        expect(legacyGameOverMock.showLegacyGameOverScreen).toHaveBeenCalledTimes(1);
        expect(runResultSummaryMock.createRunResultSummary).toHaveBeenCalledWith(expect.objectContaining({
            coreHp: 0,
            coreMaxHp: 1,
            totalDataReceived: 0,
            unlockedResearchCount: 1,
            wave: 7
        }));
        expect(gameOverDisplayMock.createGameOverDisplayPayload).toHaveBeenCalledWith(expect.objectContaining({
            totalDataReceived: 0,
            wave: 7
        }));
        expect(legacyGameOverMock.updateLegacyGameOverStats).toHaveBeenCalledWith(['wave:7', 'data:0']);
        expect(legacyGameOverMock.bindLegacyGameOverRestart).toHaveBeenCalledWith(expect.any(Function));
        expect(snapshots).toEqual([{ coreHpPercent: 25, open: true, totalDataReceived: 0, wave: 7 }]);
    });

    it('routes both Preact and legacy restart actions through window reload', () => {
        const { controller } = createController();

        controller.setupEvents();
        EventBus.emit('GAME_OVER_ACTION_REQUESTED', { action: 'main-menu' });
        expect(reloadMock).toHaveBeenCalledTimes(1);

        EventBus.emit('GAME_OVER');
        const restartHandler = legacyGameOverMock.bindLegacyGameOverRestart.mock.calls[0][0] as () => void;
        restartHandler();

        expect(reloadMock).toHaveBeenCalledTimes(2);
    });

    it('removes EventBus listeners on scene shutdown', () => {
        const snapshots: any[] = [];
        const { controller, events } = createController();

        EventBus.on('GAME_OVER_UPDATED', snapshot => {
            snapshots.push(snapshot);
        }, owner);

        controller.setupEvents();
        events.emitShutdown();
        EventBus.emit('GAME_OVER');
        EventBus.emit('GAME_OVER_ACTION_REQUESTED', { action: 'restart' });

        expect(legacyGameOverMock.showLegacyGameOverScreen).not.toHaveBeenCalled();
        expect(snapshots).toEqual([]);
        expect(reloadMock).not.toHaveBeenCalled();
    });
});
