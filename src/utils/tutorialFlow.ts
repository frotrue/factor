import { t } from '../i18n';

export type TutorialStepId =
    | 'RESOURCE'
    | 'POWER'
    | 'DATA_SOURCE'
    | 'CONNECTION'
    | 'PROCESSING'
    | 'DEFENSE'
    | 'RESEARCH';

export type TutorialHintMode = 'explicit' | 'suggestive';

export type TutorialHintSymbol =
    | 'POWER'
    | 'MINER'
    | 'DOWNLOAD'
    | 'STORAGE'
    | 'PROCESSOR'
    | 'TRAINER'
    | 'DEFENSE'
    | 'MODEL_LAB';

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
    allowedBuildings?: string[];
    visualHints?: TutorialVisualHints;
}

export interface TutorialStep extends TutorialStepDefinition {
    completed: boolean;
}

const tileCenter = (x: number, y: number): TutorialPoint => ({
    x: x + 16,
    y: y + 16
});

export const TUTORIAL_HINT_POSITIONS = {
    siliconResource: tileCenter(-128, -64),
    energyResource: tileCenter(96, 96),
    powerNode: { x: -96, y: -32 },
    miner: { x: -128, y: -64 },
    storage: { x: -64, y: 0 },
    downloader: { x: -160, y: -128 },
    processor: { x: -96, y: -128 },
    trainer: { x: -32, y: -128 },
    defense: { x: -32, y: -160 },
    modelLab: { x: 32, y: -128 }
} as const;

