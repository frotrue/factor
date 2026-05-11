import Phaser from 'phaser';
export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }
    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x00f3ff, 0.2);
        for (let i = 0; i < width; i += 40) {
            graphics.moveTo(i, 0);
            graphics.lineTo(i, height);
        }
        for (let j = 0; j < height; j += 40) {
            graphics.moveTo(0, j);
            graphics.lineTo(width, j);
        }
        graphics.strokePath();
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 3 + 1;
            const particle = this.add.circle(x, y, size, 0xffffff, Math.random() * 0.5);
            this.tweens.add({
                targets: particle,
                y: y - (Math.random() * 100 + 50),
                alpha: 0,
                duration: Math.random() * 3000 + 2000,
                repeat: -1,
                yoyo: false,
                onRepeat: () => {
                    particle.y = height + 10;
                    particle.x = Math.random() * width;
                    particle.alpha = Math.random() * 0.5;
                }
            });
        }
        this.add.text(width / 2, height / 2 - 100, 'NEURAL FACTORY', {
            fontFamily: 'Share Tech Mono',
            fontSize: '64px',
            color: '#00f3ff'
        }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 - 40, 'v1.0 - The Initial Weight', {
            fontFamily: 'Share Tech Mono',
            fontSize: '18px',
            color: '#a855f7'
        }).setOrigin(0.5);
        const startBtn = this.add.text(width / 2, height / 2 + 80, '> INITIALIZE SYSTEM <', {
            fontFamily: 'Share Tech Mono',
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 243, 255, 0.1)',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        startBtn.on('pointerover', () => {
            startBtn.setColor('#fde047');
            startBtn.setBackgroundColor('rgba(253, 224, 71, 0.2)');
        });
        startBtn.on('pointerout', () => {
            startBtn.setColor('#ffffff');
            startBtn.setBackgroundColor('rgba(0, 243, 255, 0.1)');
        });
        startBtn.on('pointerdown', () => {
            const topHud = document.getElementById('top-hud');
            const infoLayer = document.getElementById('info-layer');
            const bottomUiContainer = document.getElementById('bottom-ui-container');
            if (topHud)
                topHud.style.display = 'flex';
            if (infoLayer)
                infoLayer.style.display = 'block';
            if (bottomUiContainer)
                bottomUiContainer.style.display = 'flex';
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MainScene');
            });
        });
    }
}
//# sourceMappingURL=MainMenuScene.js.map