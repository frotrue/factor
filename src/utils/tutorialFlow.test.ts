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
            'CORE',
            'RESOURCE',
            'POWER',
            'MINER',
            'STORAGE',
            'DOWNLOADER',
            'CABLE',
            'PROCESSOR',
            'TRAINER',
            'DEFENSE',
            'FIRST_WAVE',
            'RESEARCH_CENTER'
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
        expect(createTutorialSteps()[3].title).toBe('Miner 역할');
        expect(createTutorialSteps().at(-1)?.title).toBe('Research Operations Center 역할');

        setLanguage('en');
        expect(createTutorialSteps()[3].title).toBe('Miner role');
        expect(createTutorialSteps().at(-1)?.title).toBe('Research Operations Center role');

        setLanguage('ko');
    });

    it('defines visual hint data for the role-learning tutorial flow', () => {
        const byId = Object.fromEntries(TUTORIAL_STEP_DEFINITIONS.map(step => [step.id, step]));

        expect(byId.CORE.completion).toEqual({ kind: 'auto', delayMs: 1800 });
        expect(byId.RESOURCE.visualHints?.mode).toBe('explicit');
        expect(byId.MINER.completion).toEqual({ kind: 'produce-item', buildingType: 'MINER', itemType: 'SILICON' });
        expect(byId.DOWNLOADER.completion).toEqual({ kind: 'produce-item', buildingType: 'DATA_DOWNLOADER', itemType: 'RAW_DATA' });
        expect(byId.CABLE.allowedBuildings).toEqual(['POWER_NODE', 'MINER', 'STORAGE', 'DATA_DOWNLOADER', 'PROCESSOR', 'BASIC', 'REMOVE']);
        expect(byId.POWER.visualHints?.ghosts?.map(ghost => ghost.type)).toContain('POWER');
        expect(byId.PROCESSOR.visualHints?.mode).toBe('explicit');
        expect([
            ...(byId.PROCESSOR.visualHints?.ghosts?.map(ghost => ghost.type) ?? []),
            ...(byId.TRAINER.visualHints?.ghosts?.map(ghost => ghost.type) ?? [])
        ]).toEqual(expect.arrayContaining(['PROCESSOR', 'TRAINER']));
        expect(byId.PROCESSOR.completion).toEqual({ kind: 'produce-item', buildingType: 'PROCESSOR', itemType: 'LABELED_DATA' });
        expect(byId.TRAINER.completion).toEqual({ kind: 'produce-item', buildingType: 'WEIGHT_TRAINER', itemType: 'WEIGHT_UPDATE' });
        expect(byId.DEFENSE.visualHints?.areas?.some(area => area.kind === 'range')).toBe(true);
        expect(byId.FIRST_WAVE.allowedBuildings).toBeNull();
        expect(byId.RESEARCH_CENTER.visualHints?.ghosts?.map(ghost => ghost.type)).toContain('RESEARCH_CENTER');
        expect(byId.RESEARCH_CENTER.title).toBe('Research Operations Center 역할');
    });

    it('anchors visual hints to valid spawn-area tiles and weight-update training flow', () => {
        const byId = Object.fromEntries(TUTORIAL_STEP_DEFINITIONS.map(step => [step.id, step]));

        expect(byId.RESOURCE.visualHints?.areas).toEqual(expect.arrayContaining([
            expect.objectContaining({ x: -112, y: -48, kind: 'resource', radius: 52 }),
            expect.objectContaining({ x: 112, y: 112, kind: 'resource' })
        ]));

        expect(TUTORIAL_HINT_POSITIONS.miner).toEqual({ x: -160, y: -96 });
        expect(TUTORIAL_HINT_POSITIONS.downloader).toEqual({ x: 128, y: -32 });
        expect(TUTORIAL_HINT_POSITIONS.powerNode).toEqual({ x: -96, y: -128 });
        expect(TUTORIAL_HINT_POSITIONS.processor).toEqual({ x: 160, y: -32 });
        expect(TUTORIAL_HINT_POSITIONS.trainer).toEqual({ x: 160, y: 64 });

        expect(byId.MINER.visualHints?.ghosts).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'MINER', x: -160, y: -96, exact: true })
        ]));
        expect(byId.DOWNLOADER.visualHints?.ghosts).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'DOWNLOAD', x: 128, y: -32, exact: true })
        ]));
        expect(byId.PROCESSOR.visualHints?.flows).toEqual(expect.arrayContaining([
            expect.objectContaining({ itemType: 'RAW_DATA', dotted: true })
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
