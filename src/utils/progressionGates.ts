export type ObjectiveKey =
    | 'data'
    | 'processing'
    | 'defense'
    | 'wave'
    | 'research'
    | 'expand'
    | 'defendInvestment'
    | 'modelTarget'
    | 'modelGrowth';

export interface ObjectiveStateInput {
    hasDownloader: boolean;
    hasProcessor: boolean;
    hasDefense: boolean;
    firstDefenseDone: boolean;
    productionCount: number;
    defenseCount: number;
    hasModelTrainingLab: boolean;
    hasModelTrainingTarget: boolean;
}

export interface ObjectiveState {
    key: ObjectiveKey;
    titleKey: string;
    detailKey: string;
}

const ADVANCED_EARLY_SYSTEMS = new Set(['ACCESS_POINT', 'FIBER']);

export function shouldHideEarlyAdvancedSystem(type: string, firstDefenseDone: boolean): boolean {
    return !firstDefenseDone && ADVANCED_EARLY_SYSTEMS.has(type);
}

export function getObjectiveState(input: ObjectiveStateInput): ObjectiveState {
    if (!input.hasDownloader) return state('data');
    if (!input.hasProcessor) return state('processing');
    if (!input.hasDefense) return state('defense');
    if (!input.firstDefenseDone) return state('wave');

    if (input.productionCount < 3) return state('expand');
    if (input.defenseCount < 2) return state('defendInvestment');
    if (input.hasModelTrainingLab && !input.hasModelTrainingTarget) return state('modelTarget');
    if (input.hasModelTrainingLab && input.hasModelTrainingTarget) return state('modelGrowth');

    return state('research');
}

function state(key: ObjectiveKey): ObjectiveState {
    return {
        key,
        titleKey: `objective.${key}.title`,
        detailKey: `objective.${key}.detail`
    };
}
