import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';
import { getCategoryColor } from '../visuals/visualTheme';

export default class PowerNode extends BaseBuilding {
    nodeGraphics: Phaser.GameObjects.Graphics;
    rotationAngle: number;
    nodeTween: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'POWER_NODE', { ...config, color: CONFIG.BUILDINGS.POWER_NODE.COLOR });

        this.nodeGraphics = scene.add.graphics();
        this.container.add(this.nodeGraphics);

        this.rotationAngle = 0;
        this.nodeTween = scene.tweens.add({
            targets: this,
            rotationAngle: Math.PI * 2,
            duration: 5000,
            repeat: -1,
            onUpdate: () => this.drawNodeEnergy()
        });
    }

    drawNodeEnergy(): void {
        if (this.shouldThrottleVisuals()) return;
        this.nodeGraphics.clear();
        if (this.destroyed) return;

        const accent = getCategoryColor(CONFIG.BUILDINGS[this.type]?.CATEGORY) || 0xeab308;
        const pulse = 0.6 + 0.3 * Math.sin(this.scene.time.now / 200);

        // 1. Draw outer spinning circular energy core
        this.nodeGraphics.lineStyle(3, accent, 0.22);
        this.nodeGraphics.strokeCircle(0, 0, 11);

        const ticks = 4;
        this.nodeGraphics.lineStyle(1.5, accent, 0.6);
        for (let i = 0; i < ticks; i++) {
            const angle = this.rotationAngle + (i * Math.PI * 2) / ticks;
            const sx = Math.cos(angle) * 8;
            const sy = Math.sin(angle) * 8;
            const ex = Math.cos(angle) * 12;
            const ey = Math.sin(angle) * 12;
            this.nodeGraphics.lineBetween(sx, sy, ex, ey);
        }

        // 2. Central pulsing crystal/star shape representing electrical charge
        this.nodeGraphics.fillStyle(accent, 0.45 * pulse);
        this.nodeGraphics.lineStyle(1.5, 0xffffff, 0.85);

        this.nodeGraphics.beginPath();
        this.nodeGraphics.moveTo(0, -6 * pulse);
        this.nodeGraphics.lineTo(2 * pulse, -2 * pulse);
        this.nodeGraphics.lineTo(6 * pulse, 0);
        this.nodeGraphics.lineTo(2 * pulse, 2 * pulse);
        this.nodeGraphics.lineTo(0, 6 * pulse);
        this.nodeGraphics.lineTo(-2 * pulse, 2 * pulse);
        this.nodeGraphics.lineTo(-6 * pulse, 0);
        this.nodeGraphics.lineTo(-2 * pulse, -2 * pulse);
        this.nodeGraphics.closePath();
        this.nodeGraphics.fillPath();
        this.nodeGraphics.strokePath();

        // 3. Central bright core dot
        this.nodeGraphics.fillStyle(0xffffff, 0.95);
        this.nodeGraphics.fillCircle(0, 0, 2);
    }

    canAcceptItem(): boolean {
        return false;
    }

    onTick(tickCount: number): void {
        super.onTick(tickCount);
    }

    destroy(): void {
        if (this.nodeTween) {
            this.nodeTween.remove();
        }
        super.destroy();
    }
}
