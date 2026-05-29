import Phaser from 'phaser';
import './styles/main.css';
import MainMenuScene from './scenes/MainMenuScene';
import MainScene from './scenes/MainScene';

declare global {
    interface Window {
        __GRADIUM_GAME__?: Phaser.Game;
    }
}

const savedFps = parseInt(localStorage.getItem('gradium_fps_limit') || '240', 10);

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#050510',
    pixelArt: false,
    scene: [MainMenuScene, MainScene],
    fps: {
        target: savedFps,
        forceSetTimeOut: false
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
window.__GRADIUM_GAME__ = game;
