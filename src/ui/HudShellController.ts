import EventBus from '../managers/EventBus';
import type MainScene from '../scenes/MainScene';
import {
    hideLegacyModalFallbacks,
    syncLegacyHudShellShadow as syncLegacyHudShellShadowDom,
    updateLegacySpeedButtons
} from './legacyHudDom';
import {
    isMobileLayoutActive,
    isShortLandscapeLayout,
    restoreGameCanvasFocus
} from './domEnvironment';
import type BuildConsoleController from './BuildConsoleController';

const OWNER = 'HudShellController';

export default class HudShellController {
    private readonly handleKeyDown = (event: KeyboardEvent): void => {
        if (this.buildConsole.handleKeyboard(event)) return;
        if (event.key !== 'Escape') return;

        hideLegacyModalFallbacks();
        EventBus.emit('SETTINGS_MODAL_OPEN_CHANGED', { open: false });
        EventBus.emit('TRAINING_LAB_OPEN_CHANGED', { open: false });
        restoreGameCanvasFocus();
    };

    constructor(
        private readonly scene: MainScene,
        private readonly buildConsole: BuildConsoleController
    ) {}

    setupEvents(): void {
        EventBus.offAll(OWNER);
        this.scene.input.keyboard?.off('keydown', this.handleKeyDown);
        this.scene.input.keyboard?.on('keydown', this.handleKeyDown);
        this.scene.events.once('shutdown', () => this.teardown());

        EventBus.on('GAME_SPEED_CHANGED', ({ speed }: { speed: number }) => {
            updateLegacySpeedButtons(speed);
        }, OWNER);
        EventBus.on('HUD_SHELL_SYNC_REQUESTED', () => {
            this.syncShellShadow();
        }, OWNER);
    }

    syncShellShadow(): void {
        syncLegacyHudShellShadowDom(isMobileLayoutActive(), isShortLandscapeLayout());
    }

    private teardown(): void {
        this.scene.input.keyboard?.off('keydown', this.handleKeyDown);
        EventBus.offAll(OWNER);
    }
}
