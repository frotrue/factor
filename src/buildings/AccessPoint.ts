import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';

export default class AccessPoint extends BaseBuilding {
    range: number;
    bandwidth: number;
    relaysThisTick: number;
    statusText: Phaser.GameObjects.Text;
    wave: Phaser.GameObjects.Arc;
    waveTween: Phaser.Tweens.Tween;
    crosshairGraphics: Phaser.GameObjects.Graphics;
    rotationAngle: number;
    rotationTween: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'ACCESS_POINT', { ...config, color: CONFIG.ACCESS_POINT.COLOR });

        this.range = CONFIG.ACCESS_POINT.RANGE;
        this.bandwidth = CONFIG.ACCESS_POINT.BANDWIDTH;
        this.relaysThisTick = 0;

        const radius = this.range * CONFIG.GRID_SIZE;
        this.wave = scene.add.circle(0, 0, 10, 0xffffff, 0.5);
        this.container.add(this.wave);

        this.waveTween = scene.tweens.add({
            targets: this.wave,
            radius,
            alpha: 0,
            duration: 2000,
            repeat: -1,
            ease: 'Sine.easeOut'
        });

        this.crosshairGraphics = scene.add.graphics();
        this.container.add(this.crosshairGraphics);
        this.rotationAngle = 0;

        this.rotationTween = scene.tweens.add({
            targets: this,
            rotationAngle: Math.PI * 2,
            duration: 8000,
            repeat: -1,
            onUpdate: () => this.drawAPCrosshairs()
        });

        this.statusText = scene.add.text(0, 0, 'AP', {
            fontSize: '9px',
            color: '#ffffff',
            fontFamily: 'Share Tech Mono'
        }).setOrigin(0.5);
        this.container.add(this.statusText);
    }

    drawAPCrosshairs(): void {
        this.crosshairGraphics.clear();
        if (this.destroyed) return;

        const color = 0x50f4ff; // AP Cyan
        const pulse = 0.5 + 0.3 * Math.sin(this.scene.time.now / 200);

        this.crosshairGraphics.lineStyle(1.5, color, pulse * 0.65);
        this.crosshairGraphics.strokeCircle(0, 0, 7);

        // Draw 4 rotating crosshair pointers
        const length = 11;
        const count = 4;
        for (let i = 0; i < count; i++) {
            const angle = this.rotationAngle + (i * Math.PI * 2) / count;
            const sx = Math.cos(angle) * 5;
            const sy = Math.sin(angle) * 5;
            const ex = Math.cos(angle) * length;
            const ey = Math.sin(angle) * length;
            this.crosshairGraphics.lineBetween(sx, sy, ex, ey);
        }
    }

    canAcceptItem(_type: string): boolean {
        return false;
    }

    destroy(): void {
        this.waveTween?.stop();
        this.scene.tweens.killTweensOf(this.wave);
        if (this.rotationTween) this.rotationTween.remove();
        super.destroy();
    }
}
