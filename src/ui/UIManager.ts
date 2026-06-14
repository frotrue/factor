import type MainScene from '../scenes/MainScene';
import TrainingLabController from './TrainingLabController';
import SettingsController from './SettingsController';
import MobileActionController from './MobileActionController';
import NotificationController from './NotificationController';
import TopHudController from './TopHudController';
import TacticalPanelController from './TacticalPanelController';
import BuildConsoleController from './BuildConsoleController';
import HudShellController from './HudShellController';
import HudLocalizationController from './HudLocalizationController';
import {
    ensureLegacyHudDom
} from './legacyHudDom';
import GameOverController from './GameOverController';
import {
    getLegacyTopHudRefs,
    type LegacyTopHudRefs
} from './legacyTopHud';

export default class UIManager {
    private scene: MainScene;
    private topHudRefs: LegacyTopHudRefs;
    private trainingLab: TrainingLabController;
    private settings: SettingsController;
    private mobileActions: MobileActionController;
    private notifications: NotificationController;
    private gameOver: GameOverController;
    private topHud: TopHudController;
    private tacticalPanels: TacticalPanelController;
    private buildConsole: BuildConsoleController;
    private hudShell: HudShellController;
    private localization: HudLocalizationController;

    constructor(scene: MainScene) {
        this.scene = scene;

        ensureLegacyHudDom();
        this.topHudRefs = getLegacyTopHudRefs();

        this.trainingLab = new TrainingLabController(scene);
        this.settings = new SettingsController(scene);
        this.mobileActions = new MobileActionController(scene);
        this.notifications = new NotificationController(scene);
        this.gameOver = new GameOverController(scene);
        this.topHud = new TopHudController(scene, this.topHudRefs);
        this.tacticalPanels = new TacticalPanelController(scene, this.topHudRefs);
        this.buildConsole = new BuildConsoleController(scene);
        this.hudShell = new HudShellController(scene, this.buildConsole);
        this.localization = new HudLocalizationController(scene);

        this.hudShell.syncShellShadow();
        this.setupEvents();
    }

    setupEvents(): void {
        this.notifications.setupEvents();
        this.gameOver.setupEvents();
        this.topHud.setupEvents();
        this.tacticalPanels.setupEvents();
        this.buildConsole.setupEvents();
        this.hudShell.setupEvents();
        this.settings.setup();
        this.mobileActions.setup();
        this.trainingLab.setup();
        this.localization.setupEvents();
    }

}
