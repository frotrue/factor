import { getDifficultyName, t } from '../i18n';
import type { MainMenuSnapshot } from '../types';

export const MAIN_MENU_DIFFICULTY_IDS = ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE'];

export interface MainMenuDisplayPayloadInput {
    open: boolean;
    saveExists: boolean;
    selectedDifficulty: string;
    tutorialCompleted: boolean;
}

export type MainMenuDifficultyOption = MainMenuSnapshot['difficulties'][number];

export function createMainMenuKeyHints(saveExists: boolean): string[] {
    return [
        t('menu.hint.difficulty'),
        t('menu.hint.start'),
        ...(saveExists ? [t('menu.hint.continue')] : [])
    ];
}

export function createMainMenuDifficultyOptions(selectedDifficulty: string): MainMenuDifficultyOption[] {
    return MAIN_MENU_DIFFICULTY_IDS.map(id => ({
        id,
        label: getDifficultyName(id).toUpperCase(),
        description: t(`menu.description.${id}` as any),
        selected: id === selectedDifficulty
    }));
}

export function createMainMenuSnapshot({
    open,
    saveExists,
    selectedDifficulty,
    tutorialCompleted
}: MainMenuDisplayPayloadInput): MainMenuSnapshot {
    return {
        open,
        labels: {
            aria: t('menu.aria')
        },
        title: t('app.title'),
        subtitle: t('menu.subtitle'),
        difficultyLabel: t('menu.difficulty'),
        startLabel: t('menu.start'),
        continueLabel: t('menu.continue'),
        tutorialStatusLabel: tutorialCompleted ? t('menu.tutorialComplete') : t('menu.tutorialRecommended'),
        saveStatusLabel: saveExists ? t('menu.saveDetected') : t('menu.noSave'),
        keyHints: createMainMenuKeyHints(saveExists),
        selectedDifficulty,
        tutorialCompleted,
        saveExists,
        difficulties: createMainMenuDifficultyOptions(selectedDifficulty)
    };
}
