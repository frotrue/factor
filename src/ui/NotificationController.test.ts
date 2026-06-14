import { afterEach, describe, expect, it, vi } from 'vitest';
import EventBus from '../managers/EventBus';
import NotificationController from './NotificationController';

const legacyNotificationsMock = vi.hoisted(() => ({
    appendLegacyActivityLogEntry: vi.fn(),
    hideLegacyTooltipSurfaces: vi.fn(),
    showLegacyDesktopTooltip: vi.fn(),
    showLegacyMobileTooltip: vi.fn(),
    showLegacyWaveResultCard: vi.fn()
}));

const notificationDisplayMock = vi.hoisted(() => ({
    createActivityLogDisplayPayload: vi.fn((entries: any[], nextId: number, message: string, isAlert: boolean) => ({
        legacyEntry: { isAlert, message },
        nextId: nextId + 1,
        snapshot: {
            entries: [...entries, { id: nextId, isAlert, message }]
        }
    })),
    createClosedTooltipDisplayPayload: vi.fn(() => ({
        legacyHidden: true,
        snapshot: { open: false, title: 'closed' }
    })),
    createDesktopTooltipDisplayPayload: vi.fn((x: number, y: number, title: string, content: string) => ({
        legacyDesktop: { content, title, x, y },
        snapshot: { content, open: true, title, x, y }
    })),
    createLabAvailableLogMessage: vi.fn(() => 'lab available'),
    createMobileTooltipDisplayPayload: vi.fn((title: string, content: string) => ({
        legacyMobile: { fallback: content, title },
        snapshot: { content, mobile: true, open: true, title }
    })),
    createWaveIncomingLogMessage: vi.fn((wave: number) => `wave ${wave} incoming`)
}));

const waveResultDisplayMock = vi.hoisted(() => ({
    createWaveResultDisplayPayload: vi.fn((summary: any) => ({
        legacyContent: `legacy wave ${summary.wave}`,
        logMessage: `wave ${summary.wave} result`,
        snapshot: { open: true, wave: summary.wave }
    }))
}));

const domEnvironmentMock = vi.hoisted(() => ({
    isMobileLayoutActive: vi.fn(() => false)
}));

vi.mock('./legacyNotifications', () => legacyNotificationsMock);
vi.mock('./notificationDisplay', () => notificationDisplayMock);
vi.mock('./waveResultDisplay', () => waveResultDisplayMock);
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

const owner = 'NotificationController.test';

function createController() {
    const events = new FakeSceneEvents();
    const scene = { events };

    return {
        controller: new NotificationController(scene as any),
        events
    };
}

function collectSnapshots() {
    const activity: any[] = [];
    const tooltips: any[] = [];
    const waveResults: any[] = [];

    EventBus.on('ACTIVITY_LOG_UPDATED', snapshot => {
        activity.push(snapshot);
    }, owner);
    EventBus.on('TOOLTIP_UPDATED', snapshot => {
        tooltips.push(snapshot);
    }, owner);
    EventBus.on('WAVE_RESULT_UPDATED', snapshot => {
        waveResults.push(snapshot);
    }, owner);

    return { activity, tooltips, waveResults };
}

