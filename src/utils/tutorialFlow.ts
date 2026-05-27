import { t } from '../i18n';

export type TutorialStepId =
    | 'CORE'
    | 'RESOURCE'
    | 'POWER'
    | 'MINER'
    | 'STORAGE'
    | 'DOWNLOADER'
    | 'CABLE'
    | 'PROCESSOR'
    | 'TRAINER'
    | 'DEFENSE'
    | 'FIRST_WAVE'
    | 'MODEL_LAB';

export type TutorialHintMode = 'explicit' | 'suggestive';

export type TutorialHintSymbol =
    | 'CORE'
    | 'POWER'
    | 'MINER'
    | 'DOWNLOAD'
    | 'STORAGE'
    | 'PROCESSOR'
    | 'TRAINER'
    | 'DEFENSE'
    | 'MODEL_LAB';

export type TutorialCompletion =
    | { kind: 'auto'; delayMs: number }
    | { kind: 'place-building'; buildingType: string }
    | { kind: 'connect-cable' }
    | { kind: 'produce-item'; buildingType: string; itemType: string }
    | { kind: 'power-online'; buildingType: string }
    | { kind: 'wave-ended' }
    | { kind: 'model-target-set' };

export interface TutorialPoint {
    x: number;
    y: number;
}

export interface TutorialGhostHint {
    type: TutorialHintSymbol;
    x: number;
    y: number;
    width?: number;
    height?: number;
    exact?: boolean;
}

export interface TutorialFlowHint {
    from: TutorialPoint;
    to: TutorialPoint;
    itemType?: string;
    color?: number;
    dotted?: boolean;
}

export interface TutorialAreaHint {
    x: number;
    y: number;
    radius: number;
    color?: number;
    kind: 'resource' | 'range' | 'route' | 'model-growth';
}

export interface TutorialVisualHints {
    mode: TutorialHintMode;
    ghosts?: TutorialGhostHint[];
    flows?: TutorialFlowHint[];
    areas?: TutorialAreaHint[];
}

export interface TutorialStepDefinition {
    id: TutorialStepId;
    title: string;
    detail: string;
    allowedBuildings?: string[] | null;
    completion: TutorialCompletion;
    visualHints?: TutorialVisualHints;
}

export interface TutorialStep extends TutorialStepDefinition {
    completed: boolean;
}

const tileCenter = (x: number, y: number): TutorialPoint => ({
    x: x + 16,
    y: y + 16
});

/**
 * Hint positions aligned to the standalone tutorial arena.
 * Grid coordinates are multiplied by GRID_SIZE (32).
 */
export const TUTORIAL_HINT_POSITIONS = {
    core: { x: 0, y: 0 },
    siliconResource: tileCenter(-4 * 32, -2 * 32),
    energyResource: tileCenter(3 * 32, 3 * 32),

    miner: { x: -5 * 32, y: -3 * 32 },
    storage: { x: -6 * 32, y: 0 },
    downloader: { x: 4 * 32, y: -1 * 32 },
    powerNode: { x: -3 * 32, y: -4 * 32 },
    processor: { x: 5 * 32, y: -1 * 32 },
    trainer: { x: 5 * 32, y: 2 * 32 },
    defense: { x: -1 * 32, y: -7 * 32 },
    modelLab: { x: 5 * 32, y: 4 * 32 }
} as const;

