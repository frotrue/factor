import { afterEach, describe, expect, it, vi } from 'vitest';
import EventBus from '../managers/EventBus';
import BuildConsoleController from './BuildConsoleController';

const buildConsoleSnapshotMock = vi.hoisted(() => ({
    createBuildConsoleDisplayPayload: vi.fn((input: any) => ({
        legacySelectedTool: {
            cost: `cost:${input.selectedBuildingType}`,
            hint: `hint:${input.selectedBuildingType}`,
            key: input.selectedBuildingType,
            name: `tool:${input.selectedBuildingType}`
        },
        snapshot: {
            activeCategory: input.activeCategory,
            categories: input.categories ?? [],
            items: input.currentTabBuildings.map((key: string, index: number) => ({
                color: '#4dd8ff',
                cost: '',
                hotkey: input.hotkeys[index] ?? '',
                key,
                label: key,
                selected: key === input.selectedBuildingType
            })),
            selectedTool: {
                cost: `cost:${input.selectedBuildingType}`,
                hint: `hint:${input.selectedBuildingType}`,
                key: input.selectedBuildingType,
                name: `tool:${input.selectedBuildingType}`
            }
        }
    })),
    createBuildConsoleDisplayState: vi.fn((input: any) => ({
        buildableData: {
            BASIC: { CATEGORY: 'LOGISTICS' },
            DATA_DOWNLOADER: { CATEGORY: input.activeCategory },
            POWER_NODE: { CATEGORY: 'POWER' },
            PROCESSOR: { CATEGORY: input.activeCategory },
            REMOVE: { CATEGORY: 'ALL' }
        },
        categories: [
            { active: input.activeCategory === 'EXTRACTION', id: 'EXTRACTION', label: 'Extraction' },
            { active: input.activeCategory === 'LOGISTICS', id: 'LOGISTICS', label: 'Logistics' },
            { active: input.activeCategory === 'PRODUCTION', id: 'PRODUCTION', label: 'Production' },
            { active: input.activeCategory === 'POWER', id: 'POWER', label: 'Power' },
            { active: input.activeCategory === 'DEFENSE', id: 'DEFENSE', label: 'Defense' }
        ],
        currentTabBuildings: input.activeCategory === 'LOGISTICS'
            ? ['BASIC', 'PROCESSOR']
            : input.activeCategory === 'POWER'
                ? ['POWER_NODE']
                : ['DATA_DOWNLOADER', 'PROCESSOR']
    }))
}));

const legacyBuildConsoleMock = vi.hoisted(() => ({
    renderLegacyBuildConsole: vi.fn((options: any) => ({
        buildableData: options.displayState.buildableData,
        buttons: {
            BASIC: { id: 'btn-basic' },
            DATA_DOWNLOADER: { id: 'btn-data_downloader' },
            POWER_NODE: { id: 'btn-power_node' },
            PROCESSOR: { id: 'btn-processor' },
            REMOVE: { id: 'btn-remove' }
        },
        categories: options.displayState.categories,
        currentTabBuildings: options.displayState.currentTabBuildings
    })),
    updateLegacyBuildSelection: vi.fn(),
    updateLegacySelectedToolPanel: vi.fn()
}));

const domEnvironmentMock = vi.hoisted(() => ({
    guardDomPointer: vi.fn()
}));

vi.mock('./buildConsoleSnapshot', () => buildConsoleSnapshotMock);
vi.mock('./legacyBuildConsole', () => legacyBuildConsoleMock);
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

const owner = 'BuildConsoleController.test';

function createController(options: { tutorialCompleted?: boolean; tutorialGuidance?: any } = {}) {
    const events = new FakeSceneEvents();
    const getBuildGuidance = vi.fn(() => options.tutorialGuidance ?? null);
    const scene = {
        events,
        researchManager: {
            isUnlocked: vi.fn(() => true)
        },
        tutorialManager: options.tutorialCompleted === undefined && !options.tutorialGuidance
            ? undefined
            : {
                getBuildGuidance,
                isCompleted: vi.fn(() => Boolean(options.tutorialCompleted))
            },
        waveManager: {
            currentWave: 2,
            waveActive: false
        }
    };

    return {
        controller: new BuildConsoleController(scene as any),
        events,
        scene,
        getBuildGuidance
    };
}

function collectEvents() {
    const buildSelections: string[] = [];
    const refreshes: string[] = [];
    const snapshots: any[] = [];

    EventBus.on('BUILDING_SELECTED', ({ type }) => {
        buildSelections.push(type);
    }, owner);
    EventBus.on('BUILD_CONSOLE_UPDATED', snapshot => {
        snapshots.push(snapshot);
    }, owner);
    EventBus.on('MOBILE_BUILD_SUMMARY_REFRESH_REQUESTED', () => {
        refreshes.push('summary');
    }, owner);
    EventBus.on('MOBILE_ACTION_REFRESH_REQUESTED', () => {
        refreshes.push('actions');
    }, owner);
    EventBus.on('HUD_SHELL_SYNC_REQUESTED', () => {
        refreshes.push('shell');
    }, owner);

    return { buildSelections, refreshes, snapshots };
}