describe('NotificationController', () => {
    afterEach(() => {
        EventBus.offAll(owner);
        EventBus.offAll('NotificationController');
        vi.clearAllMocks();
        domEnvironmentMock.isMobileLayoutActive.mockReturnValue(false);
    });

    it('routes desktop tooltip requests to Preact snapshots and legacy desktop tooltip', () => {
        const snapshots = collectSnapshots();
        const { controller } = createController();

        controller.setupEvents();
        EventBus.emit('TOOLTIP_SHOW_REQUESTED', {
            content: 'Power: OK',
            title: 'Core',
            x: 12,
            y: 34
        });

        expect(notificationDisplayMock.createDesktopTooltipDisplayPayload).toHaveBeenCalledWith(12, 34, 'Core', 'Power: OK');
        expect(legacyNotificationsMock.showLegacyDesktopTooltip).toHaveBeenCalledWith(12, 34, 'Core', 'Power: OK');
        expect(snapshots.tooltips).toEqual([{ content: 'Power: OK', open: true, title: 'Core', x: 12, y: 34 }]);
    });

    it('routes mobile tooltip requests to the mobile legacy mirror', () => {
        const snapshots = collectSnapshots();
        const { controller } = createController();
        domEnvironmentMock.isMobileLayoutActive.mockReturnValue(true);

        controller.setupEvents();
        EventBus.emit('TOOLTIP_SHOW_REQUESTED', {
            content: 'Input Buffer: 1 / 2',
            title: 'Processor',
            x: 100,
            y: 200
        });

        expect(notificationDisplayMock.createMobileTooltipDisplayPayload).toHaveBeenCalledWith('Processor', 'Input Buffer: 1 / 2');
        expect(legacyNotificationsMock.showLegacyMobileTooltip).toHaveBeenCalledWith({
            fallback: 'Input Buffer: 1 / 2',
            title: 'Processor'
        });
        expect(snapshots.tooltips).toEqual([{
            content: 'Input Buffer: 1 / 2',
            mobile: true,
            open: true,
            title: 'Processor'
        }]);
    });

    it('closes tooltip snapshots and legacy tooltip surfaces through the close request', () => {
        const snapshots = collectSnapshots();
        const { controller } = createController();

        controller.setupEvents();
        EventBus.emit('TOOLTIP_CLOSE_REQUESTED');

        expect(notificationDisplayMock.createClosedTooltipDisplayPayload).toHaveBeenCalledTimes(1);
        expect(legacyNotificationsMock.hideLegacyTooltipSurfaces).toHaveBeenCalledTimes(1);
        expect(snapshots.tooltips).toEqual([{ open: false, title: 'closed' }]);
    });

    it('keeps activity log state across direct and wave lifecycle log requests', () => {
        const snapshots = collectSnapshots();
        const { controller } = createController();

        controller.setupEvents();
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', { isAlert: true, message: 'manual alert' });
        EventBus.emit('WAVE_STARTED', { wave: 3 });
        EventBus.emit('WAVE_ENDED', { wave: 3 });

        expect(notificationDisplayMock.createActivityLogDisplayPayload).toHaveBeenNthCalledWith(1, [], 1, 'manual alert', true);
        expect(notificationDisplayMock.createActivityLogDisplayPayload).toHaveBeenNthCalledWith(
            2,
            [{ id: 1, isAlert: true, message: 'manual alert' }],
            2,
            'wave 3 incoming',
            true
        );
        expect(notificationDisplayMock.createActivityLogDisplayPayload).toHaveBeenNthCalledWith(
            3,
            [
                { id: 1, isAlert: true, message: 'manual alert' },
                { id: 2, isAlert: true, message: 'wave 3 incoming' }
            ],
            3,
            'lab available',
            false
        );
        expect(legacyNotificationsMock.appendLegacyActivityLogEntry).toHaveBeenLastCalledWith('lab available', false);
        expect(snapshots.activity.at(-1)?.entries).toEqual([
            { id: 1, isAlert: true, message: 'manual alert' },
            { id: 2, isAlert: true, message: 'wave 3 incoming' },
            { id: 3, isAlert: false, message: 'lab available' }
        ]);
    });

    it('routes wave result summaries to wave result snapshot, legacy card, and activity log', () => {
        const snapshots = collectSnapshots();
        const { controller } = createController();

        controller.setupEvents();
        EventBus.emit('WAVE_RESULT_SUMMARY_REQUESTED', { wave: 9 } as any);

        expect(waveResultDisplayMock.createWaveResultDisplayPayload).toHaveBeenCalledWith({ wave: 9 });
        expect(legacyNotificationsMock.showLegacyWaveResultCard).toHaveBeenCalledWith('legacy wave 9');
        expect(legacyNotificationsMock.appendLegacyActivityLogEntry).toHaveBeenCalledWith('wave 9 result', false);
        expect(snapshots.waveResults).toEqual([{ open: true, wave: 9 }]);
        expect(snapshots.activity).toEqual([{ entries: [{ id: 1, isAlert: false, message: 'wave 9 result' }] }]);
    });

    it('removes EventBus listeners on scene shutdown', () => {
        const snapshots = collectSnapshots();
        const { controller, events } = createController();

        controller.setupEvents();
        events.emitShutdown();
        EventBus.emit('TOOLTIP_CLOSE_REQUESTED');
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', { message: 'after shutdown' });

        expect(legacyNotificationsMock.hideLegacyTooltipSurfaces).not.toHaveBeenCalled();
        expect(legacyNotificationsMock.appendLegacyActivityLogEntry).not.toHaveBeenCalled();
        expect(snapshots.tooltips).toEqual([]);
        expect(snapshots.activity).toEqual([]);
    });
});
