import { describe, expect, it } from 'vitest';
import {
    BUILD_CATEGORY_IDS,
    createBuildConsoleDisplayPayload,
    createBuildConsoleDisplayState
} from './buildConsoleSnapshot';

describe('buildConsoleSnapshot', () => {
    it('builds the BuildConsole category and tool source without reading legacy DOM', () => {
        const displayState = createBuildConsoleDisplayState({
            activeCategory: 'LOGISTICS',
            hasFirstDefenseSuccess: false,
            isGpuUnlocked: false,
            isResearchUnlocked: () => false
        });

        expect(displayState.categories.map(category => category.id)).toEqual(BUILD_CATEGORY_IDS);
        expect(displayState.categories.find(category => category.id === 'LOGISTICS')?.active).toBe(true);
        expect(displayState.currentTabBuildings).toContain('CONVEYOR');
        expect(displayState.currentTabBuildings).toContain('BASIC');
        expect(displayState.currentTabBuildings).not.toContain('FAST_LINK');
        expect(displayState.currentTabBuildings).not.toContain('FIBER');
    });

    it('keeps locked GPU tools out of the visible production tab while preserving selected tool metadata', () => {
        const displayState = createBuildConsoleDisplayState({
            activeCategory: 'PRODUCTION',
            hasFirstDefenseSuccess: true,
            isGpuUnlocked: false,
            isResearchUnlocked: () => true
        });
        const payload = createBuildConsoleDisplayPayload({
            activeCategory: 'PRODUCTION',
            buildableData: displayState.buildableData,
            categories: displayState.categories,
            currentTabBuildings: displayState.currentTabBuildings,
            hotkeys: ['1', '2', '3'],
            selectedBuildingType: 'GPU_CLUSTER'
        });

        expect(displayState.currentTabBuildings).not.toContain('GPU_CLUSTER');
        expect(payload.snapshot.items.some(item => item.key === 'GPU_CLUSTER')).toBe(false);
        expect(payload.snapshot.selectedTool.type).toBe('GPU_CLUSTER');
        expect(payload.legacySelectedTool).toEqual(payload.snapshot.selectedTool);
    });

    it('marks selected and remove tools in the shared item view model', () => {
        const displayState = createBuildConsoleDisplayState({
            activeCategory: 'EXTRACTION',
            hasFirstDefenseSuccess: true,
            isGpuUnlocked: false,
            isResearchUnlocked: () => false
        });
        const selectedPayload = createBuildConsoleDisplayPayload({
            activeCategory: 'EXTRACTION',
            buildableData: displayState.buildableData,
            categories: displayState.categories,
            currentTabBuildings: displayState.currentTabBuildings,
            hotkeys: ['1', '2', '3'],
            selectedBuildingType: 'DATA_DOWNLOADER'
        });

        const downloader = selectedPayload.snapshot.items.find(item => item.key === 'DATA_DOWNLOADER');
        const remove = selectedPayload.snapshot.items.find(item => item.key === 'REMOVE');
        const downloaderIndex = displayState.currentTabBuildings.indexOf('DATA_DOWNLOADER');

        expect(downloader?.selected).toBe(true);
        expect(downloader?.hotkey).toBe(['1', '2', '3'][downloaderIndex]);
        expect(remove?.selected).toBe(false);
        expect(remove?.hotkey).toBe('0');

        const removePayload = createBuildConsoleDisplayPayload({
            activeCategory: 'EXTRACTION',
            buildableData: displayState.buildableData,
            categories: displayState.categories,
            currentTabBuildings: displayState.currentTabBuildings,
            hotkeys: ['1', '2', '3'],
            selectedBuildingType: 'REMOVE'
        });

        expect(removePayload.snapshot.items.find(item => item.key === 'REMOVE')?.selected).toBe(true);
    });
});
