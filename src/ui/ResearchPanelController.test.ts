import { afterEach, describe, expect, it, vi } from 'vitest';
import EventBus from '../managers/EventBus';
import ResearchPanelController from './ResearchPanelController';
import { restoreGameCanvasFocus } from './domEnvironment';

vi.mock('./domEnvironment', () => ({
    restoreGameCanvasFocus: vi.fn()
}));

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

const owner = 'ResearchPanelController.test';

function createScene() {
    const events = new FakeSceneEvents();
    const researchManager = {
        assignResearch: vi.fn(() => true),
        createPanelSnapshot: vi.fn((open: boolean, selectedId: string | null = null) => ({
            axes: [],
            activeResearch: null,
            blockedData: {
                blocked: false,
                researchId: null,
                missing: [],
                message: ''
            },
            closeLabel: 'Close',
            dataBalances: [],
            nodes: [],
            open,
            queueText: 'Queue 0/3',
            researchQueue: [],
            selectedId,
            throughputText: 'Throughput 1.0 / tick',
            title: 'Research'
        }))
    };

    return {
        events,
        scene: {
            events,
            researchManager
        }
    };
}

function collectEvents() {
    const openStates: boolean[] = [];
    const snapshots: any[] = [];

    EventBus.on('RESEARCH_PANEL_OPEN_CHANGED', ({ open }) => {
        openStates.push(open);
    }, owner);
    EventBus.on('RESEARCH_PANEL_UPDATED', snapshot => {
        snapshots.push(snapshot);
    }, owner);

    return { openStates, snapshots };
}

function setupController() {
    const events = collectEvents();
    const setup = createScene();
    const controller = new ResearchPanelController(setup.scene as any);
    controller.setup();
    return { controller, ...events, ...setup };
}

describe('ResearchPanelController', () => {
    afterEach(() => {
        EventBus.offAll(owner);
        EventBus.offAll('ResearchPanelController');
        vi.clearAllMocks();
    });

    it('opens the research panel through the shared EventBus path', () => {
        const { scene, snapshots } = setupController();

        EventBus.emit('RESEARCH_OPEN_REQUESTED');

        expect(scene.researchManager.createPanelSnapshot).toHaveBeenCalledWith(true, null);
        expect(snapshots.at(-1)).toEqual(expect.objectContaining({
            open: true,
            selectedId: null
        }));
    });

    it('closes the panel and restores canvas focus', () => {
        const { openStates } = setupController();

        EventBus.emit('RESEARCH_OPEN_REQUESTED');
        EventBus.emit('RESEARCH_CLOSE_REQUESTED');

        expect(openStates).toEqual([false]);
        expect(restoreGameCanvasFocus).toHaveBeenCalledTimes(1);
    });

    it('selects or assigns research while keeping the panel open', () => {
        const { scene, snapshots } = setupController();

        EventBus.emit('RESEARCH_OPEN_REQUESTED');
        EventBus.emit('RESEARCH_SELECT_REQUESTED', { id: 'CORE_BASIC_RESEARCH' });
        EventBus.emit('RESEARCH_SLOT_ASSIGN_REQUESTED', { id: 'TECH_EFFICIENT_MINING' });

        expect(scene.researchManager.assignResearch).toHaveBeenCalledWith('CORE_BASIC_RESEARCH');
        expect(scene.researchManager.assignResearch).toHaveBeenCalledWith('TECH_EFFICIENT_MINING');
        expect(snapshots.at(-2)).toEqual(expect.objectContaining({
            open: true,
            selectedId: 'CORE_BASIC_RESEARCH'
        }));
        expect(snapshots.at(-1)).toEqual(expect.objectContaining({
            open: true,
            selectedId: 'TECH_EFFICIENT_MINING'
        }));
    });

    it('removes listeners on Scene shutdown', () => {
        const { events, snapshots } = setupController();

        events.emitShutdown();
        EventBus.emit('RESEARCH_OPEN_REQUESTED');

        expect(snapshots).toEqual([]);
    });
});
