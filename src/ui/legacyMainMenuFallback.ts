import Phaser from 'phaser';
import { getDifficultyName, t } from '../i18n';

export type LegacyMainMenuFallbackOptions = {
    difficultyIds: string[];
    getSelectedDifficulty: () => string;
    height: number;
    isCompact: boolean;
    onDifficultySelect: (id: string) => void;
    onStart: () => void;
    width: number;
};

export function createLegacyMainMenuFallback(
    scene: Phaser.Scene,
    options: LegacyMainMenuFallbackOptions
): { updateDifficultyButtons: (selectedId: string) => void } {
    const { difficultyIds, getSelectedDifficulty, height, isCompact, onDifficultySelect, onStart, width } = options;

    const title = scene.add.text(width / 2, height / 2 - (isCompact ? 132 : 100), t('app.title'), {
        fontFamily: 'Share Tech Mono',
        fontSize: isCompact ? '40px' : '64px',
        color: '#00f3ff'
    }).setOrigin(0.5);
    if (title.width > width - 32) {
        title.setScale((width - 32) / title.width);
    }

    const subtitle = scene.add.text(width / 2, height / 2 - (isCompact ? 86 : 40), t('menu.subtitle'), {
        fontFamily: 'Share Tech Mono',
        fontSize: isCompact ? '14px' : '18px',
        color: '#a855f7'
    }).setOrigin(0.5);

    const difficultyLabel = scene.add.text(width / 2, height / 2 + (isCompact ? -38 : 18), t('menu.difficulty'), {
        fontFamily: 'Share Tech Mono',
        fontSize: '14px',
        color: '#94a3b8'
    }).setOrigin(0.5);

    const difficultyButtons = new Map<string, Phaser.GameObjects.Text>();
    const updateDifficultyButtons = (selectedId: string) => {
        difficultyButtons.forEach((otherBtn, otherId) => {
            const active = otherId === selectedId;
            otherBtn.setColor(active ? '#fde047' : '#ffffff');
            otherBtn.setBackgroundColor(active ? 'rgba(253, 224, 71, 0.18)' : 'rgba(0, 243, 255, 0.08)');
        });
    };

    difficultyIds.forEach((id, index) => {
        const col = isCompact ? index % 2 : index;
        const row = isCompact ? Math.floor(index / 2) : 0;
        const x = isCompact ? width / 2 - 76 + col * 152 : width / 2 - 210 + index * 140;
        const y = isCompact ? height / 2 - 4 + row * 46 : height / 2 + 48;
        const btn = scene.add.text(x, y, getDifficultyName(id).toUpperCase(), {
            fontFamily: 'Share Tech Mono',
            fontSize: isCompact ? '15px' : '18px',
            color: id === getSelectedDifficulty() ? '#fde047' : '#ffffff',
            backgroundColor: id === getSelectedDifficulty() ? 'rgba(253, 224, 71, 0.18)' : 'rgba(0, 243, 255, 0.08)',
            padding: { x: isCompact ? 10 : 12, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerdown', () => onDifficultySelect(id));
        btn.on('pointerover', () => btn.setColor('#fde047'));
        btn.on('pointerout', () => btn.setColor(id === getSelectedDifficulty() ? '#fde047' : '#ffffff'));
        difficultyButtons.set(id, btn);
    });

    const startBtn = scene.add.text(width / 2, height / 2 + (isCompact ? 112 : 120), t('menu.start'), {
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
    startBtn.on('pointerdown', onStart);

    [title, subtitle, difficultyLabel, startBtn, ...difficultyButtons.values()].forEach(text => {
        text.setAlpha(0.001);
    });

    return { updateDifficultyButtons };
}
