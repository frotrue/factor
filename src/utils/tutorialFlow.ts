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
        title: t('tutorial.RESOURCE.title'),
        detail: t('tutorial.RESOURCE.detail')
    },
    {
        id: 'DATA_SOURCE',
        title: t('tutorial.DATA_SOURCE.title'),
        detail: t('tutorial.DATA_SOURCE.detail')
    },
    {
        id: 'PROCESSING',
        title: t('tutorial.PROCESSING.title'),
        detail: t('tutorial.PROCESSING.detail')
    },
    {
        id: 'CONNECTION',
        title: t('tutorial.CONNECTION.title'),
        detail: t('tutorial.CONNECTION.detail')
    },
    {
        id: 'POWER',
        title: t('tutorial.POWER.title'),
        detail: t('tutorial.POWER.detail')
    },
    {
        id: 'DEFENSE',
        title: t('tutorial.DEFENSE.title'),
        detail: t('tutorial.DEFENSE.detail')
    },
    {
        id: 'RESEARCH',
        title: t('tutorial.RESEARCH.title'),
        detail: t('tutorial.RESEARCH.detail')
    },
    {
        id: 'WAVE',
        title: t('tutorial.WAVE.title'),
        detail: t('tutorial.WAVE.detail')
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
import { t } from '../i18n';
