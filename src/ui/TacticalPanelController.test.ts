import { afterEach, describe, expect, it, vi } from 'vitest';
import EventBus from '../managers/EventBus';
import TacticalPanelController from './TacticalPanelController';

const i18nMock = vi.hoisted(() => ({
    getBuildingName: vi.fn((type: string) => `building:${type}`)
}));

const progressionGatesMock = vi.hoisted(() => ({
    getObjectiveState: vi.fn((input: any) => ({
        id: input.hasDefense ? 'defense-ready' : 'build-defense',
        input
    }))
}));

const waveSimulationMock = vi.hoisted(() => ({
    createWaveBriefing: vi.fn((wave: number, difficultyId: string) => ({
        difficultyId,
        recommendedDefense: `recommend:${wave}`,
        routeNames: [`route:${difficultyId}`],
        routes: [{ id: 'NORTH', label: 'North Port' }],
        special: null,
        threat: 'Low',
        wave
    }))
}));

const legacyTacticalPanelsMock = vi.hoisted(() => ({
    getLegacyTacticalPanelRefs: vi.fn((waveTimerEl: HTMLElement | null) => ({ waveTimerEl })),
    showLegacyTacticalPanels: vi.fn(),
    updateLegacyDefensePanel: vi.fn(),
    updateLegacyObjectivePanel: vi.fn(),
    updateLegacyPowerStatus: vi.fn(),
    updateLegacyWavePanel: vi.fn()
}));

const tacticalPanelDisplayMock = vi.hoisted(() => ({
    createLegacyDefenseStatusDisplay: vi.fn((counts: any[], activeLab: any) => ({
        detail: `defense:${counts.map(item => `${item.name}:${item.count}`).join(',')}:${activeLab?.name ?? 'none'}`,
        title: `defense-count:${counts.reduce((sum, item) => sum + item.count, 0)}`
    })),
    createLegacyObjectiveDisplay: vi.fn((state: any) => ({
        detail: `objective-detail:${state.id}`,
        title: `objective-title:${state.id}`
    })),
    createLegacyPowerStatusDisplay: vi.fn((powerData: any) => ({
        text: powerData ? `power:${powerData.net}` : 'power:unknown',
        tone: powerData?.net < 0 ? 'danger' : 'default'
    })),
    createLegacyWavePanelDisplay: vi.fn((briefing: any, timer?: number) => briefing
        ? {
            detail: `wave-detail:${briefing.threat}`,
            recommendation: briefing.recommendedDefense,
            timer: typeof timer === 'number' ? `timer:${timer}` : undefined,
            title: `wave:${briefing.wave}`
        }
        : null),
    createTacticalPanelDisplayPayload: vi.fn((input: any) => ({
        legacyDefense: input.defense,
        legacyObjective: input.objective,
        legacyPowerStatus: input.powerStatus,
        legacyWave: input.wave,
        snapshot: {
            defense: input.defense,
            objective: input.objective,
            powerStatus: input.powerStatus,
            threat: input.wave,
            wave: input.briefing?.wave
        }
    }))
}));

vi.mock('../i18n', () => i18nMock);
vi.mock('../utils/progressionGates', () => progressionGatesMock);
vi.mock('../utils/waveSimulation', () => waveSimulationMock);
vi.mock('../buildings/ModelTrainingLab', () => ({
    default: class ModelTrainingLab {}
}));
vi.mock('./legacyTacticalPanels', () => legacyTacticalPanelsMock);
vi.mock('./tacticalPanelDisplay', () => tacticalPanelDisplayMock);

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

const owner = 'TacticalPanelController.test';

function createController() {
    const events = new FakeSceneEvents();
    const scene = {
        buildingManager: {
            countByTypes: vi.fn((types: string[]) => {
                if (types.includes('DATA_DOWNLOADER')) return 1;
                if (types.includes('PROCESSOR') || types.includes('WEIGHT_TRAINER')) return 1;
                if (types.includes('CLASSIFIER')) return 2;
                if (types.includes('FILTER')) return 1;
                if (types.includes('FIREWALL')) return 0;
                return 0;
            }),
            getByType: vi.fn(() => [])
        },
        difficultyId: 'HARD',
        events,
        getDefenseModelState: vi.fn((type: string) => ({
            modelAccuracy: type === 'FILTER' ? 72 : 64,
            modelVersion: type === 'FIREWALL' ? 0 : 2
        })),
        performanceStats: {
            increment: vi.fn()
        },
        time: {
            now: 0
        },
        waveManager: {
            currentWave: 3,
            waveActive: true
        }
    };
    const topHudRefs = {
        dataEl: null,
        fpsEl: null,
        packetsEl: null,
        powerEl: null,
        siliconEl: null,
        waveEl: null,
        waveTimerEl: {} as HTMLElement
    };

    return {
        controller: new TacticalPanelController(scene as any, topHudRefs as any),
        events,
        scene,
        topHudRefs
    };
}

function collectSnapshots() {
    const snapshots: any[] = [];
    EventBus.on('TACTICAL_PANELS_UPDATED', snapshot => {
        snapshots.push(snapshot);
    }, owner);
    return snapshots;
}

