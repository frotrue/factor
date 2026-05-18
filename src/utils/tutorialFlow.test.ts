import { describe, expect, it } from 'vitest';
import {
    applyTutorialProgress,
    completeTutorialStep,
    createTutorialSteps,
    getTutorialProgressIndex,
    TUTORIAL_STEP_DEFINITIONS
} from './tutorialFlow';

describe('tutorial flow', () => {
    it('defines a complete onboarding path for the factory loop', () => {
        expect(TUTORIAL_STEP_DEFINITIONS.map(step => step.id)).toEqual([
            'RESOURCE',
            'DATA_SOURCE',
            'PROCESSING',
            'CONNECTION',
            'POWER',
            'DEFENSE',
            'RESEARCH',
            'WAVE'
        ]);
    });

    it('restores progress by step index', () => {
        const steps = applyTutorialProgress(createTutorialSteps(), false, 3);

        expect(steps.slice(0, 3).every(step => step.completed)).toBe(true);
        expect(steps[3].completed).toBe(false);
        expect(getTutorialProgressIndex(steps)).toBe(3);
    });

    it('returns the step count when all tutorial steps are complete', () => {
        let steps = createTutorialSteps();
        for (const step of TUTORIAL_STEP_DEFINITIONS) {
            steps = completeTutorialStep(steps, step.id);
        }

        expect(getTutorialProgressIndex(steps)).toBe(TUTORIAL_STEP_DEFINITIONS.length);
    });
});
