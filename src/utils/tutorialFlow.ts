export type TutorialStepId =
    | 'RESOURCE'
    | 'POWER'
    | 'DATA_SOURCE'
    | 'PROCESSING'
    | 'CONNECTION'
    | 'DEFENSE'
    | 'RESEARCH'
    | 'WAVE';

export interface TutorialStepDefinition {
    id: TutorialStepId;
    title: string;
    detail: string;
}

export interface TutorialStep extends TutorialStepDefinition {
    completed: boolean;
}

export const TUTORIAL_STEP_DEFINITIONS: TutorialStepDefinition[] = [
    {
        id: 'RESOURCE',
        title: 'Find resource patches',
        detail: 'Locate Silicon and Energy patches near the Neural Core. These are the roots of the factory.'
    },
    {
        id: 'DATA_SOURCE',
        title: 'Start data intake',
        detail: 'Place a Data Downloader to produce Signal Packets for the processing chain.'
    },
    {
        id: 'PROCESSING',
        title: 'Process raw data',
        detail: 'Place a Processor or Weight Trainer so raw data can become useful model material.'
    },
    {
        id: 'CONNECTION',
        title: 'Connect the flow',
        detail: 'Use Ethernet cable, AP relays, or conveyors to move items between producers and receivers.'
    },
    {
        id: 'POWER',
        title: 'Keep the grid powered',
        detail: 'The core powers nearby machines. Add power buildings when the network starts to run short.'
    },
    {
        id: 'DEFENSE',
        title: 'Prepare defense',
        detail: 'Place a Classifier, Filter, or Firewall before incoming traffic reaches the core.'
    },
    {
        id: 'RESEARCH',
        title: 'Open research',
        detail: 'Use confidence score to unlock better logistics, production, and defense upgrades.'
    },
    {
        id: 'WAVE',
        title: 'Survive a wave',
        detail: 'When the next wave starts, keep the core online and watch which part of the factory is under pressure.'
    }
];

export function createTutorialSteps(): TutorialStep[] {
    return TUTORIAL_STEP_DEFINITIONS.map(step => ({ ...step, completed: false }));
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
