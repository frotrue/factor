import EventBus from '../managers/EventBus';
import {
    appendLegacyActivityLogEntry,
    hideLegacyTooltipSurfaces,
    showLegacyDesktopTooltip,
    showLegacyMobileTooltip,
    showLegacyWaveResultCard
} from './legacyNotifications';
import {
    createActivityLogDisplayPayload,
    createClosedTooltipDisplayPayload,
    createDesktopTooltipDisplayPayload,
    createLabAvailableLogMessage,
    createMobileTooltipDisplayPayload,
    createWaveIncomingLogMessage
} from './notificationDisplay';
import { createWaveResultDisplayPayload } from './waveResultDisplay';
import { isMobileLayoutActive } from './domEnvironment';
import type { ActivityLogEntrySnapshot } from '../types';
import type { WaveResultSummary } from '../utils/waveResultSummary';
import type MainScene from '../scenes/MainScene';

const OWNER = 'NotificationController';

export default class NotificationController {
    private activityLogEntries: ActivityLogEntrySnapshot[] = [];
    private activityLogNextId = 1;

    constructor(private readonly scene: MainScene) {}

    setupEvents(): void {
        EventBus.offAll(OWNER);
        this.scene.events.once('shutdown', () => this.teardown());
        EventBus.on('TOOLTIP_SHOW_REQUESTED', ({ x, y, title, content }) => {
            this.showTooltip(x, y, title, content);
        }, OWNER);
        EventBus.on('TOOLTIP_CLOSE_REQUESTED', () => {
            this.hideTooltip();
        }, OWNER);
        EventBus.on('ACTIVITY_LOG_ENTRY_REQUESTED', ({ message, isAlert }) => {
            this.logMessage(message, Boolean(isAlert));
        }, OWNER);
        EventBus.on('WAVE_RESULT_SUMMARY_REQUESTED', (summary: WaveResultSummary) => {
            this.showWaveResultSummary(summary);
        }, OWNER);
        EventBus.on('WAVE_STARTED', ({ wave }: { wave: number }) => {
            this.logMessage(createWaveIncomingLogMessage(wave), true);
        }, OWNER);
        EventBus.on('WAVE_ENDED', () => {
            this.logMessage(createLabAvailableLogMessage());
        }, OWNER);
    }

    showTooltip(x: number, y: number, title: string, content: string): void {
        if (isMobileLayoutActive()) {
            const display = createMobileTooltipDisplayPayload(title, content);
            EventBus.emit('TOOLTIP_UPDATED', display.snapshot);
            showLegacyMobileTooltip(display.legacyMobile);
            return;
        }

        const display = createDesktopTooltipDisplayPayload(x, y, title, content);
        EventBus.emit('TOOLTIP_UPDATED', display.snapshot);
        showLegacyDesktopTooltip(
            display.legacyDesktop.x,
            display.legacyDesktop.y,
            display.legacyDesktop.title,
            display.legacyDesktop.content
        );
    }

    hideTooltip(): void {
        const display = createClosedTooltipDisplayPayload();
        if (display.legacyHidden) hideLegacyTooltipSurfaces();
        EventBus.emit('TOOLTIP_UPDATED', display.snapshot);
    }

    logMessage(message: string, isAlert = false): void {
        const display = createActivityLogDisplayPayload(
            this.activityLogEntries,
            this.activityLogNextId,
            message,
            isAlert
        );
        this.activityLogEntries = display.snapshot.entries;
        this.activityLogNextId = display.nextId;
        EventBus.emit('ACTIVITY_LOG_UPDATED', display.snapshot);

        appendLegacyActivityLogEntry(display.legacyEntry.message, display.legacyEntry.isAlert);
    }

    private showWaveResultSummary(summary: WaveResultSummary): void {
        const display = createWaveResultDisplayPayload(summary);
        EventBus.emit('WAVE_RESULT_UPDATED', display.snapshot);
        showLegacyWaveResultCard(display.legacyContent);
        this.logMessage(display.logMessage);
    }

    private teardown(): void {
        EventBus.offAll(OWNER);
    }
}
