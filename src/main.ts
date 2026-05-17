import Phaser from 'phaser';
import './styles/main.css';
import MainMenuScene from './scenes/MainMenuScene';
import MainScene from './scenes/MainScene';

declare global {
    interface Window {
        __NEURAL_FACTORY_GAME__?: Phaser.Game;
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#050510',
    pixelArt: false,
    scene: [MainMenuScene, MainScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
window.__NEURAL_FACTORY_GAME__ = game;