export const TUTORIAL_STEP_DEFINITIONS: TutorialStepDefinition[] = [
    {
        id: 'RESOURCE',
        title: t('tutorial.RESOURCE.title'),
        detail: t('tutorial.RESOURCE.detail'),
        allowedBuildings: [],
        visualHints: {
            mode: 'explicit',
            areas: [
                { ...TUTORIAL_HINT_POSITIONS.siliconResource, radius: 20, color: 0x94a3b8, kind: 'resource' },
                { ...TUTORIAL_HINT_POSITIONS.energyResource, radius: 20, color: 0xfacc15, kind: 'resource' }
            ]
        }
    },
    {
        id: 'POWER',
        title: t('tutorial.POWER.title'),
        detail: t('tutorial.POWER.detail'),
        allowedBuildings: ['POWER_NODE'],
        visualHints: {
            mode: 'explicit',
            ghosts: [
                { type: 'POWER', ...TUTORIAL_HINT_POSITIONS.powerNode, exact: true }
            ],
            areas: [
                { ...tileCenter(TUTORIAL_HINT_POSITIONS.powerNode.x, TUTORIAL_HINT_POSITIONS.powerNode.y), radius: 48, color: 0xfacc15, kind: 'range' }
            ]
        }
    },
    {
        id: 'DATA_SOURCE',
        title: t('tutorial.DATA_SOURCE.title'),
        detail: t('tutorial.DATA_SOURCE.detail'),
        allowedBuildings: ['MINER', 'DATA_DOWNLOADER'],
        visualHints: {
            mode: 'explicit',
            ghosts: [
                { type: 'MINER', ...TUTORIAL_HINT_POSITIONS.miner, exact: true },
                { type: 'DOWNLOAD', ...TUTORIAL_HINT_POSITIONS.downloader, exact: true }
            ],
            flows: [
                { from: tileCenter(TUTORIAL_HINT_POSITIONS.miner.x, TUTORIAL_HINT_POSITIONS.miner.y), to: tileCenter(TUTORIAL_HINT_POSITIONS.storage.x, TUTORIAL_HINT_POSITIONS.storage.y), itemType: 'SILICON' },
                { from: tileCenter(TUTORIAL_HINT_POSITIONS.downloader.x, TUTORIAL_HINT_POSITIONS.downloader.y), to: tileCenter(TUTORIAL_HINT_POSITIONS.processor.x, TUTORIAL_HINT_POSITIONS.processor.y), itemType: 'RAW_DATA' }
            ]
        }
    },
    {
        id: 'CONNECTION',
        title: t('tutorial.CONNECTION.title'),
        detail: t('tutorial.CONNECTION.detail'),
        allowedBuildings: ['CONVEYOR', 'BASIC', 'REMOVE'],
        visualHints: {
            mode: 'explicit',
            ghosts: [
                { type: 'MINER', ...TUTORIAL_HINT_POSITIONS.miner, exact: true },
                { type: 'STORAGE', ...TUTORIAL_HINT_POSITIONS.storage, exact: true },
                { type: 'DOWNLOAD', ...TUTORIAL_HINT_POSITIONS.downloader, exact: true },
                { type: 'PROCESSOR', ...TUTORIAL_HINT_POSITIONS.processor, exact: true }
            ],
            flows: [
                { from: tileCenter(TUTORIAL_HINT_POSITIONS.miner.x, TUTORIAL_HINT_POSITIONS.miner.y), to: tileCenter(TUTORIAL_HINT_POSITIONS.storage.x, TUTORIAL_HINT_POSITIONS.storage.y), itemType: 'SILICON' },
                { from: tileCenter(TUTORIAL_HINT_POSITIONS.downloader.x, TUTORIAL_HINT_POSITIONS.downloader.y), to: tileCenter(TUTORIAL_HINT_POSITIONS.processor.x, TUTORIAL_HINT_POSITIONS.processor.y), itemType: 'RAW_DATA' }
            ]
        }
    },
    {
        id: 'PROCESSING',
        title: t('tutorial.PROCESSING.title'),
        detail: t('tutorial.PROCESSING.detail'),
        allowedBuildings: ['PROCESSOR', 'WEIGHT_TRAINER', 'MODEL_TRAINING_LAB', 'REMOVE', 'BASIC', 'CONVEYOR'],
        visualHints: {
            mode: 'suggestive',
            ghosts: [
                { type: 'PROCESSOR', ...TUTORIAL_HINT_POSITIONS.processor },
                { type: 'TRAINER', ...TUTORIAL_HINT_POSITIONS.trainer }
            ],
            flows: [
                { from: tileCenter(TUTORIAL_HINT_POSITIONS.downloader.x, TUTORIAL_HINT_POSITIONS.downloader.y), to: tileCenter(TUTORIAL_HINT_POSITIONS.processor.x, TUTORIAL_HINT_POSITIONS.processor.y), itemType: 'RAW_DATA', dotted: true },
                { from: tileCenter(TUTORIAL_HINT_POSITIONS.processor.x, TUTORIAL_HINT_POSITIONS.processor.y), to: tileCenter(TUTORIAL_HINT_POSITIONS.trainer.x, TUTORIAL_HINT_POSITIONS.trainer.y), itemType: 'LABELED_DATA', dotted: true }
            ]
        }
    },
    {
        id: 'DEFENSE',
        title: t('tutorial.DEFENSE.title'),
        detail: t('tutorial.DEFENSE.detail'),
        allowedBuildings: ['CLASSIFIER', 'REMOVE'],
        visualHints: {
            mode: 'suggestive',
            ghosts: [
                { type: 'DEFENSE', ...TUTORIAL_HINT_POSITIONS.defense }
            ],
            areas: [
                { ...tileCenter(TUTORIAL_HINT_POSITIONS.defense.x, TUTORIAL_HINT_POSITIONS.defense.y), radius: 128, color: 0xff6888, kind: 'range' },
                { x: -96, y: -192, radius: 36, color: 0xff6888, kind: 'route' }
            ]
        }
    },
    {
        id: 'RESEARCH',
        title: t('tutorial.RESEARCH.title'),
        detail: t('tutorial.RESEARCH.detail'),
        allowedBuildings: ['REMOVE', 'BASIC', 'MODEL_TRAINING_LAB'],
        visualHints: {
            mode: 'suggestive',
            ghosts: [
                { type: 'MODEL_LAB', ...TUTORIAL_HINT_POSITIONS.modelLab, width: 2, height: 2 },
                { type: 'DEFENSE', ...TUTORIAL_HINT_POSITIONS.defense }
            ],
            flows: [
                { from: tileCenter(TUTORIAL_HINT_POSITIONS.trainer.x, TUTORIAL_HINT_POSITIONS.trainer.y), to: { x: TUTORIAL_HINT_POSITIONS.modelLab.x + 32, y: TUTORIAL_HINT_POSITIONS.modelLab.y + 32 }, itemType: 'WEIGHT_UPDATE', dotted: true },
                { from: { x: TUTORIAL_HINT_POSITIONS.modelLab.x + 32, y: TUTORIAL_HINT_POSITIONS.modelLab.y + 32 }, to: tileCenter(TUTORIAL_HINT_POSITIONS.defense.x, TUTORIAL_HINT_POSITIONS.defense.y), color: 0x64ffcf, dotted: true }
            ],
            areas: [
                { ...tileCenter(TUTORIAL_HINT_POSITIONS.defense.x, TUTORIAL_HINT_POSITIONS.defense.y), radius: 42, color: 0x64ffcf, kind: 'model-growth' }
            ]
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
