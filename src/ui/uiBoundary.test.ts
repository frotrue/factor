import { describe, expect, it } from 'vitest';
import buildingManagerSource from '../managers/BuildingManager.ts?raw';
import cableManagerSource from '../managers/CableManager.ts?raw';
import researchManagerSource from '../managers/ResearchManager.ts?raw';
import saveManagerSource from '../managers/SaveManager.ts?raw';
import tutorialManagerSource from '../managers/TutorialManager.ts?raw';
import waveManagerSource from '../managers/WaveManager.ts?raw';
import inputControllerSource from '../controllers/InputController.ts?raw';
import mainMenuSceneSource from '../scenes/MainMenuScene.ts?raw';
import indexHtmlSource from '../../index.html?raw';

const runtimeSources = [
    ['BuildingManager', buildingManagerSource],
    ['CableManager', cableManagerSource],
    ['ResearchManager', researchManagerSource],
    ['SaveManager', saveManagerSource],
    ['TutorialManager', tutorialManagerSource],
    ['WaveManager', waveManagerSource],
    ['InputController', inputControllerSource]
] as const;

describe('UI migration boundary', () => {
    it('keeps runtime managers decoupled from UIManager direct calls', () => {
        for (const [name, source] of runtimeSources) {
            expect(source, name).not.toMatch(/\bscene\.uiManager\b/);
            expect(source, name).not.toMatch(/\buiManager\./);
            expect(source, name).not.toMatch(/from ['"].*UIManager['"]/);
        }
    });

    it('keeps removed legacy UI manager re-export stubs out of src/managers', () => {
        const legacyUiManagerStubs = import.meta.glob('../managers/{UIManager,SettingsUI,TrainingLabUI,MobileUIManager}.ts', {
            eager: true,
            query: '?raw',
            import: 'default'
        });

        expect(Object.keys(legacyUiManagerStubs)).toEqual([]);
    });

    it('keeps visible main menu UI in Preact while Phaser owns only background and fallback zones', () => {
        expect(mainMenuSceneSource).not.toMatch(/\badd\.text\b/);
        expect(mainMenuSceneSource).not.toMatch(/\bPhaser\.GameObjects\.Text\b/);
        expect(mainMenuSceneSource).not.toMatch(/legacyMainMenuFallback/);
        expect(mainMenuSceneSource).toMatch(/MAIN_MENU_UPDATED/);
        expect(mainMenuSceneSource).toMatch(/MAIN_MENU_START_REQUESTED/);
        expect(mainMenuSceneSource).toMatch(/\badd\.zone\b/);
    });

    it('keeps static HTML and main.css minimal while legacy HUD is runtime-created', async () => {
        // @ts-expect-error Vitest runs this source-boundary test in Node, while app tsconfig omits Node types.
        const { readFileSync } = await import('node:fs') as {
            readFileSync(path: URL, encoding: 'utf8'): string;
        };
        const mainCssSource = readFileSync(new URL('../styles/main.css', import.meta.url), 'utf8');

        expect(indexHtmlSource).toMatch(/id="game-container"/);
        expect(indexHtmlSource).toMatch(/id="preact-hud"/);
        expect(indexHtmlSource).toMatch(/src="\/src\/main\.ts"/);
        expect(indexHtmlSource).not.toMatch(/game-hud-shell|top-hud|hud-right-rail|bottom-ui-container|settings-modal|training-lab-modal|game-over-screen|tooltip|activity-log|notification-container/);

        expect(mainCssSource).toMatch(/#game-container/);
        expect(mainCssSource).not.toMatch(/#game-hud-shell|#top-hud|#hud-right-rail|#bottom-ui-container|#settings-modal|#training-lab-modal|#game-over-screen|#tooltip|#activity-log|#notification-container/);
    });
});
