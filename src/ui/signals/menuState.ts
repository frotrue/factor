import { signal } from '@preact/signals';
import type { MainMenuSnapshot } from '../../types';

export const mainMenu = signal<MainMenuSnapshot>({
    open: false,
    labels: {
        aria: ''
    },
    title: '',
    subtitle: '',
    difficultyLabel: '',
    startLabel: '',
    continueLabel: '',
    tutorialStatusLabel: '',
    saveStatusLabel: '',
    keyHints: [],
    selectedDifficulty: 'NORMAL',
    difficulties: [],
    tutorialCompleted: false,
    saveExists: false
});
