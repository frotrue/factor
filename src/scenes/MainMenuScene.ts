import Phaser from 'phaser';
import EventBus from '../managers/EventBus';
import { showLegacyGameplayHudSurfaces } from '../ui/legacyHudDom';
import { createLegacyMainMenuFallback } from '../ui/legacyMainMenuFallback';
import {
    createMainMenuDisplayPayload,
    MAIN_MENU_DIFFICULTY_IDS
} from '../ui/mainMenuDisplay';

export default class MainMenuScene extends Phaser.Scene {
    selectedDifficulty: string;

    constructor() {
        super('MainMenuScene');
        this.selectedDifficulty = 'NORMAL';
    }

    create(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const isCompact = width < 600 || height < 520;

        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x00f3ff, 0.2);
        for (let i = 0; i < width; i += 40) {
            graphics.moveTo(i, 0);
            graphics.lineTo(i, height);
        }
        for (let j = 0; j < height; j += 40) {
            graphics.moveTo(0, j);
            graphics.lineTo(width, j);
        }
        graphics.strokePath();

        for (let i = 0; i < 30; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 3 + 1;
            const particle = this.add.circle(x, y, size, 0xffffff, Math.random() * 0.5);
            this.tweens.add({
                targets: particle,
                y: y - (Math.random() * 100 + 50),
                alpha: 0,
                duration: Math.random() * 3000 + 2000,
                repeat: -1,
                yoyo: false,
                onRepeat: () => {
                    particle.y = height + 10;
                    particle.x = Math.random() * width;
                    particle.alpha = Math.random() * 0.5;
                }
            });
        }

        let updateDifficultyButtons = (_selectedId: string) => {};
        const publishMenuSnapshot = (open = true) => {
            const display = createMainMenuDisplayPayload({
                open,
                selectedDifficulty: this.selectedDifficulty,
                tutorialCompleted: localStorage.getItem('gradium_tutorial_completed') === 'true',
                saveExists: Boolean(localStorage.getItem('gradium_save'))
            });
            EventBus.emit('MAIN_MENU_UPDATED', display.snapshot);
            return display;
        };
        const selectDifficulty = (id: string) => {
            this.selectedDifficulty = id;
            const display = publishMenuSnapshot();
            updateDifficultyButtons(display.legacyMenu.selectedDifficulty);
        };
        const initialDisplay = publishMenuSnapshot();
        const startGame = (loadSave = false) => {
            showLegacyGameplayHudSurfaces();
            publishMenuSnapshot(false);
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                const tutorialCompleted = localStorage.getItem('gradium_tutorial_completed') === 'true';
                this.scene.start('MainScene', {
                    difficulty: this.selectedDifficulty,
                    mode: loadSave || tutorialCompleted ? 'campaign' : 'tutorial',
                    loadSave
                });
            });
        };
        ({ updateDifficultyButtons } = createLegacyMainMenuFallback(this, {
            difficultyIds: initialDisplay.legacyMenu.difficultyIds,
            getSelectedDifficulty: () => this.selectedDifficulty,
            height,
            isCompact,
            onDifficultySelect: selectDifficulty,
            onStart: () => startGame(),
            width
        }));

        EventBus.offAll('MainMenuScene');
        EventBus.on('MAIN_MENU_DIFFICULTY_REQUESTED', ({ id }) => {
            if (!MAIN_MENU_DIFFICULTY_IDS.includes(id)) return;
            selectDifficulty(id);
        }, 'MainMenuScene');
        EventBus.on('MAIN_MENU_START_REQUESTED', payload => startGame(Boolean(payload?.loadSave)), 'MainMenuScene');
        this.events.once('shutdown', () => {
            EventBus.offAll('MainMenuScene');
            publishMenuSnapshot(false);
        });
    }
}
