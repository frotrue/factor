import { afterEach, describe, expect, it, vi } from 'vitest';
import EventBus from '../managers/EventBus';
import TrainingLabController from './TrainingLabController';

const modelTrainingLabMock = vi.hoisted(() => {
    class MockModelTrainingLab {
        targetType: string | null = null;
        getDefenseJobId = vi.fn((type: string) => `defense:${type}`);
        getSummary = vi.fn(() => ({
            activeGpuCount: 1,
            adjacentGpuCount: 2,
            speedMultiplier: 0.75
        }));
        setSystemJob = vi.fn();
        setTarget = vi.fn((type: string) => {
            this.targetType = type;
        });
        setTrainingRewardPreference = vi.fn();
    }

    return { MockModelTrainingLab };
});

const configMock = vi.hoisted(() => ({
    CONFIG: {
        MODEL_TRAINING: {
            BASE_TRAINING_TICKS: 100,
            TARGET_TYPES: ['CLASSIFIER', 'FILTER']
        },
        RESEARCH: {
            GPU_ACCELERATION: {
                COST: 50,
                ID: 'GPU_ACCELERATION'
            }
        }
    }
}));

const i18nMock = vi.hoisted(() => ({
    getBuildingName: vi.fn((type: string) => `building:${type}`),
    textForKey: vi.fn((key: string, params?: Record<string, unknown>) => params
        ? `${key}:${JSON.stringify(params)}`
        : key)
}));

const domEnvironmentMock = vi.hoisted(() => ({
    guardDomPointer: vi.fn(),
    restoreGameCanvasFocus: vi.fn()
}));

const notificationDisplayMock = vi.hoisted(() => ({
    createTrainingLabMissingLogMessage: vi.fn(() => 'training lab missing')
}));

const legacyTrainingLabMock = vi.hoisted(() => ({
    ensureLegacyTrainingLabModal: vi.fn(),
    renderLegacyTrainingLabDefenseRows: vi.fn(),
    renderLegacyTrainingLabShell: vi.fn(() => ({} as HTMLElement)),
    renderLegacyTrainingLabSystemRows: vi.fn(),
    setLegacyTrainingLabOpen: vi.fn(),
    syncLegacyTrainingLabControls: vi.fn()
}));

const trainingLabDisplayMock = vi.hoisted(() => ({
    createTrainingLabDefenseRows: vi.fn(() => [
        { id: 'CLASSIFIER', name: 'Classifier', rewardPreference: 'accuracy' },
        { id: 'FILTER', name: 'Filter', rewardPreference: 'damage' }
    ]),
    createTrainingLabDefenseRowSnapshots: vi.fn((rows: any[]) => rows.map(row => ({
        active: false,
        detail: `defense-detail:${row.id}`,
        id: row.id,
        kind: 'DEFENSE',
        progress: '0% / 0%',
        rewardPreference: row.rewardPreference,
        title: row.name
    }))),
    createTrainingLabDisplayPayload: vi.fn((input: any) => ({
        legacyShell: input.shell,
        snapshot: {
            activeTab: input.activeTab,
            autoEnabled: input.shell.autoActive,
            duration: input.shell.durationText,
            open: input.open,
            plannerReason: input.shell.plannerReasonText,
            plannerStatus: input.shell.plannerStatusText,
            rows: input.rows
        }
    })),
    createTrainingLabShellDisplay: vi.fn(({ planner }: any) => ({
        autoActive: planner.autoEnabled,
        autoToggleText: planner.autoEnabled ? 'auto:on' : 'auto:off',
        durationText: `duration:${planner.getEstimatedDurationTicks()}`,
        overviewText: 'overview',
        plannerReasonText: planner.lastDecisionReason ?? 'manual',
        plannerStatusText: `status:${planner.getJobLabel()}`
    })),
    createTrainingLabSystemRows: vi.fn(() => [
        { disabled: false, id: 'GPU_ACCELERATION', name: 'GPU Acceleration' }
    ]),
    createTrainingLabSystemRowSnapshots: vi.fn((rows: any[]) => rows.map(row => ({
        active: false,
        detail: `system-detail:${row.id}`,
        disabled: row.disabled,
        id: row.id,
        kind: 'SYSTEM',
        progress: '0% / 0%',
        title: row.name
    })))
}));

vi.mock('../buildings/ModelTrainingLab', () => ({
    default: modelTrainingLabMock.MockModelTrainingLab
}));
vi.mock('../config', () => configMock);
vi.mock('../i18n', () => i18nMock);
vi.mock('./domEnvironment', () => domEnvironmentMock);
vi.mock('./notificationDisplay', () => notificationDisplayMock);
vi.mock('./legacyTrainingLab', () => legacyTrainingLabMock);
vi.mock('./trainingLabDisplay', () => trainingLabDisplayMock);

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

const owner = 'TrainingLabController.test';

function createModal() {
    return {
        dataset: {}
    } as HTMLElement;
}

function createLab() {
    return new modelTrainingLabMock.MockModelTrainingLab();
}

