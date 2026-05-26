import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import EventBus from '../managers/EventBus';
import { BuildingOptions } from '../types';

export default class Core extends BaseBuilding {
    totalDataReceived: number;
    confidenceScore: number;
    hp: number;
    maxHp: number;
    hpBar: Phaser.GameObjects.Graphics;
    coreGraphics: Phaser.GameObjects.Graphics;
    rotationAngle: number;
    coreTween: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'CORE', { ...config, color: CONFIG.BUILDINGS.CORE.COLOR });
        this.totalDataReceived = 0;
        this.confidenceScore = 0;

        this.maxHp = CONFIG.BUILDINGS.CORE.HP || 1000;
        this.hp = this.maxHp;

        this.hpBar = scene.add.graphics();
        this.container.add(this.hpBar);
        this.drawHpBar();

        this.coreGraphics = scene.add.graphics();
        this.container.add(this.coreGraphics);
        this.rotationAngle = 0;

        this.coreTween = scene.tweens.add({
            targets: this,
            rotationAngle: Math.PI * 2,
            duration: 8000,
            repeat: -1,
            onUpdate: () => this.drawQuantumCore()
        });

        EventBus.on('CORE_DAMAGED', ({ amount }: { amount: number }) => {
            this.hp -= amount;
            this.drawHpBar();
            if (this.hp <= 0) {
                this.hp = 0;
                EventBus.emit('GAME_OVER');
            }
        }, 'Core');
    }

    drawHpBar(): void {
        this.hpBar.clear();
        const width = CONFIG.GRID_SIZE * (CONFIG.BUILDINGS.CORE.WIDTH || 1);
        const height = 4;
        const percent = Math.max(0, this.hp / this.maxHp);

        this.hpBar.fillStyle(0xff0000, 1);
        this.hpBar.fillRect(-width/2, -CONFIG.GRID_SIZE/2 - 6, width, height);

        this.hpBar.fillStyle(0x00ff00, 1);
        this.hpBar.fillRect(-width/2, -CONFIG.GRID_SIZE/2 - 6, width * percent, height);
    }

    drawQuantumCore(): void {
        this.coreGraphics.clear();
        if (this.destroyed) return;

        const pulse = 0.55 + 0.25 * Math.sin(this.scene.time.now / 250);
        const colorCyan = 0x4dd8ff;
        const colorGreen = 0x63ffb1;

        // 1. Draw outer 2-layer concentric rotating dot loops
        const r1 = 38;
        const r2 = 50;
        const N = 8;

        this.coreGraphics.fillStyle(colorCyan, 0.6);
        for (let i = 0; i < N; i++) {
            const angle1 = this.rotationAngle + (i * Math.PI * 2) / N;
            const px1 = Math.cos(angle1) * r1;
            const py1 = Math.sin(angle1) * r1;
            this.coreGraphics.fillCircle(px1, py1, 3);
        }

        this.coreGraphics.fillStyle(colorGreen, 0.4);
        for (let i = 0; i < N; i++) {
            const angle2 = -this.rotationAngle + (i * Math.PI * 2) / N;
            const px2 = Math.cos(angle2) * r2;
            const py2 = Math.sin(angle2) * r2;
            this.coreGraphics.fillCircle(px2, py2, 2.5);
        }

        // 2. Draw glowing quantum core in the center (pulsing octahedron)
        this.coreGraphics.lineStyle(1.5, colorCyan, pulse);
        this.coreGraphics.fillStyle(0x050811, 0.85);

        this.coreGraphics.beginPath();
        this.coreGraphics.moveTo(0, -22 * pulse);
        this.coreGraphics.lineTo(22 * pulse, 0);
        this.coreGraphics.lineTo(0, 22 * pulse);
        this.coreGraphics.lineTo(-22 * pulse, 0);
        this.coreGraphics.closePath();
        this.coreGraphics.fillPath();
        this.coreGraphics.strokePath();

        this.coreGraphics.fillStyle(colorGreen, 0.5 * pulse);
        this.coreGraphics.beginPath();
        this.coreGraphics.moveTo(0, -11 * pulse);
        this.coreGraphics.lineTo(11 * pulse, 0);
        this.coreGraphics.lineTo(0, 11 * pulse);
        this.coreGraphics.lineTo(-11 * pulse, 0);
        this.coreGraphics.closePath();
        this.coreGraphics.fillPath();

        // 3. Draw 4 diagnostic corner brackets
        const ext = 54;
        this.coreGraphics.lineStyle(2, colorCyan, 0.45);

        // Top Left
        this.coreGraphics.beginPath();
        this.coreGraphics.moveTo(-ext + 10, -ext);
        this.coreGraphics.lineTo(-ext, -ext);
        this.coreGraphics.lineTo(-ext, -ext + 10);
        this.coreGraphics.strokePath();

        // Top Right
        this.coreGraphics.beginPath();
        this.coreGraphics.moveTo(ext - 10, -ext);
        this.coreGraphics.lineTo(ext, -ext);
        this.coreGraphics.lineTo(ext, -ext + 10);
        this.coreGraphics.strokePath();

        // Bottom Left
        this.coreGraphics.beginPath();
        this.coreGraphics.moveTo(-ext + 10, ext);
        this.coreGraphics.lineTo(-ext, ext);
        this.coreGraphics.lineTo(-ext, ext - 10);
        this.coreGraphics.strokePath();

        // Bottom Right
        this.coreGraphics.beginPath();
        this.coreGraphics.moveTo(ext - 10, ext);
        this.coreGraphics.lineTo(ext, ext);
        this.coreGraphics.lineTo(ext, ext - 10);
        this.coreGraphics.strokePath();
    }

    canAcceptItem(_type: string): boolean {
        return true;
    }

    acceptItem(itemType: string): boolean {
        this.totalDataReceived++;

        if (itemType === 'WEIGHT_UPDATE') {
            this.confidenceScore += 10;
        } else if (itemType === 'LABELED_DATA') {
            this.confidenceScore += 2;
        } else {
            this.confidenceScore += 0.1;
        }

        EventBus.emit('CORE_DATA_RECEIVED', {
            type: itemType,
            score: this.confidenceScore,
            total: this.totalDataReceived
        });
        return true;
    }

    onTick(_tickCount: number): void {
        // 추후 자가 수리나 특수 능력
    }

    destroy(): void {
        if (this.coreTween) {
            this.coreTween.remove();
        }
        super.destroy();
    }
}