describe('TacticalPanelController', () => {
    afterEach(() => {
        EventBus.offAll(owner);
        EventBus.offAll('TacticalPanelController');
        vi.clearAllMocks();
    });

    it('renders legacy panels and publishes the initial tactical snapshot on setup', () => {
        const snapshots = collectSnapshots();
        const { controller, scene, topHudRefs } = createController();

        controller.setupEvents();

        expect(waveSimulationMock.createWaveBriefing).toHaveBeenCalledWith(4, 'HARD');
        expect(legacyTacticalPanelsMock.showLegacyTacticalPanels).toHaveBeenCalledTimes(1);
        expect(legacyTacticalPanelsMock.getLegacyTacticalPanelRefs).toHaveBeenCalledWith(topHudRefs.waveTimerEl);
        expect(legacyTacticalPanelsMock.updateLegacyObjectivePanel).toHaveBeenCalledWith(
            expect.any(Object),
            'objective-title:defense-ready',
            'objective-detail:defense-ready'
        );
        expect(legacyTacticalPanelsMock.updateLegacyDefensePanel).toHaveBeenCalledWith(
            expect.any(Object),
            'defense-count:3',
            expect.stringContaining('building:CLASSIFIER:2')
        );
        expect(legacyTacticalPanelsMock.updateLegacyPowerStatus).toHaveBeenCalledWith(
            expect.any(Object),
            'power:unknown',
            'default'
        );
        expect(scene.performanceStats.increment).toHaveBeenCalledWith('uiTacticalRenders');
        expect(snapshots).toEqual([
            expect.objectContaining({
                objective: expect.objectContaining({ title: 'objective-title:defense-ready' }),
                powerStatus: expect.objectContaining({ text: 'power:unknown' }),
                wave: 4
            })
        ]);
    });

    it('updates power and wave timer mirrors without publishing a full snapshot', () => {
        const snapshots = collectSnapshots();
        const { controller } = createController();

        controller.setupEvents();
        const initialSnapshotCount = snapshots.length;
        EventBus.emit('POWER_UPDATED', {
            consumption: 12,
            isBlackout: false,
            net: -4,
            networks: [],
            production: 8
        });
        EventBus.emit('WAVE_UPDATE', { timer: 1500 });

        expect(legacyTacticalPanelsMock.updateLegacyPowerStatus).toHaveBeenLastCalledWith(
            expect.any(Object),
            'power:-4',
            'danger'
        );
        expect(legacyTacticalPanelsMock.updateLegacyWavePanel).toHaveBeenLastCalledWith(
            expect.any(Object),
            expect.objectContaining({ timer: 'timer:1500' })
        );
        expect(snapshots).toHaveLength(initialSnapshotCount);
    });

    it('throttles frame refreshes and force-renders explicit tactical refresh requests', () => {
        const snapshots = collectSnapshots();
        const { controller, scene } = createController();

        controller.setupEvents();
        EventBus.emit('BUILDING_PLACED', { key: '1,1', building: {}, type: 'CLASSIFIER' });
        EventBus.emit('UI_FRAME_REFRESH_REQUESTED', { itemCount: 10 });
        expect(snapshots).toHaveLength(1);

        scene.time.now = 300;
        EventBus.emit('UI_FRAME_REFRESH_REQUESTED', { itemCount: 10 });
        expect(snapshots).toHaveLength(2);

        EventBus.emit('BUILDING_REMOVED', { key: '1,1' });
        EventBus.emit('TACTICAL_PANELS_REFRESH_REQUESTED');
        expect(snapshots).toHaveLength(3);
    });

    it('refreshes immediately for wave briefing changes and wave end events', () => {
        const snapshots = collectSnapshots();
        const { controller } = createController();
        const briefing = {
            difficultyId: 'NORMAL',
            recommendedDefense: 'add filter',
            routeNames: ['North Port'],
            routes: [{ id: 'NORTH', label: 'North Port' }],
            special: 'DDoS risk',
            threat: 'High',
            wave: 8
        };

        controller.setupEvents();
        EventBus.emit('WAVE_BRIEFING_UPDATED', briefing as any);
        EventBus.emit('WAVE_ENDED', { wave: 7 });

        expect(legacyTacticalPanelsMock.updateLegacyWavePanel).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({ title: 'wave:8' })
        );
        expect(snapshots.at(-1)).toEqual(expect.objectContaining({ wave: 8 }));
        expect(snapshots.length).toBeGreaterThanOrEqual(2);
    });

    it('removes EventBus listeners on scene shutdown', () => {
        const snapshots = collectSnapshots();
        const { controller, events } = createController();

        controller.setupEvents();
        const initialSnapshotCount = snapshots.length;
        events.emitShutdown();
        EventBus.emit('TACTICAL_PANELS_REFRESH_REQUESTED');
        EventBus.emit('POWER_UPDATED', {
            consumption: 1,
            isBlackout: false,
            net: -1,
            networks: [],
            production: 0
        });

        expect(snapshots).toHaveLength(initialSnapshotCount);
        expect(legacyTacticalPanelsMock.updateLegacyPowerStatus).toHaveBeenCalledTimes(1);
    });
});
