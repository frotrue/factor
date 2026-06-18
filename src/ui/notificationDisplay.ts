import { t, textForKey } from '../i18n';
import type { ActivityLogEntrySnapshot, ActivityLogSnapshot, TooltipSnapshot } from '../types';

export const ACTIVITY_LOG_ENTRY_LIMIT = 12;
export const TOOLTIP_OFFSET_PX = 15;

export interface DesktopTooltipDisplayPayload {
    legacyDesktop: {
        x: number;
        y: number;
        title: string;
        content: string;
    };
    snapshot: TooltipSnapshot;
}

export interface MobileTooltipDisplayPayload {
    legacyMobile: LegacyMobileTooltipContent;
    snapshot: TooltipSnapshot;
}

export interface ClosedTooltipDisplayPayload {
    legacyHidden: true;
    snapshot: TooltipSnapshot;
}

export interface LegacyActivityLogDisplayEntry {
    message: string;
    isAlert: boolean;
}

export interface LegacyMobileTooltipContent {
    title: string;
    tags: string[];
    details: string[];
    fallback: string;
}

export interface ActivityLogDisplayPayload {
    legacyEntry: LegacyActivityLogDisplayEntry;
    nextId: number;
    snapshot: ActivityLogSnapshot;
}

export function createTooltipPosition(x: number, y: number): { x: number; y: number } {
    return {
        x: x + TOOLTIP_OFFSET_PX,
        y: y + TOOLTIP_OFFSET_PX
    };
}

export function createDesktopTooltipDisplayPayload(
    x: number,
    y: number,
    title: string,
    content: string
): DesktopTooltipDisplayPayload {
    return {
        legacyDesktop: {
            x,
            y,
            title,
            content
        },
        snapshot: createOpenTooltipSnapshot(title, content, createTooltipPosition(x, y))
    };
}

export function createMobileTooltipDisplayPayload(
    title: string,
    content: string
): MobileTooltipDisplayPayload {
    return {
        legacyMobile: createLegacyMobileTooltipContent(title, content),
        snapshot: createOpenTooltipSnapshot(title, content, { x: 0, y: 0 })
    };
}

export function createClosedTooltipDisplayPayload(): ClosedTooltipDisplayPayload {
    return {
        legacyHidden: true,
        snapshot: createClosedTooltipSnapshot()
    };
}

export function createOpenTooltipSnapshot(
    title: string,
    content: string,
    position: { x: number; y: number }
): TooltipSnapshot {
    return {
        open: true,
        title,
        closeLabel: textForKey('tooltip.close'),
        lines: createTooltipLines(content),
        x: position.x,
        y: position.y
    };
}

export function createClosedTooltipSnapshot(): TooltipSnapshot {
    return {
        open: false,
        title: '',
        closeLabel: textForKey('tooltip.close'),
        lines: [],
        x: 0,
        y: 0
    };
}

export function appendActivityLogSnapshot(
    entries: ActivityLogEntrySnapshot[],
    nextId: number,
    message: string,
    isAlert: boolean
): ActivityLogEntrySnapshot[] {
    const entry: ActivityLogEntrySnapshot = {
        id: nextId,
        message,
        isAlert
    };
    return [...entries, entry].slice(-ACTIVITY_LOG_ENTRY_LIMIT);
}

export function createActivityLogSnapshot(entries: ActivityLogEntrySnapshot[]): ActivityLogSnapshot {
    return {
        ariaLabel: textForKey('activityLog.aria'),
        title: textForKey('activityLog.title'),
        alertCountLabel: textForKey('activityLog.alertCount'),
        historyLabel: textForKey('activityLog.history'),
        lessLabel: textForKey('activityLog.less'),
        noAlertsLabel: textForKey('activityLog.noAlerts'),
        entries
    };
}

export function createActivityLogDisplayPayload(
    entries: ActivityLogEntrySnapshot[],
    nextId: number,
    message: string,
    isAlert: boolean
): ActivityLogDisplayPayload {
    return {
        legacyEntry: {
            message,
            isAlert
        },
        nextId: nextId + 1,
        snapshot: createActivityLogSnapshot(appendActivityLogSnapshot(entries, nextId, message, isAlert))
    };
}

export function createWaveIncomingLogMessage(wave: number): string {
    return t('log.waveIncoming', { wave });
}

export function createLabAvailableLogMessage(): string {
    return textForKey('log.labAvailable');
}

export function createLegacyMobileTooltipContent(title: string, content: string): LegacyMobileTooltipContent {
    const lines = createTooltipLines(content);
    const tags: string[] = [];
    const details: string[] = [];
    const findLine = (...labels: string[]) => lines.find(line => labels.some(label => line.startsWith(`${label}:`)));

    const powerLine = findLine('Power', textForKey('tooltip.power'));
    if (powerLine) {
        tags.push(powerLine.includes('OK') || powerLine.includes(textForKey('tooltip.powerOk')) ? 'POWER OK' : 'NO POWER');
    }

    const inputLine = findLine('Input Buffer', textForKey('tooltip.inputBuffer'));
    const outputLine = findLine('Output Buffer', textForKey('tooltip.outputBuffer'));
    const defenseBufferLine = lines.find(line => line.startsWith('Buffer:'));
    const statusLine = findLine('Status', textForKey('tooltip.status'));
    const ammoLine = lines.find(line => line.startsWith('Ammo:'));
    const recipeLine = findLine('Recipe', textForKey('tooltip.recipe'));
    const networkLine = findLine('Network Power', textForKey('tooltip.networkPower'));

    if (statusLine?.includes('Processing') || statusLine?.includes(textForKey('tooltip.processing'))) tags.push('PROCESSING');
    if (inputLine) {
        details.push(inputLine);
        const match = inputLine.match(/(\d+)\s*\/\s*(\d+)/);
        if (match && match[1] === match[2]) tags.push('INPUT FULL');
    }
    if (outputLine) {
        details.push(outputLine);
        const match = outputLine.match(/(\d+)\s*\/\s*(\d+)/);
        if (match && match[1] === match[2]) tags.push('OUTPUT FULL');
    }
    if (defenseBufferLine) {
        details.push(defenseBufferLine);
        const match = defenseBufferLine.match(/(\d+)\s*\/\s*(\d+)/);
        if (ammoLine && match && Number(match[1]) === 0 && !ammoLine.includes('None')) tags.push('NO AMMO');
    }
    if (networkLine) details.push(networkLine);
    if (recipeLine) details.push(recipeLine);

    return {
        title,
        tags,
        details: details.slice(0, 3),
        fallback: lines[0] || ''
    };
}

export function createTooltipLines(content: string): string[] {
    return content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
}