function createScene(labs: any[] = []) {
    const events = new FakeSceneEvents();
    const scene = {
        buildingManager: {
            getByType: vi.fn(() => labs)
        },
        events,
        getDefenseModelState: vi.fn((type: string) => ({
            accumulatedTrainingData: 0,
            currentRequirement: 100,
            damageBonus: type === 'FILTER' ? 16 : 12,
            inferenceCharge: 0,
            isTraining: false,
            modelAccuracy: type === 'FILTER' ? 74 : 62,
            modelVersion: 1,
            trainingDurationTicks: 100,
            trainingProgressTicks: 0,
            trainingRewardPreference: 'accuracy'
        })),
        isGpuUnlocked: vi.fn(() => true),
        researchManager: {
            getJobProgress: vi.fn(() => ({
                completed: false,
                isTraining: false,
                progress: 10
            })),
            isJobAvailable: vi.fn(() => true)
        },
        trainingPlanner: {
            activeJobId: null as string | null,
            autoEnabled: false,
            getEstimatedDurationTicks: vi.fn(() => 75),
            getJobLabel: vi.fn(() => 'Manual job'),
            lastDecisionReason: null as string | null,
            mode: 'MANUAL',
            setAutoEnabled: vi.fn((enabled: boolean) => {
                scene.trainingPlanner.autoEnabled = enabled;
                scene.trainingPlanner.mode = enabled ? 'AUTO_DECIDE' : 'MANUAL';
            })
        }
    };

    return { events, scene };
}

function createController(labs: any[] = []) {
    const modal = createModal();
    const { events, scene } = createScene(labs);
    legacyTrainingLabMock.ensureLegacyTrainingLabModal.mockReturnValue(modal);

    return {
        controller: new TrainingLabController(scene as any),
        events,
        modal,
        scene
    };
}

function collectEvents() {
    const activity: string[] = [];
    const openStates: boolean[] = [];
    const snapshots: any[] = [];

    EventBus.on('ACTIVITY_LOG_ENTRY_REQUESTED', ({ message }) => {
        activity.push(message);
    }, owner);
    EventBus.on('TRAINING_LAB_OPEN_CHANGED', ({ open }) => {
        openStates.push(open);
    }, owner);
    EventBus.on('TRAINING_LAB_UPDATED', snapshot => {
        snapshots.push(snapshot);
    }, owner);

    return { activity, openStates, snapshots };
}

function setupController(labs: any[] = []) {
    const events = collectEvents();
    const setup = createController(labs);
    setup.controller.setup();
    return { ...setup, ...events };
}

