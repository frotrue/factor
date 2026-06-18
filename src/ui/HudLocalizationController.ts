import EventBus from '../managers/EventBus';
import type MainScene from '../scenes/MainScene';
import { translateStaticDom } from '../i18n';

const OWNER = 'HudLocalizationController';

export default class HudLocalizationController {
    private readonly handleLanguageChange = (): void => {
        this.refreshLocalizedUi();
    };

    constructor(private readonly scene: MainScene) {}

    setupEvents(): void {
        EventBus.offAll(OWNER);
        window.removeEventListener('languagechange', this.handleLanguageChange);
        window.addEventListener('languagechange', this.handleLanguageChange);
        this.scene.events.once('shutdown', () => this.teardown());
        this.refreshLocalizedUi();
    }

    private refreshLocalizedUi(): void {
        translateStaticDom();
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');
        EventBus.emit('MOBILE_UI_REBUILD_REQUESTED');
        EventBus.emit('TACTICAL_PANELS_REFRESH_REQUESTED');
    }

    private teardown(): void {
        window.removeEventListener('languagechange', this.handleLanguageChange);
        EventBus.offAll(OWNER);
    }
}
