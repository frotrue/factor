import { describe, expect, test } from 'vitest';
import TrainingPlannerManager from './TrainingPlannerManager';
import ResearchManager from './ResearchManager';
import { createDefaultDefenseModelState } from '../utils/modelTrainingProgress';

function createSceneStub(options: {
    towers?: string[];
    enemyCount?: number;
    coreHp?: number;
} = {}) {
    const states: Record<string, ReturnType<typeof createDefaultDefenseModelState>> = {};
    ['CLASSIFIER', 'FILTER', 'FIREWALL'].forEach(type => {
        states[type] = createDefaultDefenseModelState();
    });

    const scene: any = {
        time: { now: 0 },
        defenseModelStates: states,
        uiManager: {
            logMessage: () => {},
            renderTrainingLab: () => {},
            createBuildingButtons: () => {}
        },
        effectsManager: {
            playModelTrainingPulse: () => {}
        },
        syncDefenseModelType: () => {},
        getDefenseModelState: (type: string) => states[type],
        buildingManager: {
            get: () => ({ hp: options.coreHp ?? 1000, maxHp: 1000 }),
            forEach: (callback: (building: { type: string }) => void) => {
                (options.towers ?? []).forEach(type => callback({ type }));
            }
        },
        waveManager: {
            enemies: new Map(
                Array.from({ length: options.enemyCount ?? 0 }, (_, index) => [
                    `enemy-${index}`,
                    { hp: 100 }
                ])
            )
        }
    };
    scene.researchManager = new ResearchManager(scene);
    scene.trainingPlanner = new TrainingPlannerManager(scene);
    return scene;
}

describe('TrainingPlannerManager', () => {
    test('keeps a nearly ready selected job instead of switching to another ready job', () => {
        const scene = createSceneStub({ towers: ['CLASSIFIER', 'FILTER'] });
        scene.trainingPlanner.loadState({
            activeJobId: TrainingPlannerManager.getDefenseJobId('CLASSIFIER'),
            autoEnabled: true,
            mode: 'AUTO_DECIDE'
        });
        scene.defenseModelStates.CLASSIFIER.accumulatedTrainingData = 90;
        scene.defenseModelStates.FILTER.accumulatedTrainingData = 100;

        scene.trainingPlanner.prepareLabTick({} as any);

        expect(scene.trainingPlanner.activeJobId).toBe(TrainingPlannerManager.getDefenseJobId('CLASSIFIER'));
    });

    test('selects defense accuracy under high pressure when accuracy is below the safety line', () => {
        const scene = createSceneStub({ towers: ['CLASSIFIER', 'CLASSIFIER'], enemyCount: 20 });
        scene.defenseModelStates.CLASSIFIER.modelAccuracy = 60;
        scene.defenseModelStates.CLASSIFIER.accumulatedTrainingData = 100;
        scene.researchManager.addJobProgress('TECH_EFFICIENT_MINING', 75);

        scene.trainingPlanner.prepareLabTick({} as any);

        expect(scene.trainingPlanner.activeJobId).toBe(TrainingPlannerManager.getDefenseJobId('CLASSIFIER'));
        expect(scene.defenseModelStates.CLASSIFIER.trainingRewardPreference).toBe('accuracy');
    });

    test('allows ready system protocols to outrank defense during low threat', () => {
        const scene = createSceneStub();
        scene.researchManager.addJobProgress('TECH_EFFICIENT_MINING', 75);

        scene.trainingPlanner.prepareLabTick({} as any);

        expect(scene.trainingPlanner.activeJobId).toBe('TECH_EFFICIENT_MINING');
    });

    test('converts adjacent powered GPUs into lab training power', () => {
        const scene = createSceneStub();
        const lab = {
            hasPower: true,
            countAdjacentGpuClusters: () => 2
        };

        expect(scene.trainingPlanner.getTrainingPower(lab as any)).toBeCloseTo(1 / 0.6);
    });
});
