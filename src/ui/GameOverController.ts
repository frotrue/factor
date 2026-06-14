import { CORE_KEY } from '../config';
import Core from '../buildings/Core';
import { getBuildingName } from '../i18n';
import EventBus from '../managers/EventBus';
import type MainScene from '../scenes/MainScene';
import { createRunResultSummary } from '../utils/runResultSummary';
import { createGameOverDisplayPayload } from './gameOverDisplay';
import {
    bindLegacyGameOverRestart,
    showLegacyGameOverScreen,
    updateLegacyGameOverStats
} from './legacyGameOver';

const OWNER = 'GameOverController';

export default class GameOverController {
    constructor(private readonly scene: MainScene) {}

    setupEvents(): void {
        EventBus.offAll(OWNER);
        this.scene.events.once('shutdown', () => this.teardown());
        EventBus.on('GAME_OVER', () => {
            this.showGameOver();
        }, OWNER);
        EventBus.on('GAME_OVER_ACTION_REQUESTED', () => {
            window.location.reload();
        }, OWNER);
    }

    private showGameOver(): void {
        showLegacyGameOverScreen();
        this.renderStats();
        bindLegacyGameOverRestart(() => window.location.reload());
    }

    private renderStats(): void {
        const core = this.scene.buildingManager.get(CORE_KEY);
        const coreBuilding = core instanceof Core ? core : null;
        const summary = createRunResultSummary({
            wave: this.scene.waveManager.currentWave,
            coreHp: coreBuilding?.hp ?? 0,
            coreMaxHp: coreBuilding?.maxHp ?? 1,
            totalDataReceived: coreBuilding?.totalDataReceived ?? 0,
            unlockedResearchCount: this.scene.researchManager?.getUnlockedResearch().length ?? 0,
            modelStates: this.scene.defenseModelStates,
            getModelName: getBuildingName
        });

        const display = createGameOverDisplayPayload(summary);
        EventBus.emit('GAME_OVER_UPDATED', display.snapshot);
        updateLegacyGameOverStats(display.legacyStatLines);
    }

    private teardown(): void {
        EventBus.offAll(OWNER);
    }
}