describe('TrainingLabController', () => {
    afterEach(() => {
        EventBus.offAll(owner);
        EventBus.offAll('TrainingLabController');
        vi.clearAllMocks();
    });

    it('opens an explicit lab and publishes a DEFENSE snapshot through the shared display payload', () => {
        const lab = createLab();
        const { modal, snapshots } = setupController();

        EventBus.emit('TRAINING_LAB_OPEN_REQUESTED', { lab: lab as any });

        expect(legacyTrainingLabMock.ensureLegacyTrainingLabModal).toHaveBeenCalledWith(domEnvironmentMock.guardDomPointer);
        expect(legacyTrainingLabMock.setLegacyTrainingLabOpen).toHaveBeenCalledWith(modal, true);
        expect(trainingLabDisplayMock.createTrainingLabShellDisplay).toHaveBeenCalledWith(expect.objectContaining({
            gpuUnlocked: true,
            planner: expect.any(Object),
            summary: expect.objectContaining({ activeGpuCount: 1 })
        }));
        expect(legacyTrainingLabMock.renderLegacyTrainingLabDefenseRows).toHaveBeenCalledWith(
            expect.any(Object),
            expect.arrayContaining([expect.objectContaining({ id: 'CLASSIFIER' })]),
            expect.objectContaining({
                guardDomPointer: domEnvironmentMock.guardDomPointer
            })
        );
        expect(snapshots.at(-1)).toEqual(expect.objectContaining({
            activeTab: 'DEFENSE',
            open: true,
            rows: expect.arrayContaining([expect.objectContaining({ id: 'CLASSIFIER', kind: 'DEFENSE' })])
        }));
    });

    it('opens the first available lab on the requested SYSTEM tab and renders system jobs', () => {
        const lab = createLab();
        const { snapshots } = setupController([lab]);

        EventBus.emit('TRAINING_LAB_OPEN_REQUESTED', { tab: 'SYSTEM' });

        expect(trainingLabDisplayMock.createTrainingLabSystemRows).toHaveBeenCalledWith(expect.objectContaining({
            activeJobId: null,
            getJobProgress: expect.any(Function),
            isJobAvailable: expect.any(Function)
        }));
        expect(legacyTrainingLabMock.renderLegacyTrainingLabSystemRows).toHaveBeenCalledWith(
            expect.any(Object),
            expect.arrayContaining([expect.objectContaining({ id: 'GPU_ACCELERATION' })]),
            expect.objectContaining({ onSelect: expect.any(Function) })
        );
        expect(snapshots.at(-1)).toEqual(expect.objectContaining({
            activeTab: 'SYSTEM',
            rows: expect.arrayContaining([expect.objectContaining({ id: 'GPU_ACCELERATION', kind: 'SYSTEM' })])
        }));
    });

    it('logs through the existing activity path when no training lab exists', () => {
        const { activity, snapshots } = setupController([]);

        EventBus.emit('TRAINING_LAB_OPEN_REQUESTED', { tab: 'DEFENSE' });

        expect(activity).toEqual(['training lab missing']);
        expect(snapshots).toEqual([]);
        expect(legacyTrainingLabMock.setLegacyTrainingLabOpen).not.toHaveBeenCalled();
    });

    it('routes auto, tab, job, and reward requests through the active lab and activity log', () => {
        const lab = createLab();
        const { activity, scene, snapshots } = setupController();

        EventBus.emit('TRAINING_LAB_OPEN_REQUESTED', { lab: lab as any });
        EventBus.emit('TRAINING_LAB_AUTO_REQUESTED', { enabled: true });
        EventBus.emit('TRAINING_LAB_TAB_REQUESTED', { tab: 'SYSTEM' });
        EventBus.emit('TRAINING_LAB_JOB_SELECT_REQUESTED', { kind: 'SYSTEM', id: 'GPU_ACCELERATION' });
        EventBus.emit('TRAINING_LAB_TAB_REQUESTED', { tab: 'DEFENSE' });
        EventBus.emit('TRAINING_LAB_JOB_SELECT_REQUESTED', { kind: 'DEFENSE', id: 'CLASSIFIER' });
        EventBus.emit('TRAINING_LAB_REWARD_REQUESTED', { type: 'CLASSIFIER', reward: 'damage' });

        expect(scene.trainingPlanner.setAutoEnabled).toHaveBeenCalledWith(true);
        expect(lab.setSystemJob).toHaveBeenCalledWith('GPU_ACCELERATION');
        expect(lab.setTarget).toHaveBeenCalledWith('CLASSIFIER');
        expect(lab.setTrainingRewardPreference).toHaveBeenCalledWith('CLASSIFIER', 'damage');
        expect(activity).toEqual(expect.arrayContaining([
            expect.stringContaining('trainingLab.jobSet'),
            expect.stringContaining('trainingLab.targetSet'),
            expect.stringContaining('trainingLab.rewardSet')
        ]));
        expect(snapshots.some(snapshot => snapshot.activeTab === 'SYSTEM')).toBe(true);
        expect(snapshots.at(-1)).toEqual(expect.objectContaining({ activeTab: 'DEFENSE' }));
    });

    it('keeps unavailable system jobs and invalid defense requests from mutating the active lab', () => {
        const lab = createLab();
        const { scene } = setupController();
        scene.researchManager.isJobAvailable.mockReturnValue(false);
        scene.researchManager.getJobProgress.mockReturnValue({
            completed: false,
            isTraining: false,
            progress: 0
        });

        EventBus.emit('TRAINING_LAB_OPEN_REQUESTED', { lab: lab as any });
        EventBus.emit('TRAINING_LAB_JOB_SELECT_REQUESTED', { kind: 'SYSTEM', id: 'GPU_ACCELERATION' });
        EventBus.emit('TRAINING_LAB_JOB_SELECT_REQUESTED', { kind: 'DEFENSE', id: 'INVALID_DEFENSE' });
        EventBus.emit('TRAINING_LAB_REWARD_REQUESTED', { type: 'INVALID_DEFENSE', reward: 'accuracy' });

        expect(lab.setSystemJob).not.toHaveBeenCalled();
        expect(lab.setTarget).not.toHaveBeenCalledWith('INVALID_DEFENSE');
        expect(lab.setTrainingRewardPreference).not.toHaveBeenCalledWith('INVALID_DEFENSE', 'accuracy');
    });

    it('closes the legacy fallback, restores focus, and removes listeners on shutdown', () => {
        const lab = createLab();
        const { events, modal, openStates, snapshots } = setupController();

        EventBus.emit('TRAINING_LAB_OPEN_REQUESTED', { lab: lab as any });
        EventBus.emit('TRAINING_LAB_CLOSE_REQUESTED');

        expect(legacyTrainingLabMock.setLegacyTrainingLabOpen).toHaveBeenLastCalledWith(modal, false);
        expect(openStates).toEqual([false]);
        expect(domEnvironmentMock.restoreGameCanvasFocus).toHaveBeenCalledTimes(1);

        const snapshotCountAfterClose = snapshots.length;
        events.emitShutdown();
        EventBus.emit('TRAINING_LAB_OPEN_REQUESTED', { lab: lab as any });
        EventBus.emit('TRAINING_LAB_AUTO_REQUESTED', { enabled: true });

        expect(snapshots).toHaveLength(snapshotCountAfterClose);
        expect(legacyTrainingLabMock.setLegacyTrainingLabOpen).toHaveBeenCalledTimes(2);
    });
});
