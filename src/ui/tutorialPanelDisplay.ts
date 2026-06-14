import { t } from '../i18n';
import type { TutorialPanelSnapshot } from '../types';
import type { TutorialStep } from '../utils/tutorialFlow';

export interface TutorialPanelDisplayPayloadInput {
    activeIndex: number;
    activeStep: TutorialStep | null;
    completeCount: number;
    completed: boolean;
    steps: TutorialStep[];
}

export interface TutorialPanelLegacyDisplay {
    activeIndex: number;
    activeStepId: string;
    completeCount: number;
    detail: string;
    steps: TutorialStep[];
}

export interface TutorialPanelDisplayPayload {
    legacyPanel: TutorialPanelLegacyDisplay;
    snapshot: TutorialPanelSnapshot;
}

export type TutorialPanelStepSnapshot = TutorialPanelSnapshot['steps'][number];

export function isTutorialPanelOpen(activeStep: TutorialStep | null, completed: boolean): boolean {
    return Boolean(activeStep) && !completed;
}

export function createTutorialPanelStepSnapshots(
    steps: TutorialStep[],
    activeIndex: number
): TutorialPanelStepSnapshot[] {
    return steps.map((step, index) => ({
        id: step.id,
        title: step.title,
        completed: step.completed,
        active: index === activeIndex && !step.completed
    }));
}

export function createTutorialPanelSnapshot({
    activeIndex,
    activeStep,
    completeCount,
    completed,
    steps
}: TutorialPanelDisplayPayloadInput): TutorialPanelSnapshot {
    return {
        open: isTutorialPanelOpen(activeStep, completed),
        kicker: activeStep ? t('tutorial.kicker', { current: completeCount, total: steps.length }) : '',
        title: '[G.R.A.D.I.U.M. OS AI Assistant]',
        labels: {
            skip: t('tutorial.skip'),
            progress: t('tutorial.progress'),
            currentObjective: t('tutorial.currentObjective'),
            steps: t('tutorial.steps'),
            ok: t('tutorial.ok'),
            moreSteps: t('tutorial.moreSteps')
        },
        detail: activeStep?.detail ?? '',
        activeStepId: activeStep?.id ?? '',
        completeCount,
        totalCount: steps.length,
        steps: createTutorialPanelStepSnapshots(steps, activeIndex)
    };
}

export function createTutorialPanelDisplayPayload(input: TutorialPanelDisplayPayloadInput): TutorialPanelDisplayPayload {
    return {
        legacyPanel: {
            activeIndex: input.activeIndex,
            activeStepId: input.activeStep?.id ?? '',
            completeCount: input.completeCount,
            detail: input.activeStep?.detail ?? '',
            steps: input.steps
        },
        snapshot: createTutorialPanelSnapshot(input)
    };
}
