import { CONFIG, CORE_PIXEL_X, CORE_PIXEL_Y } from '../config';
import BuildingManager from '../managers/BuildingManager';
import ItemManager from '../managers/ItemManager';
import MapManager from '../managers/MapManager';
import UIManager from '../ui/UIManager';
import GridRenderer from '../managers/GridRenderer';
import CameraController from '../managers/CameraController';
import TickSystem from '../managers/TickSystem';
import PowerManager from '../managers/PowerManager';
import WaveManager from '../managers/WaveManager';
import SaveManager from '../managers/SaveManager';
import ResearchManager from '../managers/ResearchManager';
import InventoryManager from '../managers/InventoryManager';
import CableManager from '../managers/CableManager';
import EffectsManager from '../managers/EffectsManager';
import SoundManager from '../managers/SoundManager';
import TutorialManager from '../managers/TutorialManager';
import PerformanceStats from '../managers/PerformanceStats';
import EventBus from '../managers/EventBus';
import OverlayController from '../controllers/OverlayController';
import InputController from '../controllers/InputController';
import { VISUAL_THEME } from '../visuals/visualTheme';
import type MainScene from './MainScene';

export function initializeMainSceneSystems(scene: MainScene): void {
    scene.cameras.main.setBackgroundColor(VISUAL_THEME.world.background);

    scene.mapManager = new MapManager();
    scene.performanceStats = new PerformanceStats(scene);
    (window as any).__GRADIUM_PERF__ = scene.performanceStats;
    scene.itemManager = new ItemManager(scene);
    scene.buildingManager = new BuildingManager(scene);
    scene.powerManager = new PowerManager(scene, scene.buildingManager);
    scene.cableManager = new CableManager(scene);
    scene.waveManager = new WaveManager(scene, scene.buildingManager);
    scene.waveManager.setDifficulty(scene.difficultyId);
    scene.tickSystem = new TickSystem(scene, scene.buildingManager, scene.itemManager, scene.mapManager, scene.powerManager);
    scene.gridRenderer = new GridRenderer(scene, scene.mapManager);
    scene.cameraController = new CameraController(scene);
    scene.researchManager = new ResearchManager(scene);
    scene.soundManager = new SoundManager();
    scene.uiManager = new UIManager(scene);
    scene.saveManager = new SaveManager(scene);
    scene.inventoryManager = new InventoryManager(scene.buildingManager);
    scene.effectsManager = new EffectsManager(scene);
    scene.overlayController = new OverlayController(scene);
    scene.inputController = new InputController(scene);
    scene.tutorialManager = undefined;

    if (scene.mode === 'tutorial') {
        scene.mapManager.generateTutorialMap();
    } else {
        scene.mapManager.generateResourcePatches();
    }
    scene.cameraController.applyBounds();
    scene.buildingManager.place(CORE_PIXEL_X, CORE_PIXEL_Y, 'CORE', 0);
    scene.cameraController.centerOnCore();

    const startStorage = scene.buildingManager.place(
        (CONFIG.CORE_ORIGIN.TILE_X - 2) * CONFIG.GRID_SIZE,
        CONFIG.CORE_ORIGIN.TILE_Y * CONFIG.GRID_SIZE,
        'STORAGE',
        0
    );
    if (startStorage) {
        for (let i = 0; i < 100; i++) {
            startStorage.inputBuffer.push('SILICON');
        }
    }
}

export function finishMainSceneBootstrap(scene: MainScene, loadSaveOnStart: boolean): void {
    if (scene.mode === 'tutorial') {
        scene.tutorialManager = new TutorialManager(scene);
    }
    EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');
    if (loadSaveOnStart) {
        scene.saveManager.loadGame();
    }
}
