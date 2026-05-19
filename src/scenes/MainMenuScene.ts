import Phaser from 'phaser';
import { getDifficultyName, t } from '../i18n';

export default class MainMenuScene extends Phaser.Scene {
    selectedDifficulty: string;

    constructor() {
        super('MainMenuScene');
        this.selectedDifficulty = 'NORMAL';
    }

    create(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const isCompact = width < 600 || height < 520;

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

        const title = this.add.text(width / 2, height / 2 - (isCompact ? 132 : 100), t('app.title'), {
            fontFamily: 'Share Tech Mono',
            fontSize: isCompact ? '40px' : '64px',
            color: '#00f3ff'
        }).setOrigin(0.5);
        if (title.width > width - 32) {
            title.setScale((width - 32) / title.width);
        }

        this.add.text(width / 2, height / 2 - (isCompact ? 86 : 40), t('menu.subtitle'), {
            fontFamily: 'Share Tech Mono',
            fontSize: isCompact ? '14px' : '18px',
            color: '#a855f7'
        }).setOrigin(0.5);

        const difficultyLabel = this.add.text(width / 2, height / 2 + (isCompact ? -38 : 18), t('menu.difficulty'), {
            fontFamily: 'Share Tech Mono',
            fontSize: '14px',
            color: '#94a3b8'
        }).setOrigin(0.5);

        const difficultyButtons = new Map<string, Phaser.GameObjects.Text>();
        const difficultyIds = ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE'];
        difficultyIds.forEach((id, index) => {
            const col = isCompact ? index % 2 : index;
            const row = isCompact ? Math.floor(index / 2) : 0;
            const x = isCompact ? width / 2 - 76 + col * 152 : width / 2 - 210 + index * 140;
            const y = isCompact ? height / 2 - 4 + row * 46 : height / 2 + 48;
            const btn = this.add.text(x, y, getDifficultyName(id).toUpperCase(), {
                fontFamily: 'Share Tech Mono',
                fontSize: isCompact ? '15px' : '18px',
                color: id === this.selectedDifficulty ? '#fde047' : '#ffffff',
                backgroundColor: id === this.selectedDifficulty ? 'rgba(253, 224, 71, 0.18)' : 'rgba(0, 243, 255, 0.08)',
                padding: { x: isCompact ? 10 : 12, y: 8 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            btn.on('pointerdown', () => {
                this.selectedDifficulty = id;
                difficultyButtons.forEach((otherBtn, otherId) => {
                    const active = otherId === id;
                    otherBtn.setColor(active ? '#fde047' : '#ffffff');
                    otherBtn.setBackgroundColor(active ? 'rgba(253, 224, 71, 0.18)' : 'rgba(0, 243, 255, 0.08)');
                });
            });
            btn.on('pointerover', () => btn.setColor('#fde047'));
            btn.on('pointerout', () => btn.setColor(id === this.selectedDifficulty ? '#fde047' : '#ffffff'));
            difficultyButtons.set(id, btn);
        });

        const startBtn = this.add.text(width / 2, height / 2 + (isCompact ? 112 : 120), t('menu.start'), {
            fontFamily: 'Share Tech Mono',
            fontSize: isCompact ? '20px' : '28px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 243, 255, 0.1)',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        if (startBtn.width > width - 32) {
            startBtn.setScale((width - 32) / startBtn.width);
        }

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
            if (topHud) topHud.style.display = 'flex';
            if (infoLayer) infoLayer.style.display = 'block';
            if (bottomUiContainer) bottomUiContainer.style.display = 'flex';

            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MainScene', { difficulty: this.selectedDifficulty });
            });
        });
    }
}
