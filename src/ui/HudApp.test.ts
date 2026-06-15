import { afterEach, describe, expect, it, vi } from 'vitest';

const componentModules = [
    './components/MainMenu',
    './components/TopBar',
    './components/RightRail',
    './components/BuildConsole',
    './components/SettingsModal',
    './components/TrainingLabModal',
    './components/GameOverScreen',
    './components/WaveResultCard',
    './components/ActivityLog',
    './components/Tooltip',
    './components/TutorialPanel',
    './components/MobileBuildSummary',
    './components/MobileActionBar'
] as const;

const componentNames = [
    'MainMenu',
    'TopBar',
    'RightRail',
    'BuildConsole',
    'SettingsModal',
    'TrainingLabModal',
    'GameOverScreen',
    'WaveResultCard',
    'ActivityLog',
    'Tooltip',
    'TutorialPanel',
    'MobileBuildSummary',
    'MobileActionBar'
] as const;

const gameplaySurfaceOrder = [
    'MainMenu',
    'TopBar',
    'RightRail',
    'BuildConsole',
    'WaveResultCard',
    'ActivityLog',
    'TutorialPanel',
    'MobileBuildSummary',
    'MobileActionBar',
    'SettingsModal',
    'TrainingLabModal',
    'GameOverScreen',
    'Tooltip'
] as const;

describe('HudApp', () => {
    afterEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
    });

    function mockHudSurfaces(): void {
        componentModules.forEach((modulePath, index) => {
            const componentName = componentNames[index];
            vi.doMock(modulePath, () => ({
                default: Object.assign(function MockedHudSurface() {
                    return null;
                }, { hudSurfaceName: componentName })
            }));
        });
    }

    function collectSurfaceNames(node: any): string[] {
        if (!node) return [];
        if (Array.isArray(node)) return node.flatMap(collectSurfaceNames);
        const ownName = node.type?.hudSurfaceName ? [node.type.hudSurfaceName] : [];
        return ownName.concat(collectSurfaceNames(node.props?.children));
    }

    function renderHudApp() {
        return import('./HudApp').then(({ default: HudApp }) => HudApp({
            game: {
                scene: {
                    getScenes: () => ['MainMenuScene', 'MainScene']
                }
            } as any
        }) as any);
    }

    it('mounts only the Preact main menu while the menu snapshot is open', async () => {
        mockHudSurfaces();
        vi.doMock('./signals/menuState', () => ({
            mainMenu: {
                value: {
                    open: true,
                    title: 'GRADIUM'
                }
            }
        }));

        const vnode = await renderHudApp();

        expect(vnode.props['data-testid']).toBe('preact-hud-root');
        expect(vnode.props['data-scene-count']).toBe(2);
        expect(collectSurfaceNames(vnode)).toEqual(['MainMenu']);
    });

    it('mounts every gameplay HUD surface after the main menu closes', async () => {
        mockHudSurfaces();
        vi.doMock('./signals/menuState', () => ({
            mainMenu: {
                value: {
                    open: false,
                    title: 'GRADIUM'
                }
            }
        }));

        const { default: HudApp } = await import('./HudApp');
        const vnode = HudApp({
            game: {
                scene: {
                    getScenes: () => ['MainMenuScene', 'MainScene']
                }
            } as any
        }) as any;

        expect(vnode.props['data-testid']).toBe('preact-hud-root');
        expect(vnode.props['data-scene-count']).toBe(2);

        expect(collectSurfaceNames(vnode)).toEqual(gameplaySurfaceOrder);
    });
});
