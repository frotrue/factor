import Phaser from 'phaser';
import MainMenuScene from './scenes/MainMenuScene';
import MainScene from './scenes/MainScene';
const config = {
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
//# sourceMappingURL=main.js.map