import Phaser from 'phaser';
import './styles/tokens.css';
import './styles/main.css';
import './styles/legacy-ui.css';
import MainMenuScene from './scenes/MainMenuScene';
import MainScene from './scenes/MainScene';
import EventBus from './managers/EventBus';
import { mountHud } from './ui/mountHud';
import {
    applyRenderResolution,
    bindAutoRenderResolutionResize,
    getInitialRenderResolution
} from './ui/renderResolution';

declare global {
    interface Window {
        __GRADIUM_GAME__?: Phaser.Game;
        __GRADIUM_EVENT_BUS__?: typeof EventBus;
    }
}

const DEFAULT_FPS_LIMIT = 60;
const savedFps = parseInt(localStorage.getItem('gradium_fps_limit') || String(DEFAULT_FPS_LIMIT), 10);
const fpsTarget = Number.isFinite(savedFps)
    ? Math.max(30, Math.min(240, savedFps))
    : DEFAULT_FPS_LIMIT;
const initialRenderResolution = getInitialRenderResolution();

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: initialRenderResolution.width,
    height: initialRenderResolution.height,
    parent: 'game-container',
    backgroundColor: '#050510',
    pixelArt: false,
    scene: [MainMenuScene, MainScene],
    fps: {
        target: fpsTarget,
        forceSetTimeOut: false
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
applyRenderResolution(game, initialRenderResolution.preset);
const stopRenderResolutionBinding = bindAutoRenderResolutionResize(game);
game.events.once('destroy', stopRenderResolutionBinding);
window.__GRADIUM_GAME__ = game;
window.__GRADIUM_EVENT_BUS__ = EventBus;
mountHud(game);
