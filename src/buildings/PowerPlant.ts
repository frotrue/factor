import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, IMainScene } from '../types';
import { getCategoryColor } from '../visuals/visualTheme';

export default class PowerPlant extends BaseBuilding {
    plantGraphics: Phaser.GameObjects.Graphics;
    isActive: boolean;
    rotationAngle: number;
    waveRadius: number;
    plantTween: Phaser.Tweens.Tween;
    waveTween?: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'POWER_PLANT', { ...config, color: CONFIG.BUILDINGS.POWER_PLANT.COLOR });

        this.plantGraphics = scene.add.graphics();
        this.container.add(this.plantGraphics);

        this.isActive = false;
        this.rotationAngle = 0;
        this.waveRadius = 5;

        this.plantTween = scene.tweens.add({
            targets: this,
            rotationAngle: Math.PI * 2,
            duration: 6000,
            repeat: -1,
            onUpdate: () => this.drawContainmentCore()
        });

        this.checkPlacement();
    }

    checkPlacement(): void {
        const mapManager = (this.scene as IMainScene).mapManager;
        const resourceType = mapManager.getResourceAt(this.x, this.y);
        this.isActive = (resourceType === 'ENERGY');

        if (this.isActive) {
            this.waveTween = this.scene.tweens.add({
                targets: this,
                waveRadius: 24,
                duration: 2000,
                repeat: -1
            });
        }
    }

    drawContainmentCore(): void {
        if (this.shouldThrottleVisuals()) return;
        this.plantGraphics.clear();
        if (this.destroyed) return;

        const pulse = 0.5 + 0.35 * Math.sin(this.scene.time.now / 150);
        const accent = getCategoryColor(CONFIG.BUILDINGS[this.type]?.CATEGORY) || 0x22c55e;

        if (!this.isActive) {
            const redColor = 0xef4444;
            this.plantGraphics.lineStyle(1.5, redColor, pulse);
            this.plantGraphics.strokeCircle(0, 0, 10);

            this.plantGraphics.fillStyle(redColor, pulse * 0.35);
            this.plantGraphics.fillCircle(0, 0, 4);
            return;
        }

        // Active State: Radiating wave and spinning containment nodes
        const waveProgress = (this.waveRadius - 5) / (24 - 5);
        const waveAlpha = 0.55 * (1 - waveProgress);
        this.plantGraphics.lineStyle(1.5, accent, waveAlpha);
        this.plantGraphics.strokeCircle(0, 0, this.waveRadius);

        this.plantGraphics.lineStyle(3, accent, 0.28);
        this.plantGraphics.strokeCircle(0, 0, 12);

        const nodes = 3;
        this.plantGraphics.lineStyle(1.5, accent, 0.85);
        for (let i = 0; i < nodes; i++) {
            const angle = this.rotationAngle + (i * Math.PI * 2) / nodes;
            const sx = Math.cos(angle) * 10;
            const sy = Math.sin(angle) * 10;
            const ex = Math.cos(angle) * 14;
            const ey = Math.sin(angle) * 14;
            this.plantGraphics.lineBetween(sx, sy, ex, ey);
        }

        this.plantGraphics.fillStyle(accent, 0.5 * pulse);
        this.plantGraphics.lineStyle(1.5, 0xffffff, 0.9);
        this.plantGraphics.fillCircle(0, 0, 5 * pulse);
        this.plantGraphics.strokeCircle(0, 0, 5 * pulse);
    }

    canAcceptItem(): boolean {
        return false;
    }

    onTick(tickCount: number): void {
        super.onTick(tickCount);
    }

    destroy(): void {
        if (this.plantTween) {
            this.plantTween.remove();
        }
        if (this.waveTween) {
            this.waveTween.remove();
        }
        super.destroy();
    }
}
