import { afterEach, describe, expect, it } from 'vitest';
import EventBus from '../managers/EventBus';
import TopHudController from './TopHudController';
import type { LegacyTopHudRefs } from './legacyTopHud';

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

const owner = 'TopHudController.test';

function createController() {
    const events = new FakeSceneEvents();
    const scene = {
        events,
        time: { now: 0 }
    };
    const refs: LegacyTopHudRefs = {
        packetsEl: null,
        powerEl: null,
        scoreEl: null,
        siliconEl: null,
        waveEl: null,
        waveTimerEl: null
    };

    return {
        controller: new TopHudController(scene as any, refs),
        events
    };
}

describe('TopHudController', () => {
    afterEach(() => {
        EventBus.offAll(owner);
        EventBus.offAll('TopHudController');
    });

    it('removes its EventBus listeners on scene shutdown', () => {
        const snapshots: unknown[] = [];
        const { controller, events } = createController();

        EventBus.on('HUD_STATE_UPDATED', snapshot => {
            snapshots.push(snapshot);
        }, owner);

        controller.setupEvents();
        EventBus.emit('CORE_DATA_RECEIVED', { score: 42, total: 42, type: 'DATA' });
        expect(snapshots).toHaveLength(1);

        events.emitShutdown();
        EventBus.emit('CORE_DATA_RECEIVED', { score: 43, total: 43, type: 'DATA' });

        expect(snapshots).toHaveLength(1);
    });
});
