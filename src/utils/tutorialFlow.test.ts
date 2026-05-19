import { describe, expect, it } from 'vitest';
import {
    applyTutorialProgress,
    completeTutorialStep,
    createTutorialSteps,
    getTutorialProgressIndex,
    TUTORIAL_STEP_DEFINITIONS
} from './tutorialFlow';
import { setLanguage } from '../i18n';

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

    it('uses Korean by default and refreshes created steps when language changes', () => {
        setLanguage('ko');
        expect(createTutorialSteps()[1].title).toBe('데이터 수집 시작');

        setLanguage('en');
        expect(createTutorialSteps()[1].title).toBe('Start data intake');

        setLanguage('ko');
    });

    it('returns the step count when all tutorial steps are complete', () => {
        let steps = createTutorialSteps();
        for (const step of TUTORIAL_STEP_DEFINITIONS) {
            steps = completeTutorialStep(steps, step.id);
        }

        expect(getTutorialProgressIndex(steps)).toBe(TUTORIAL_STEP_DEFINITIONS.length);
    });
});
