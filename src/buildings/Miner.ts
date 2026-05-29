import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, IMainScene } from '../types';

export default class Miner extends BaseBuilding {
    productionRate: number;
    resourceType: string | null;
    scanGraphics: Phaser.GameObjects.Graphics;
    scanY: number;
    scanTween: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'MINER', { ...config, color: CONFIG.BUILDINGS.MINER.COLOR });
        this.productionRate = CONFIG.BUILDINGS.MINER.PRODUCTION_RATE || 2;
        const mapManager = (scene as IMainScene).mapManager;
        this.resourceType = mapManager?.getResourceAt(x, y) || null;

        this.drawResourceMode();

        this.scanGraphics = scene.add.graphics();
        this.container.add(this.scanGraphics);
        this.scanY = -12;

        this.scanTween = scene.tweens.add({
            targets: this,
            scanY: 12,
            duration: 1800,
            yoyo: true,
            repeat: -1,
            onUpdate: () => this.drawScanLine()
        });
    }

    drawResourceMode(): void {
        if (this.resourceType === 'SILICON') {
            this.graphics.fillStyle(0x475569, 1);
            this.graphics.fillTriangle(-6, -10, 8, 0, -6, 10);
            this.graphics.lineStyle(2, 0xe2e8f0, 0.9);
            this.graphics.strokeCircle(0, 0, 9);
        } else if (this.resourceType === 'ENERGY') {
            this.graphics.lineStyle(2, 0xfde047, 1);
            this.graphics.strokeCircle(0, 0, 9);
            this.graphics.fillStyle(0xfde047, 0.9);
            this.graphics.fillCircle(0, 0, 4);
        } else {
            this.graphics.lineStyle(2, 0xffffff, 0.5);
            this.graphics.strokeCircle(0, 0, 8);
        }
    }

    drawScanLine(): void {
        if (this.shouldThrottleVisuals()) return;
        this.scanGraphics.clear();
        if (this.destroyed) return;

        const color = this.resourceType === 'ENERGY' ? 0xfde047 : 0x59e0ff; // Yellow or Cyan
        const pulse = 0.5 + 0.3 * Math.sin(this.scene.time.now / 150);

        // Draw horizontal outer glow laser
        this.scanGraphics.lineStyle(3, color, pulse * 0.22);
        this.scanGraphics.lineBetween(-12, this.scanY, 12, this.scanY);

        // Draw horizontal inner core laser
        this.scanGraphics.lineStyle(1, 0xffffff, pulse * 0.75);
        this.scanGraphics.lineBetween(-10, this.scanY, 10, this.scanY);
    }

    shouldProduce(tickCount: number): boolean {
        const researchManager = (this.scene as IMainScene).researchManager;
        const multiplier = researchManager?.getEffectValue('MINING_RATE_MULTIPLIER', 1) ?? 1;
        const effectiveRate = Math.max(1, Math.round(this.productionRate * multiplier));
        return tickCount % effectiveRate === 0;
    }

    onTick(tickCount: number): void {
        if (this.isInfected(tickCount) && tickCount % 2 !== 0) return;

        if (this.shouldProduce(tickCount)) {
            if (this.outputBuffer.length >= this.maxBufferSize) return;
            const mapManager = (this.scene as IMainScene).mapManager;
            const resourceType = mapManager.getResourceAt(this.x, this.y);
            if (resourceType === 'SILICON') {
                this.outputBuffer.push('SILICON');
            } else if (resourceType === 'ENERGY') {
                this.outputBuffer.push('ENERGY');
            }
        }
    }

    destroy(): void {
        if (this.scanTween) {
            this.scanTween.remove();
        }
        super.destroy();
    }
}
