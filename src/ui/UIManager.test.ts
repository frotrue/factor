import { describe, expect, it, vi } from 'vitest';

const legacyHudDomMock = vi.hoisted(() => ({
    ensureLegacyHudDom: vi.fn()
}));

const legacyTopHudMock = vi.hoisted(() => ({
    getLegacyTopHudRefs: vi.fn(() => ({ score: 'score-ref' }))
}));

const controllerMocks = vi.hoisted(() => {
    const instances: Record<string, any[]> = {};

    function createControllerMock(name: string) {
        instances[name] = [];
        return vi.fn(function MockController(this: any, ...args: any[]) {
            this.name = name;
            this.args = args;
            this.setup = vi.fn();
            this.setupEvents = vi.fn();
            this.syncShellShadow = vi.fn();
            instances[name].push(this);
        });
    }

    return {
        instances,
        BuildConsoleController: createControllerMock('BuildConsoleController'),
        GameOverController: createControllerMock('GameOverController'),
        HudLocalizationController: createControllerMock('HudLocalizationController'),
        HudShellController: createControllerMock('HudShellController'),
        MobileActionController: createControllerMock('MobileActionController'),
        NotificationController: createControllerMock('NotificationController'),
        SettingsController: createControllerMock('SettingsController'),
        TacticalPanelController: createControllerMock('TacticalPanelController'),
        TopHudController: createControllerMock('TopHudController'),
        TrainingLabController: createControllerMock('TrainingLabController')
    };
});

vi.mock('./legacyHudDom', () => legacyHudDomMock);
vi.mock('./legacyTopHud', () => legacyTopHudMock);
vi.mock('./BuildConsoleController', () => ({ default: controllerMocks.BuildConsoleController }));
vi.mock('./GameOverController', () => ({ default: controllerMocks.GameOverController }));
vi.mock('./HudLocalizationController', () => ({ default: controllerMocks.HudLocalizationController }));
vi.mock('./HudShellController', () => ({ default: controllerMocks.HudShellController }));
vi.mock('./MobileActionController', () => ({ default: controllerMocks.MobileActionController }));
vi.mock('./NotificationController', () => ({ default: controllerMocks.NotificationController }));
vi.mock('./SettingsController', () => ({ default: controllerMocks.SettingsController }));
vi.mock('./TacticalPanelController', () => ({ default: controllerMocks.TacticalPanelController }));
vi.mock('./TopHudController', () => ({ default: controllerMocks.TopHudController }));
vi.mock('./TrainingLabController', () => ({ default: controllerMocks.TrainingLabController }));

describe('UIManager', () => {
    it('stays a thin shell that ensures legacy DOM and wires HUD controllers', async () => {
        const scene = { sceneKey: 'MainScene' };
        const { default: UIManager } = await import('./UIManager');

        const manager = new UIManager(scene as any);

        expect(manager).toBeInstanceOf(UIManager);
        expect(legacyHudDomMock.ensureLegacyHudDom).toHaveBeenCalledTimes(1);
        expect(legacyTopHudMock.getLegacyTopHudRefs).toHaveBeenCalledTimes(1);

        expect(controllerMocks.TrainingLabController).toHaveBeenCalledWith(scene);
        expect(controllerMocks.SettingsController).toHaveBeenCalledWith(scene);
        expect(controllerMocks.MobileActionController).toHaveBeenCalledWith(scene);
        expect(controllerMocks.NotificationController).toHaveBeenCalledWith(scene);
        expect(controllerMocks.GameOverController).toHaveBeenCalledWith(scene);
        expect(controllerMocks.TopHudController).toHaveBeenCalledWith(scene, { score: 'score-ref' });
        expect(controllerMocks.TacticalPanelController).toHaveBeenCalledWith(scene, { score: 'score-ref' });
        expect(controllerMocks.BuildConsoleController).toHaveBeenCalledWith(scene);
        expect(controllerMocks.HudShellController).toHaveBeenCalledWith(
            scene,
            controllerMocks.instances.BuildConsoleController[0]
        );
        expect(controllerMocks.HudLocalizationController).toHaveBeenCalledWith(scene);

        expect(controllerMocks.instances.HudShellController[0].syncShellShadow).toHaveBeenCalledTimes(1);
        [
            'NotificationController',
            'GameOverController',
            'TopHudController',
            'TacticalPanelController',
            'BuildConsoleController',
            'HudShellController',
            'HudLocalizationController'
        ].forEach(name => {
            expect(controllerMocks.instances[name][0].setupEvents, name).toHaveBeenCalledTimes(1);
        });
        [
            'SettingsController',
            'MobileActionController',
            'TrainingLabController'
        ].forEach(name => {
            expect(controllerMocks.instances[name][0].setup, name).toHaveBeenCalledTimes(1);
        });
    });
});
