import { signal } from '@preact/signals';
import type { TutorialPanelSnapshot } from '../../types';

export const tutorialPanel = signal<TutorialPanelSnapshot>({
    open: false,
    kicker: '',
    title: '',
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
