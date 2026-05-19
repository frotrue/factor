import { describe, expect, it } from 'vitest';
import EventBus from './EventBus';

describe('EventBus', () => {
    it('does not remove every listener when off is called without an owner or callback', () => {
        const calls: string[] = [];
        const first = () => calls.push('first');
        const second = () => calls.push('second');

        EventBus.on('GAME_SPEED_CHANGED', first, 'eventbus-test-first');
        EventBus.on('GAME_SPEED_CHANGED', second, 'eventbus-test-second');

        EventBus.off('GAME_SPEED_CHANGED');
        EventBus.emit('GAME_SPEED_CHANGED', { speed: 2 });

        expect(calls).toEqual(['first', 'second']);

        EventBus.offAll('eventbus-test-first');
        EventBus.offAll('eventbus-test-second');
    });

    it('removes only listeners owned by the requested owner', () => {
        const calls: string[] = [];

        EventBus.on('GAME_SPEED_CHANGED', () => calls.push('owned'), 'eventbus-test-owned');
        EventBus.on('GAME_SPEED_CHANGED', () => calls.push('kept'), 'eventbus-test-kept');

        EventBus.off('GAME_SPEED_CHANGED', 'eventbus-test-owned');
        EventBus.emit('GAME_SPEED_CHANGED', { speed: 3 });

        expect(calls).toEqual(['kept']);

        EventBus.offAll('eventbus-test-owned');
        EventBus.offAll('eventbus-test-kept');
    });
});
