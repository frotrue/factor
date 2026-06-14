import { afterEach, describe, expect, it, vi } from 'vitest';
import EventBus from '../managers/EventBus';
import MobileActionController from './MobileActionController';

const legacyMobileControlsMock = vi.hoisted(() => ({
    ensureLegacyMobileRefs: vi.fn(),
    renderLegacyMobileActions: vi.fn(),
    renderLegacyMobileCableMenu: vi.fn(),
    setLegacyMobileCableMenuOpen: vi.fn(),
    syncLegacyMobileShadowState: vi.fn(),
    updateLegacyMobileActionState: vi.fn(),
    updateLegacyMobileBuildSummary: vi.fn()
}));

const domEnvironmentMock = vi.hoisted(() => ({
    guardDomPointer: vi.fn(),
    isMobileLayoutActive: vi.fn(() => true),
    isShortLandscapeLayout: vi.fn(() => false)
}));

const mobileActionDisplayMock = vi.hoisted(() => {
    const isCable = (type: string) => type === 'BASIC' || type === 'FIBER';
    const isTransient = (type: string) => type === 'REMOVE' || isCable(type);
    const createMobileActionActiveMap = vi.fn((input: any) => ({
        rotate: false,
        remove: input.selectedType === 'REMOVE',
        cable: isCable(input.selectedType),
        cancel: Boolean(input.mobileActionStatus),
        defense: Boolean(input.showDefenseRange),
        power: Boolean(input.showPowerGrid)
    }));
    const createMobileActionItems = vi.fn((activeMap: Record<string, boolean>) => (
        ['rotate', 'remove', 'cable', 'cancel', 'defense', 'power'].map(id => ({
            id,
            label: `action:${id}`,
            active: Boolean(activeMap[id])
        }))
    ));
    const createMobileCableOptions = vi.fn((selectedType: string) => (
        ['BASIC', 'FIBER'].map(id => ({
            id,
            label: `cable:${id}`,
            selected: selectedType === id
        }))
    ));

    return {
        createMobileActionActiveMap,
        createMobileActionItems,
        createMobileCableOptions,
        createMobileActionDisplayPayload: vi.fn((input: any) => {
            const legacyActiveMap = createMobileActionActiveMap(input);
            const legacyBuildSummary = {
                detail: input.mobileActionStatus ?? `cost:${input.selectedType}`,
                title: `summary:${input.selectedType}`
            };
            return {
                legacyActiveMap,
                legacyBuildSummary,
                snapshot: {
                    actions: createMobileActionItems(legacyActiveMap),
                    cableMenuOpen: input.cableMenuOpen,
                    cableOptions: createMobileCableOptions(input.selectedType),
                    labels: {
                        aria: 'mobile actions',
                        cableMenu: 'cables',
                        toolbar: 'toolbar'
                    },
                    open: input.open,
                    selectedType: input.selectedType,
                    summaryDetail: legacyBuildSummary.detail,
                    summaryTitle: legacyBuildSummary.title
                }
            };
        }),
        isMobileTransientTool: vi.fn(isTransient)
    };
});

vi.mock('./legacyMobileControls', () => legacyMobileControlsMock);
vi.mock('./domEnvironment', () => domEnvironmentMock);
vi.mock('./mobileActionDisplay', () => mobileActionDisplayMock);

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

type FakeRefs = {
    actionBar: HTMLElement;
    buildSummary: HTMLElement;
    cableMenu: HTMLElement;
    infoSheet: HTMLElement;
};

const owner = 'MobileActionController.test';

function createFakeRefs(): FakeRefs {
    return {
        actionBar: {} as HTMLElement,
        buildSummary: {} as HTMLElement,
        cableMenu: {} as HTMLElement,
        infoSheet: {} as HTMLElement
    };
}

function createController(fiberUnlocked = true) {
    const events = new FakeSceneEvents();
    const refs = createFakeRefs();
    const scene = {
        cancelCurrentAction: vi.fn(),
        events,
        mobileActionStatus: null as string | null,
        researchManager: {
            isUnlocked: vi.fn(() => fiberUnlocked)
        },
        rotateCursor: vi.fn(),
        showDefenseRange: false,
        showPowerGrid: false,
        toggleDefenseRange: vi.fn(),
        togglePowerGrid: vi.fn()
    };

    legacyMobileControlsMock.ensureLegacyMobileRefs.mockReturnValue(refs);

    return {
        controller: new MobileActionController(scene as any),
        events,
        refs,
        scene
    };
}

function collectEvents() {
    const selections: string[] = [];
    const snapshots: any[] = [];

    EventBus.on('BUILD_TOOL_SELECT_REQUESTED', ({ type }) => {
        selections.push(type);
    }, owner);
    EventBus.on('MOBILE_ACTION_UPDATED', snapshot => {
        snapshots.push(snapshot);
    }, owner);

    return { selections, snapshots };
}

function setupController(fiberUnlocked = true) {
    const events = collectEvents();
    const setup = createController(fiberUnlocked);
    setup.controller.setup();
    return { ...setup, ...events };
}

