import Phaser from 'phaser';
import './styles/tokens.css';
import './styles/main.css';
import './styles/legacy-ui.css';
import MainMenuScene from './scenes/MainMenuScene';
import MainScene from './scenes/MainScene';
import { mountHud } from './ui/mountHud';

declare global {
    interface Window {
        __GRADIUM_GAME__?: Phaser.Game;
    }
}

const DEFAULT_FPS_LIMIT = 60;
const savedFps = parseInt(localStorage.getItem('gradium_fps_limit') || String(DEFAULT_FPS_LIMIT), 10);
const fpsTarget = Number.isFinite(savedFps)
    ? Math.max(30, Math.min(240, savedFps))
    : DEFAULT_FPS_LIMIT;

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#050510',
    pixelArt: false,
    scene: [MainMenuScene, MainScene],
    fps: {
        target: fpsTarget,
        forceSetTimeOut: false
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
window.__GRADIUM_GAME__ = game;
mountHud(game);
