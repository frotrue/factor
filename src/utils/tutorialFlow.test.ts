import { describe, expect, it } from 'vitest';
import {
    applyTutorialProgress,
    completeTutorialStep,
    createTutorialSteps,
    getTutorialProgressIndex,
    TUTORIAL_HINT_POSITIONS,
    TUTORIAL_STEP_DEFINITIONS
} from './tutorialFlow';
import { setLanguage } from '../i18n';

describe('tutorial flow', () => {
    it('defines a complete onboarding path for the factory loop', () => {
        expect(TUTORIAL_STEP_DEFINITIONS.map(step => step.id)).toEqual([
            'RESOURCE',
            'POWER',
            'DATA_SOURCE',
            'CONNECTION',
            'PROCESSING',
            'DEFENSE',
            'RESEARCH'
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
        expect(createTutorialSteps()[1].title).toBe('전력 유지');
        expect(createTutorialSteps().at(-1)?.title).toBe('모델 학습 이해');

        setLanguage('en');
        expect(createTutorialSteps()[1].title).toBe('Keep the grid powered');
        expect(createTutorialSteps().at(-1)?.title).toBe('Understand model training');

        setLanguage('ko');
    });

    it('defines visual hint data for the role-learning tutorial flow', () => {
        const byId = Object.fromEntries(TUTORIAL_STEP_DEFINITIONS.map(step => [step.id, step]));

        expect(byId.RESOURCE.visualHints?.mode).toBe('explicit');
        expect(byId.POWER.visualHints?.ghosts?.map(ghost => ghost.type)).toContain('POWER');
        expect(byId.DATA_SOURCE.visualHints?.flows?.map(flow => flow.itemType)).toEqual(
            expect.arrayContaining(['SILICON', 'RAW_DATA'])
        );
        expect(byId.CONNECTION.visualHints?.flows?.length).toBeGreaterThanOrEqual(2);
        expect(byId.PROCESSING.visualHints?.mode).toBe('suggestive');
        expect(byId.PROCESSING.visualHints?.ghosts?.map(ghost => ghost.type)).toEqual(
            expect.arrayContaining(['PROCESSOR', 'TRAINER'])
        );
        expect(byId.DEFENSE.visualHints?.areas?.some(area => area.kind === 'range')).toBe(true);
        expect(byId.RESEARCH.visualHints?.ghosts?.map(ghost => ghost.type)).toContain('MODEL_LAB');
        expect(byId.RESEARCH.title).toBe('모델 학습 이해');
    });

    it('anchors visual hints to valid spawn-area tiles and weight-update training flow', () => {
        const byId = Object.fromEntries(TUTORIAL_STEP_DEFINITIONS.map(step => [step.id, step]));

        expect(byId.RESOURCE.visualHints?.areas).toEqual(expect.arrayContaining([
            expect.objectContaining({ x: -112, y: -48, kind: 'resource' }),
            expect.objectContaining({ x: 112, y: 112, kind: 'resource' })
        ]));

        expect(TUTORIAL_HINT_POSITIONS.downloader).toEqual({ x: -160, y: -128 });
        expect(TUTORIAL_HINT_POSITIONS.processor).toEqual({ x: -96, y: -128 });
        expect(TUTORIAL_HINT_POSITIONS.trainer).toEqual({ x: -32, y: -128 });

        expect(byId.DATA_SOURCE.visualHints?.ghosts).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'MINER', x: -128, y: -64, exact: true }),
            expect.objectContaining({ type: 'DOWNLOAD', x: -160, y: -128, exact: true })
        ]));
        expect(byId.PROCESSING.visualHints?.flows).toEqual(expect.arrayContaining([
            expect.objectContaining({ itemType: 'RAW_DATA' }),
            expect.objectContaining({ itemType: 'LABELED_DATA' })
        ]));
        expect(byId.RESEARCH.visualHints?.flows).toEqual(expect.arrayContaining([
            expect.objectContaining({ itemType: 'WEIGHT_UPDATE' })
        ]));
    });

    it('returns the step count when all tutorial steps are complete', () => {
        let steps = createTutorialSteps();
        for (const step of TUTORIAL_STEP_DEFINITIONS) {
            steps = completeTutorialStep(steps, step.id);
        }

        expect(getTutorialProgressIndex(steps)).toBe(TUTORIAL_STEP_DEFINITIONS.length);
    });
});
