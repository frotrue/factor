import { describe, expect, it } from 'vitest';
import {
    ACTIVITY_LOG_ENTRY_LIMIT,
    TOOLTIP_OFFSET_PX,
    appendActivityLogSnapshot,
    createDesktopTooltipDisplayPayload,
    createLegacyMobileTooltipContent,
    createMobileTooltipDisplayPayload,
    createTooltipLines
} from './notificationDisplay';

describe('notificationDisplay', () => {
    it('normalizes tooltip content lines for Preact and legacy mobile displays', () => {
        const content = ' Power: OK \r\n\n Input Buffer: 3 / 3 \n Recipe: Packets ';

        expect(createTooltipLines(content)).toEqual([
            'Power: OK',
            'Input Buffer: 3 / 3',
            'Recipe: Packets'
        ]);

        const mobile = createMobileTooltipDisplayPayload('Core', content);
        expect(mobile.snapshot.lines).toEqual(createTooltipLines(content));
        expect(mobile.legacyMobile.tags).toContain('POWER OK');
        expect(mobile.legacyMobile.tags).toContain('INPUT FULL');
        expect(mobile.legacyMobile.details).toEqual([
            'Input Buffer: 3 / 3',
            'Recipe: Packets'
        ]);

        const legacyMobile = createLegacyMobileTooltipContent('Core', content);
        expect(legacyMobile.fallback).toBe('Power: OK');
    });

    it('applies the same desktop tooltip offset to the legacy payload and Preact snapshot', () => {
        const display = createDesktopTooltipDisplayPayload(10, 20, 'Node', 'Status: Processing');

        expect(display.legacyDesktop.x).toBe(10);
        expect(display.legacyDesktop.y).toBe(20);
        expect(display.snapshot.x).toBe(10 + TOOLTIP_OFFSET_PX);
        expect(display.snapshot.y).toBe(20 + TOOLTIP_OFFSET_PX);
        expect(display.snapshot.lines).toEqual(['Status: Processing']);
    });

    it('caps activity log snapshots at the shared display limit', () => {
        const entries = Array.from({ length: ACTIVITY_LOG_ENTRY_LIMIT }, (_, index) => ({
            id: index + 1,
            message: `entry ${index + 1}`,
            isAlert: false
        }));

        const next = appendActivityLogSnapshot(entries, ACTIVITY_LOG_ENTRY_LIMIT + 1, 'latest', true);

        expect(next).toHaveLength(ACTIVITY_LOG_ENTRY_LIMIT);
        expect(next[0].id).toBe(2);
        expect(next[next.length - 1]).toEqual({
            id: ACTIVITY_LOG_ENTRY_LIMIT + 1,
            message: 'latest',
            isAlert: true
        });
    });
});
