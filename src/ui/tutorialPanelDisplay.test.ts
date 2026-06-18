import { describe, expect, it } from 'vitest';
import { setLanguage } from '../i18n';
import { applyTutorialProgress, createTutorialSteps } from '../utils/tutorialFlow';
import { createTutorialPanelDisplayPayload } from './tutorialPanelDisplay';

describe('tutorialPanelDisplay', () => {
    it('creates a completion snapshot with a campaign continue action', () => {
        setLanguage('ko');
        const baseSteps = createTutorialSteps();
        const steps = applyTutorialProgress(baseSteps, true, baseSteps.length);

        const display = createTutorialPanelDisplayPayload({
            activeIndex: -1,
            activeStep: null,
            completeCount: steps.length,
            completed: true,
            completionDetail: '튜토리얼을 건너뛰었습니다. 새 캠페인 맵을 시작합니다.',
            steps
        });

        expect(display.snapshot.open).toBe(true);
        expect(display.snapshot.mode).toBe('complete');
        expect(display.snapshot.completedTitle).toBe('튜토리얼 완료');
        expect(display.snapshot.continueLabel).toBe('캠페인 시작');
        expect(display.snapshot.detail).toBe('튜토리얼을 건너뛰었습니다. 새 캠페인 맵을 시작합니다.');
        expect(display.snapshot.completeCount).toBe(steps.length);
        expect(display.snapshot.totalCount).toBe(steps.length);
        expect(display.snapshot.steps.every(step => step.completed && !step.active)).toBe(true);
    });
});