describe('MobileActionController', () => {
    afterEach(() => {
        EventBus.offAll(owner);
        EventBus.offAll('MobileActionController');
        vi.clearAllMocks();
        domEnvironmentMock.isMobileLayoutActive.mockReturnValue(true);
        domEnvironmentMock.isShortLandscapeLayout.mockReturnValue(false);
    });

    it('sets up legacy mobile controls and publishes initial Preact snapshots', () => {
        const { refs, snapshots } = setupController();

        expect(legacyMobileControlsMock.ensureLegacyMobileRefs).toHaveBeenCalledWith(domEnvironmentMock.guardDomPointer);
        expect(legacyMobileControlsMock.renderLegacyMobileActions).toHaveBeenCalledWith(refs, expect.arrayContaining([
            expect.objectContaining({ id: 'rotate', label: 'action:rotate' }),
            expect.objectContaining({ id: 'power', label: 'action:power' })
        ]));
        expect(legacyMobileControlsMock.renderLegacyMobileCableMenu).toHaveBeenCalledWith(refs, expect.arrayContaining([
            expect.objectContaining({ label: 'cable:BASIC' }),
            expect.objectContaining({ label: 'cable:FIBER' })
        ]));
        expect(legacyMobileControlsMock.updateLegacyMobileBuildSummary).toHaveBeenCalledWith(refs, {
            detail: 'cost:DATA_DOWNLOADER',
            title: 'summary:DATA_DOWNLOADER'
        });
        expect(snapshots.at(-1)).toEqual(expect.objectContaining({
            open: true,
            selectedType: 'DATA_DOWNLOADER',
            summaryTitle: 'summary:DATA_DOWNLOADER'
        }));
        expect(legacyMobileControlsMock.syncLegacyMobileShadowState).toHaveBeenLastCalledWith(refs, true, false);
    });

    it('routes mobile action requests through scene commands and build selection requests', () => {
        const { scene, selections } = setupController();

        EventBus.emit('MOBILE_ACTION_REQUESTED', { id: 'rotate' });
        EventBus.emit('MOBILE_ACTION_REQUESTED', { id: 'remove' });
        EventBus.emit('MOBILE_ACTION_REQUESTED', { id: 'cancel' });
        EventBus.emit('MOBILE_ACTION_REQUESTED', { id: 'defense' });
        EventBus.emit('MOBILE_ACTION_REQUESTED', { id: 'power' });

        expect(scene.rotateCursor).toHaveBeenCalledTimes(1);
        expect(scene.cancelCurrentAction).toHaveBeenCalledTimes(1);
        expect(scene.toggleDefenseRange).toHaveBeenCalledTimes(1);
        expect(scene.togglePowerGrid).toHaveBeenCalledTimes(1);
        expect(selections).toEqual(['REMOVE']);
    });

    it('uses a basic cable fallback when fiber is locked', () => {
        const { selections, snapshots } = setupController(false);

        EventBus.emit('MOBILE_ACTION_REQUESTED', { id: 'cable' });

        expect(selections).toEqual(['BASIC']);
        expect(legacyMobileControlsMock.setLegacyMobileCableMenuOpen).not.toHaveBeenLastCalledWith(expect.anything(), true);
        expect(snapshots.at(-1)).toEqual(expect.objectContaining({
            cableMenuOpen: false,
            selectedType: 'DATA_DOWNLOADER'
        }));
    });

    it('opens cable options when available and lets legacy fallback options request tools', () => {
        const { refs, selections, snapshots } = setupController(true);

        EventBus.emit('MOBILE_ACTION_REQUESTED', { id: 'cable' });
        const cableOptions = legacyMobileControlsMock.renderLegacyMobileCableMenu.mock.calls.at(-1)?.[1] ?? [];
        cableOptions.find((option: any) => option.label === 'cable:FIBER')?.onPress();

        expect(legacyMobileControlsMock.setLegacyMobileCableMenuOpen).toHaveBeenCalledWith(refs, true);
        expect(legacyMobileControlsMock.setLegacyMobileCableMenuOpen).toHaveBeenCalledWith(refs, false);
        expect(selections).toEqual(['FIBER']);
        expect(snapshots.some(snapshot => snapshot.cableMenuOpen === true)).toBe(true);
    });

    it('cancels transient mobile selections back to the previous build selection', () => {
        const { scene, selections, snapshots } = setupController();

        EventBus.emit('BUILDING_SELECTED', { type: 'PROCESSOR' });
        EventBus.emit('BUILDING_SELECTED', { type: 'REMOVE' });
        EventBus.emit('MOBILE_ACTION_STATUS_REQUESTED', { status: 'Remove mode' });
        EventBus.emit('MOBILE_ACTION_CANCEL_REQUESTED');

        expect(selections).toEqual(['PROCESSOR']);
        expect(scene.mobileActionStatus).toBeNull();
        expect(snapshots.at(-1)).toEqual(expect.objectContaining({
            cableMenuOpen: false,
            selectedType: 'REMOVE'
        }));
    });

    it('removes EventBus listeners on scene shutdown', () => {
        const { events, scene, snapshots } = setupController();
        const initialSnapshotCount = snapshots.length;

        events.emitShutdown();
        EventBus.emit('MOBILE_ACTION_REQUESTED', { id: 'rotate' });
        EventBus.emit('MOBILE_ACTION_STATUS_REQUESTED', { status: 'ignored' });
        EventBus.emit('BUILDING_SELECTED', { type: 'REMOVE' });

        expect(scene.rotateCursor).not.toHaveBeenCalled();
        expect(snapshots).toHaveLength(initialSnapshotCount);
        expect(legacyMobileControlsMock.updateLegacyMobileBuildSummary).toHaveBeenCalledTimes(1);
    });
});
