import { signal } from '@preact/signals';
import type { TutorialPanelSnapshot } from '../../types';

export const tutorialPanel = signal<TutorialPanelSnapshot>({
    open: false,
    mode: 'step',
    kicker: '',
    title: '',
    completedTitle: '',
    continueLabel: '',
    labels: {
        skip: '',
        progress: '',
        currentObjective: '',
        steps: '',
        ok: '',
        moreSteps: ''
    },
    detail: '',
    activeStepId: '',
    completeCount: 0,
    totalCount: 0,
    steps: []
});
