import { afterEach, describe, expect, it, vi } from 'vitest';

class FakeWindow {
    private handlers = new Map<string, Set<() => void>>();

    addEventListener(event: string, handler: () => void): void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)?.add(handler);
    }

    removeEventListener(event: string, handler: () => void): void {
        this.handlers.get(event)?.delete(handler);
    }

    emit(event: string): void {
        this.handlers.get(event)?.forEach(handler => handler());
    }

    listenerCount(event: string): number {
        return this.handlers.get(event)?.size ?? 0;
    }
}

function createWaveResultSnapshot(token: number) {
    return {
        open: true,
        token,
        wave: token,
        kicker: 'kicker',
        title: `wave ${token}`,
        closeLabel: 'close',
        integrityLabel: 'integrity',
        integrityTone: 'good',
        historyLabel: 'history',
        historyWaveLabel: 'wave',
        historyCoreLabel: 'core',
        historyKillsLabel: 'kills',
        stats: [],
        outcome: 'survived',
        enemiesDestroyed: 1,
        dataProcessed: 2,
        coreHpPercent: 100,
        coreDamage: 0,
        buildingsDamaged: 0,
        buildingsDestroyed: 0
    };
}

async function loadBridge() {
    vi.resetModules();
    const fakeWindow = new FakeWindow();
    let language = 'ko';

    vi.stubGlobal('window', fakeWindow);
    vi.doMock('../../i18n', () => ({
        getLanguage: vi.fn(() => language),
        t: vi.fn((key: string) => key),
        textForKey: vi.fn((key: string) => key),
        __setLanguage: (next: string) => {
            language = next;
        }
    }));

    const EventBus = (await import('../../managers/EventBus')).default;
    const bridge = await import('./bridge');
    const gameState = await import('./gameState');
    const notificationState = await import('./notificationState');
    const i18n = await import('../../i18n') as typeof import('../../i18n') & {
        __setLanguage: (next: string) => void;
    };

    return { EventBus, fakeWindow, gameState, i18n, notificationState, ...bridge };
}

describe('connectGameStateBridge', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        vi.resetModules();
    });

    it('updates Preact signals from EventBus and removes listeners on disconnect', async () => {
        const {
            EventBus,
            connectGameStateBridge,
            fakeWindow,
            gameState,
            i18n
        } = await loadBridge();

        const disconnect = connectGameStateBridge();

        EventBus.emit('CORE_DATA_RECEIVED', { total: 42 } as any);
        EventBus.emit('POWER_UPDATED', {
            consumption: 3,
            isBlackout: false,
            net: 7,
            networks: [{ id: 'grid-1' }],
            production: 10
        } as any);
        i18n.__setLanguage('en');
        fakeWindow.emit('languagechange');

        expect(gameState.score.value).toBe(42);
        expect(gameState.powerProduction.value).toBe(10);
        expect(gameState.powerConsumption.value).toBe(3);
        expect(gameState.powerNet.value).toBe(7);
        expect(gameState.powerNetworkCount.value).toBe(1);
        expect(gameState.language.value).toBe('en');
        expect(fakeWindow.listenerCount('languagechange')).toBe(1);

        disconnect();
        expect(fakeWindow.listenerCount('languagechange')).toBe(0);

        EventBus.emit('CORE_DATA_RECEIVED', { total: 99 } as any);
        i18n.__setLanguage('ko');
        fakeWindow.emit('languagechange');

        expect(gameState.score.value).toBe(42);
        expect(gameState.language.value).toBe('en');
    });

    it('reconnecting clears the previous bridge and wave-result close timer', async () => {
        vi.useFakeTimers();
        const {
            EventBus,
            connectGameStateBridge,
            fakeWindow,
            notificationState
        } = await loadBridge();

        const firstDisconnect = connectGameStateBridge();
        EventBus.emit('WAVE_RESULT_UPDATED', createWaveResultSnapshot(1) as any);
        expect(notificationState.waveResult.value.open).toBe(true);
        expect(notificationState.waveResultHistory.value.map(entry => entry.token)).toEqual([1]);

        const secondDisconnect = connectGameStateBridge();
        expect(fakeWindow.listenerCount('languagechange')).toBe(1);

        vi.advanceTimersByTime(7000);
        expect(notificationState.waveResult.value.open).toBe(true);

        firstDisconnect();
        expect(fakeWindow.listenerCount('languagechange')).toBe(1);

        EventBus.emit('WAVE_RESULT_UPDATED', createWaveResultSnapshot(2) as any);
        expect(notificationState.waveResultHistory.value.map(entry => entry.token)).toEqual([2, 1]);

        vi.advanceTimersByTime(7000);
        expect(notificationState.waveResult.value.open).toBe(false);

        EventBus.emit('WAVE_RESULT_UPDATED', createWaveResultSnapshot(3) as any);
        EventBus.emit('WAVE_RESULT_CLOSE_REQUESTED');
        expect(notificationState.waveResult.value.open).toBe(false);

        secondDisconnect();
        expect(fakeWindow.listenerCount('languagechange')).toBe(0);
    });
});