describe('BuildConsoleController', () => {
    afterEach(() => {
        EventBus.offAll(owner);
        EventBus.offAll('BuildConsoleController');
        vi.clearAllMocks();
    });

    it('renders and publishes a build console snapshot from refresh requests', () => {
        const events = collectEvents();
        const { controller } = createController();

        controller.setupEvents();
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');

        expect(buildConsoleSnapshotMock.createBuildConsoleDisplayState).toHaveBeenCalledWith(expect.objectContaining({
            activeCategory: 'EXTRACTION',
            hasFirstDefenseSuccess: true
        }));
        expect(legacyBuildConsoleMock.renderLegacyBuildConsole).toHaveBeenCalledTimes(1);
        expect(legacyBuildConsoleMock.updateLegacySelectedToolPanel).toHaveBeenCalledWith(
            'tool:DATA_DOWNLOADER',
            'cost:DATA_DOWNLOADER',
            'hint:DATA_DOWNLOADER'
        );
        expect(events.snapshots).toHaveLength(1);
        expect(events.snapshots[0].activeCategory).toBe('EXTRACTION');
        expect(events.refreshes).toEqual(['summary', 'actions', 'shell']);
    });

    it('updates category through the EventBus and rerenders with the requested tab', () => {
        const { controller } = createController();

        controller.setupEvents();
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');
        EventBus.emit('BUILD_CATEGORY_SELECT_REQUESTED', { category: 'LOGISTICS' });

        expect(buildConsoleSnapshotMock.createBuildConsoleDisplayState).toHaveBeenLastCalledWith(expect.objectContaining({
            activeCategory: 'LOGISTICS'
        }));
        expect(legacyBuildConsoleMock.renderLegacyBuildConsole).toHaveBeenCalledTimes(2);
    });

    it('routes tool requests and hotkeys through the same selection publish path', () => {
        const events = collectEvents();
        const { controller } = createController();

        controller.setupEvents();
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');
        EventBus.emit('BUILD_TOOL_SELECT_REQUESTED', { type: 'PROCESSOR' });
        const handledHotkey = controller.handleKeyboard({ key: '1' } as KeyboardEvent);
        const handledDelete = controller.handleKeyboard({ key: 'Delete' } as KeyboardEvent);

        expect(handledHotkey).toBe(true);
        expect(handledDelete).toBe(true);
        expect(events.buildSelections).toEqual(['PROCESSOR', 'DATA_DOWNLOADER', 'REMOVE']);
        expect(legacyBuildConsoleMock.updateLegacyBuildSelection).toHaveBeenCalledWith(expect.any(Object), 'PROCESSOR');
        expect(legacyBuildConsoleMock.updateLegacyBuildSelection).toHaveBeenCalledWith(expect.any(Object), 'DATA_DOWNLOADER');
        expect(legacyBuildConsoleMock.updateLegacyBuildSelection).toHaveBeenCalledWith(expect.any(Object), 'REMOVE');
        expect(events.snapshots.at(-1)?.selectedTool.key).toBe('REMOVE');
    });

    it('auto-selects the tutorial recommended tool and category once per change', () => {
        const events = collectEvents();
        const { controller, getBuildGuidance } = createController({
            tutorialGuidance: {
                activeStepId: 'POWER',
                allowedBuildings: ['POWER_NODE', 'REMOVE'],
                recommendedTool: 'POWER_NODE'
            }
        });

        controller.setupEvents();
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');

        expect(buildConsoleSnapshotMock.createBuildConsoleDisplayState).toHaveBeenLastCalledWith(expect.objectContaining({
            activeCategory: 'POWER'
        }));
        expect(events.buildSelections).toEqual(['POWER_NODE']);
        expect(events.snapshots.at(-1)?.selectedTool.key).toBe('POWER_NODE');

        getBuildGuidance.mockReturnValue({
            activeStepId: 'CABLE_START',
            allowedBuildings: ['BASIC', 'REMOVE'],
            recommendedTool: 'BASIC'
        });
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');

        expect(buildConsoleSnapshotMock.createBuildConsoleDisplayState).toHaveBeenLastCalledWith(expect.objectContaining({
            activeCategory: 'LOGISTICS'
        }));
        expect(events.buildSelections).toEqual(['POWER_NODE', 'BASIC']);
        expect(events.snapshots.at(-1)?.selectedTool.key).toBe('BASIC');
    });

    it('keeps the current selection when the tutorial is completed', () => {
        const events = collectEvents();
        const { controller } = createController({
            tutorialCompleted: true,
            tutorialGuidance: {
                activeStepId: 'POWER',
                allowedBuildings: ['POWER_NODE', 'REMOVE'],
                recommendedTool: 'POWER_NODE'
            }
        });

        controller.setupEvents();
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');

        expect(events.buildSelections).toEqual([]);
        expect(events.snapshots.at(-1)?.activeCategory).toBe('EXTRACTION');
        expect(events.snapshots.at(-1)?.selectedTool.key).toBe('DATA_DOWNLOADER');
    });

    it('returns false for unavailable numeric hotkeys without changing selection', () => {
        const events = collectEvents();
        const { controller } = createController();

        controller.setupEvents();
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');

        expect(controller.handleKeyboard({ key: '9' } as KeyboardEvent)).toBe(false);
        expect(events.buildSelections).toEqual([]);
    });

    it('removes EventBus listeners on scene shutdown', () => {
        const events = collectEvents();
        const { controller, events: sceneEvents } = createController();

        controller.setupEvents();
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');
        sceneEvents.emitShutdown();
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');
        EventBus.emit('BUILD_TOOL_SELECT_REQUESTED', { type: 'PROCESSOR' });

        expect(legacyBuildConsoleMock.renderLegacyBuildConsole).toHaveBeenCalledTimes(1);
        expect(events.buildSelections).toEqual([]);
    });
});
