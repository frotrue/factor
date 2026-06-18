import { t } from '../i18n';
import type { TutorialPanelSnapshot } from '../types';
import type { TutorialStep } from '../utils/tutorialFlow';

export interface TutorialPanelDisplayPayloadInput {
    activeIndex: number;
    activeStep: TutorialStep | null;
    completeCount: number;
    completionDetail?: string;
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
    return Boolean(activeStep) || completed;
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
    completionDetail,
    completed,
    steps
}: TutorialPanelDisplayPayloadInput): TutorialPanelSnapshot {
    const mode = completed ? 'complete' : 'step';
    return {
        open: isTutorialPanelOpen(activeStep, completed),
        mode,
        kicker: activeStep ? t('tutorial.kicker', { current: completeCount, total: steps.length }) : '',
        title: '[G.R.A.D.I.U.M. OS AI Assistant]',
        completedTitle: t('tutorial.complete'),
        continueLabel: t('tutorial.startCampaign' as any),
        labels: {
            skip: t('tutorial.skip'),
            progress: t('tutorial.progress'),
            currentObjective: t('tutorial.currentObjective'),
            steps: t('tutorial.steps'),
            ok: t('tutorial.ok'),
            moreSteps: t('tutorial.moreSteps')
        },
        detail: inputDetailForCompleted(completed, activeStep, completionDetail),
        activeStepId: activeStep?.id ?? '',
        completeCount,
        totalCount: steps.length,
        steps: createTutorialPanelStepSnapshots(steps, activeIndex)
    };
}

function inputDetailForCompleted(completed: boolean, activeStep: TutorialStep | null, completionDetail?: string): string {
    if (activeStep) return activeStep.detail;
    if (completed) return completionDetail ?? t('tutorial.completeDetail');
    return '';
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