export const TUTORIAL_STEP_DEFINITIONS: TutorialStepDefinition[] = [
    {
        id: 'CORE',
        title: t('tutorial.CORE.title' as any),
        detail: t('tutorial.CORE.detail' as any),
        allowedBuildings: [],
        completion: { kind: 'auto', delayMs: 1800 },
        visualHints: {
            mode: 'explicit',
            ghosts: [{ type: 'CORE', ...TUTORIAL_HINT_POSITIONS.core, width: 4, height: 4 }],
            areas: [{ x: 64, y: 64, radius: 96, color: 0x63ffb1, kind: 'range' }]
        }
    },
    {
        id: 'RESOURCE',
        title: t('tutorial.RESOURCE.title' as any),
        detail: t('tutorial.RESOURCE.detail' as any),
        allowedBuildings: [],
        completion: { kind: 'auto', delayMs: 1800 },
        visualHints: {
            mode: 'explicit',
            areas: [
                { ...TUTORIAL_HINT_POSITIONS.siliconResource, radius: 52, color: 0x94a3b8, kind: 'resource' },
                { ...TUTORIAL_HINT_POSITIONS.energyResource, radius: 20, color: 0xfacc15, kind: 'resource' }
            ]
        }
    },
    {
        id: 'POWER',
        title: t('tutorial.POWER.title' as any),
        detail: t('tutorial.POWER.detail' as any),
        allowedBuildings: ['POWER_NODE', 'REMOVE'],
        completion: { kind: 'power-online', buildingType: 'POWER_NODE' },
        visualHints: {
            mode: 'explicit',
            ghosts: [{ type: 'POWER', ...TUTORIAL_HINT_POSITIONS.powerNode, exact: true }],
            areas: [
                { ...tileCenter(TUTORIAL_HINT_POSITIONS.powerNode.x, TUTORIAL_HINT_POSITIONS.powerNode.y), radius: 5 * 32, color: 0xfacc15, kind: 'range' },
                { ...TUTORIAL_HINT_POSITIONS.siliconResource, radius: 52, color: 0x94a3b8, kind: 'resource' }
            ]
        }
    },
    {
        id: 'MINER',
        title: t('tutorial.MINER.title' as any),
        detail: t('tutorial.MINER.detail' as any),
        allowedBuildings: ['MINER', 'REMOVE'],
        completion: { kind: 'produce-item', buildingType: 'MINER', itemType: 'SILICON' },
        visualHints: {
            mode: 'explicit',
            ghosts: [{ type: 'MINER', ...TUTORIAL_HINT_POSITIONS.miner, exact: true }],
            areas: [{ ...TUTORIAL_HINT_POSITIONS.siliconResource, radius: 52, color: 0x94a3b8, kind: 'resource' }]
        }
    },
    {
        id: 'STORAGE',
        title: t('tutorial.STORAGE.title' as any),
        detail: t('tutorial.STORAGE.detail' as any),
        allowedBuildings: ['STORAGE', 'REMOVE'],
        completion: { kind: 'place-building', buildingType: 'STORAGE' },
        visualHints: {
            mode: 'explicit',
            ghosts: [{ type: 'STORAGE', ...TUTORIAL_HINT_POSITIONS.storage, width: 2, height: 2, exact: true }]
        }
    },
    {
        id: 'DOWNLOADER',
        title: t('tutorial.DOWNLOADER.title' as any),
        detail: t('tutorial.DOWNLOADER.detail' as any),
        allowedBuildings: ['DATA_DOWNLOADER', 'REMOVE'],
        completion: { kind: 'produce-item', buildingType: 'DATA_DOWNLOADER', itemType: 'RAW_DATA' },
        visualHints: {
            mode: 'explicit',
            ghosts: [{ type: 'DOWNLOAD', ...TUTORIAL_HINT_POSITIONS.downloader, exact: true }],
            areas: [{ x: 64, y: 64, radius: 96, color: 0xfacc15, kind: 'range' }]
        }
    },
    {
        id: 'CABLE',
        title: t('tutorial.CABLE.title' as any),
        detail: t('tutorial.CABLE.detail' as any),
        allowedBuildings: ['PROCESSOR', 'BASIC', 'REMOVE'],
        completion: { kind: 'connect-cable' },
        visualHints: {
            mode: 'explicit',
            ghosts: [{ type: 'PROCESSOR', ...TUTORIAL_HINT_POSITIONS.processor }],
            flows: [
                { from: tileCenter(TUTORIAL_HINT_POSITIONS.downloader.x, TUTORIAL_HINT_POSITIONS.downloader.y), to: tileCenter(TUTORIAL_HINT_POSITIONS.processor.x, TUTORIAL_HINT_POSITIONS.processor.y), itemType: 'RAW_DATA' }
            ]
        }
    },
    {
        id: 'PROCESSOR',
        title: t('tutorial.PROCESSOR.title' as any),
        detail: t('tutorial.PROCESSOR.detail' as any),
        allowedBuildings: ['BASIC', 'REMOVE'],
        completion: { kind: 'produce-item', buildingType: 'PROCESSOR', itemType: 'LABELED_DATA' },
        visualHints: {
            mode: 'suggestive',
            ghosts: [{ type: 'PROCESSOR', ...TUTORIAL_HINT_POSITIONS.processor }],
            flows: [
                { from: tileCenter(TUTORIAL_HINT_POSITIONS.downloader.x, TUTORIAL_HINT_POSITIONS.downloader.y), to: tileCenter(TUTORIAL_HINT_POSITIONS.processor.x, TUTORIAL_HINT_POSITIONS.processor.y), itemType: 'RAW_DATA', dotted: true }
            ]
        }
    },
    {
        id: 'TRAINER',
        title: t('tutorial.TRAINER.title' as any),
        detail: t('tutorial.TRAINER.detail' as any),
        allowedBuildings: ['WEIGHT_TRAINER', 'BASIC', 'REMOVE'],
        completion: { kind: 'produce-item', buildingType: 'WEIGHT_TRAINER', itemType: 'WEIGHT_UPDATE' },
        visualHints: {
            mode: 'suggestive',
            ghosts: [{ type: 'TRAINER', ...TUTORIAL_HINT_POSITIONS.trainer }],
            flows: [
                { from: tileCenter(TUTORIAL_HINT_POSITIONS.processor.x, TUTORIAL_HINT_POSITIONS.processor.y), to: tileCenter(TUTORIAL_HINT_POSITIONS.trainer.x, TUTORIAL_HINT_POSITIONS.trainer.y), itemType: 'LABELED_DATA', dotted: true }
            ]
        }
    },
    {
        id: 'DEFENSE',
        title: t('tutorial.DEFENSE.title' as any),
        detail: t('tutorial.DEFENSE.detail' as any),
        allowedBuildings: ['CLASSIFIER', 'REMOVE'],
        completion: { kind: 'place-building', buildingType: 'CLASSIFIER' },
        visualHints: {
            mode: 'suggestive',
            ghosts: [{ type: 'DEFENSE', ...TUTORIAL_HINT_POSITIONS.defense }],
            areas: [
                { ...tileCenter(TUTORIAL_HINT_POSITIONS.defense.x, TUTORIAL_HINT_POSITIONS.defense.y), radius: 4 * 32, color: 0xff6888, kind: 'range' },
                { x: 0, y: -9 * 32, radius: 36, color: 0xff6888, kind: 'route' }
            ]
        }
    },
    {
        id: 'FIRST_WAVE',
        title: t('tutorial.FIRST_WAVE.title' as any),
        detail: t('tutorial.FIRST_WAVE.detail' as any),
        allowedBuildings: null,
        completion: { kind: 'wave-ended' },
        visualHints: {
            mode: 'suggestive',
            areas: [{ x: 0, y: -9 * 32, radius: 48, color: 0xff6888, kind: 'route' }]
        }
    },
    {
        id: 'MODEL_LAB',
        title: t('tutorial.MODEL_LAB.title' as any),
        detail: t('tutorial.MODEL_LAB.detail' as any),
        allowedBuildings: ['MODEL_TRAINING_LAB', 'REMOVE'],
        completion: { kind: 'model-target-set' },
        visualHints: {
            mode: 'suggestive',
            ghosts: [{ type: 'MODEL_LAB', ...TUTORIAL_HINT_POSITIONS.modelLab, width: 2, height: 2 }],
            areas: [{ ...tileCenter(TUTORIAL_HINT_POSITIONS.modelLab.x, TUTORIAL_HINT_POSITIONS.modelLab.y), radius: 72, color: 0x64ffcf, kind: 'model-growth' }]
        }
    }
];

export function createTutorialSteps(): TutorialStep[] {
    return TUTORIAL_STEP_DEFINITIONS.map(step => ({
        ...step,
        title: t(`tutorial.${step.id}.title` as any),
        detail: t(`tutorial.${step.id}.detail` as any),
        completed: false
    }));
}

export function getTutorialProgressIndex(steps: TutorialStep[]): number {
    const firstIncomplete = steps.findIndex(step => !step.completed);
    return firstIncomplete < 0 ? steps.length : firstIncomplete;
}

export function applyTutorialProgress(steps: TutorialStep[], completed: boolean, stepIndex = 0): TutorialStep[] {
    const count = Math.max(0, Math.min(steps.length, stepIndex));
    return steps.map((step, index) => ({
        ...step,
        completed: completed || index < count
    }));
}

export function completeTutorialStep(steps: TutorialStep[], id: TutorialStepId): TutorialStep[] {
    return steps.map(step => step.id === id ? { ...step, completed: true } : step);
}
