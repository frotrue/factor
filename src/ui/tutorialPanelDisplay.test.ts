import { describe, expect, it } from 'vitest';
import type { TutorialStep } from '../utils/tutorialFlow';
import {
    createTutorialPanelDisplayPayload,
    createTutorialPanelSnapshot,
    createTutorialPanelStepSnapshots,
    isTutorialPanelOpen
} from './tutorialPanelDisplay';

function createStep(id: string, completed = false): TutorialStep {
    return {
        id: id as TutorialStep['id'],
        title: `Step ${id}`,
        detail: `Detail ${id}`,
        completed,
        completion: { kind: 'auto', delayMs: 1 }
    };
}

describe('tutorialPanelDisplay', () => {
    it('uses shared step snapshots for active and completed state', () => {
        const steps = [createStep('CORE', true), createStep('POWER'), createStep('MINER')];

        expect(createTutorialPanelStepSnapshots(steps, 1)).toEqual([
            { id: 'CORE', title: 'Step CORE', completed: true, active: false },
            { id: 'POWER', title: 'Step POWER', completed: false, active: true },
            { id: 'MINER', title: 'Step MINER', completed: false, active: false }
        ]);
    });

    it('keeps legacy panel inputs and Preact snapshot aligned', () => {
        const steps = [createStep('CORE', true), createStep('POWER')];
        const activeStep = steps[1];
        const payload = createTutorialPanelDisplayPayload({
            activeIndex: 1,
            activeStep,
            completeCount: 1,
            completed: false,
            steps
        });

        expect(payload.legacyPanel.activeIndex).toBe(1);
        expect(payload.legacyPanel.activeStepId).toBe(payload.snapshot.activeStepId);
        expect(payload.legacyPanel.completeCount).toBe(payload.snapshot.completeCount);
        expect(payload.legacyPanel.detail).toBe(payload.snapshot.detail);
        expect(payload.snapshot.steps).toEqual(createTutorialPanelStepSnapshots(payload.legacyPanel.steps, 1));
        expect(payload.snapshot.open).toBe(true);
    });

    it('closes the snapshot without mutating legacy step data when completed', () => {
        const steps = [createStep('CORE', true), createStep('POWER', true)];
        const snapshot = createTutorialPanelSnapshot({
            activeIndex: 0,
            activeStep: null,
            completeCount: 0,
            completed: true,
            steps
        });

        expect(isTutorialPanelOpen(null, true)).toBe(false);
        expect(isTutorialPanelOpen(steps[0], true)).toBe(false);
        expect(isTutorialPanelOpen(steps[0], false)).toBe(true);
        expect(snapshot.open).toBe(false);
        expect(snapshot.activeStepId).toBe('');
        expect(snapshot.detail).toBe('');
        expect(snapshot.steps.map(step => step.id)).toEqual(steps.map(step => step.id));
    });
});
