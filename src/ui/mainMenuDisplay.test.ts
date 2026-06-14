import { describe, expect, it } from 'vitest';
import {
    createMainMenuDifficultyOptions,
    createMainMenuKeyHints,
    createMainMenuSnapshot,
    MAIN_MENU_DIFFICULTY_IDS
} from './mainMenuDisplay';

describe('mainMenuDisplay', () => {
    it('creates the full difficulty option list with exactly one selected option', () => {
        const options = createMainMenuDifficultyOptions('HARD');

        expect(options.map(option => option.id)).toEqual(MAIN_MENU_DIFFICULTY_IDS);
        expect(options.filter(option => option.selected).map(option => option.id)).toEqual(['HARD']);
        expect(options.every(option => option.label === option.label.toUpperCase())).toBe(true);
        expect(options.every(option => option.description.length > 0)).toBe(true);
    });

    it('adds continue key hints only when a save exists', () => {
        const withoutSave = createMainMenuKeyHints(false);
        const withSave = createMainMenuKeyHints(true);

        expect(withoutSave).toHaveLength(2);
        expect(withSave).toHaveLength(3);
        expect(withSave.slice(0, 2)).toEqual(withoutSave);
    });

    it('keeps snapshot save and tutorial status aligned with display inputs', () => {
        const snapshot = createMainMenuSnapshot({
            open: true,
            saveExists: true,
            selectedDifficulty: 'NIGHTMARE',
            tutorialCompleted: true
        });

        expect(snapshot.open).toBe(true);
        expect(snapshot.saveExists).toBe(true);
        expect(snapshot.tutorialCompleted).toBe(true);
        expect(snapshot.selectedDifficulty).toBe('NIGHTMARE');
        expect(snapshot.keyHints).toEqual(createMainMenuKeyHints(true));
        expect(snapshot.difficulties).toEqual(createMainMenuDifficultyOptions('NIGHTMARE'));
        expect(snapshot.difficulties.filter(option => option.selected)).toHaveLength(1);
        expect(snapshot.continueLabel).toBeTruthy();
        expect(snapshot.labels.aria).toBeTruthy();
    });

    it('keeps closed snapshots populated for bridge cleanup without selecting unknown difficulty', () => {
        const snapshot = createMainMenuSnapshot({
            open: false,
            saveExists: false,
            selectedDifficulty: 'UNKNOWN',
            tutorialCompleted: false
        });

        expect(snapshot.open).toBe(false);
        expect(snapshot.keyHints).toEqual(createMainMenuKeyHints(false));
        expect(snapshot.difficulties.map(option => option.id)).toEqual(MAIN_MENU_DIFFICULTY_IDS);
        expect(snapshot.difficulties.some(option => option.selected)).toBe(false);
    });
});
