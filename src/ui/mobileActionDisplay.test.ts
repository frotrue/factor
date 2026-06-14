import { describe, expect, it } from 'vitest';
import {
    createMobileActionDisplayPayload,
    isMobileCableTool,
    isMobileTransientTool
} from './mobileActionDisplay';

describe('mobileActionDisplay', () => {
    it('classifies cable and transient mobile tools from one shared predicate', () => {
        expect(isMobileCableTool('BASIC')).toBe(true);
        expect(isMobileCableTool('FIBER')).toBe(true);
        expect(isMobileCableTool('REMOVE')).toBe(false);
        expect(isMobileTransientTool('REMOVE')).toBe(true);
        expect(isMobileTransientTool('BASIC')).toBe(true);
        expect(isMobileTransientTool('FIBER')).toBe(true);
        expect(isMobileTransientTool('DATA_DOWNLOADER')).toBe(false);
    });

    it('keeps cable selection aligned between legacy active state and Preact snapshot actions', () => {
        const display = createMobileActionDisplayPayload({
            cableMenuOpen: true,
            mobileActionStatus: 'Cable endpoint selected',
            open: true,
            selectedType: 'FIBER',
            showDefenseRange: false,
            showPowerGrid: true
        });
        const actionById = Object.fromEntries(display.snapshot.actions.map(action => [action.id, action]));

        expect(display.legacyActiveMap.cable).toBe(true);
        expect(actionById.cable?.active).toBe(true);
        expect(display.legacyActiveMap.cancel).toBe(true);
        expect(actionById.cancel?.active).toBe(true);
        expect(display.legacyActiveMap.power).toBe(true);
        expect(actionById.power?.active).toBe(true);
        expect(display.snapshot.cableOptions.find(option => option.id === 'FIBER')?.selected).toBe(true);
        expect(display.snapshot.summaryTitle).not.toBe('');
    });

    it('keeps remove selection aligned between legacy active state and Preact snapshot actions', () => {
        const display = createMobileActionDisplayPayload({
            cableMenuOpen: false,
            mobileActionStatus: null,
            open: true,
            selectedType: 'REMOVE',
            showDefenseRange: true,
            showPowerGrid: false
        });
        const actionById = Object.fromEntries(display.snapshot.actions.map(action => [action.id, action]));

        expect(display.legacyActiveMap.remove).toBe(true);
        expect(actionById.remove?.active).toBe(true);
        expect(display.legacyActiveMap.cable).toBe(false);
        expect(actionById.cable?.active).toBe(false);
        expect(display.legacyBuildSummary.title).toBe(display.snapshot.summaryTitle);
        expect(display.legacyBuildSummary.detail).toBe(display.snapshot.summaryDetail);
    });
});
