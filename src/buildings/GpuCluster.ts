import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';
import { getCategoryColor } from '../visuals/visualTheme';

export default class GpuCluster extends BaseBuilding {
    gpuGraphics: Phaser.GameObjects.Graphics;
    pulsePhase: number;
    gpuTween: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'GPU_CLUSTER', { ...config, color: CONFIG.BUILDINGS.GPU_CLUSTER.COLOR });
        this.gpuGraphics = scene.add.graphics();
        this.container.add(this.gpuGraphics);
        this.pulsePhase = 0;
        this.gpuTween = scene.tweens.add({
            targets: this,
            pulsePhase: Math.PI * 2,
            duration: 1800,
            repeat: -1,
            onUpdate: () => this.drawGpuCore()
        });
    }

    drawGpuCore(): void {
        this.gpuGraphics.clear();
        if (this.destroyed) return;

        const accent = getCategoryColor(CONFIG.BUILDINGS[this.type]?.CATEGORY) || 0x7cf7ff;
        const poweredAlpha = this.hasPower === false ? 0.25 : 0.82;
        const pulse = 0.55 + 0.35 * Math.sin(this.pulsePhase);

        this.gpuGraphics.lineStyle(2, accent, poweredAlpha);
        this.gpuGraphics.strokeRoundedRect(-10, -10, 20, 20, 4);
        this.gpuGraphics.lineStyle(1, 0xffffff, poweredAlpha * 0.7);
        for (let i = -1; i <= 1; i++) {
            this.gpuGraphics.lineBetween(-7, i * 5, 7, i * 5);
            this.gpuGraphics.lineBetween(i * 5, -7, i * 5, 7);
        }
        this.gpuGraphics.fillStyle(accent, poweredAlpha * pulse);
        this.gpuGraphics.fillCircle(0, 0, 3 + pulse * 2);
    }

    canAcceptItem(): boolean {
        return false;
    }

    onTick(tickCount: number): void {
        super.onTick(tickCount);
        this.drawGpuCore();
    }

    destroy(): void {
        this.gpuTween?.remove();
        super.destroy();
    }
}
