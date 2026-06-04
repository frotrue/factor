import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, IMainScene } from '../types';

export default class DataDownloader extends BaseBuilding {
    productionRate: number;
    signalGraphics: Phaser.GameObjects.Graphics;
    waveRadius: number;
    signalTween: Phaser.Tweens.Tween | null;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'DATA_DOWNLOADER', { ...config, color: CONFIG.BUILDINGS.DATA_DOWNLOADER.COLOR });
        this.productionRate = CONFIG.BUILDINGS.DATA_DOWNLOADER.PRODUCTION_RATE || 2;

        this.drawAntenna();

        this.signalGraphics = scene.add.graphics();
        this.container.add(this.signalGraphics);
        this.waveRadius = 2;

        this.signalTween = null;
        if (this.shouldUseAnimatedVisuals()) {
            this.signalTween = scene.tweens.add({
                targets: this,
                waveRadius: 14,
                duration: 1600,
                repeat: -1,
                onUpdate: () => this.drawSignalWaves()
            });
        } else {
            this.waveRadius = 8;
            this.drawSignalWaves();
        }
    }

    drawAntenna(): void {
        this.graphics.lineStyle(2, 0x00ffff, 0.9);
        this.graphics.lineBetween(0, 9, 0, -9);
        this.graphics.strokeCircle(0, -11, 5);
        this.graphics.strokeCircle(0, -11, 11);
        this.graphics.lineStyle(1, 0xffffff, 0.4);
        this.graphics.lineBetween(-9, 8, 9, 8);
    }

    drawSignalWaves(): void {
        if (this.shouldThrottleVisuals()) return;
        this.signalGraphics.clear();
        if (this.destroyed) return;

        const color = 0x52f7ff; // Neon signal cyan
        const alpha = 1.0 - (this.waveRadius - 2) / 12;

        // Draw primary expanding signal loop centered at antenna tip (0, -11)
        this.signalGraphics.lineStyle(1.5, color, alpha * 0.7);
        this.signalGraphics.strokeCircle(0, -11, this.waveRadius);

        // Draw secondary trailing signal loop
        if (this.waveRadius > 6) {
            const secondRadius = this.waveRadius - 5;
            const secondAlpha = 1.0 - (secondRadius - 2) / 12;
            this.signalGraphics.lineStyle(1.0, color, secondAlpha * 0.4);
            this.signalGraphics.strokeCircle(0, -11, secondRadius);
        }
    }

    shouldProduce(tickCount: number): boolean {
        const researchManager = (this.scene as IMainScene).researchManager;
        const multiplier = researchManager?.getEffectValue('MINING_RATE_MULTIPLIER', 1) ?? 1;
        const effectiveRate = Math.max(1, Math.round(this.productionRate * multiplier));
        return tickCount % effectiveRate === 0;
    }

    onTick(tickCount: number): void {
        if (this.isInfected(tickCount) && tickCount % 2 !== 0) return;
        if (!this.shouldProduce(tickCount)) return;
        if (this.outputBuffer.length >= this.maxBufferSize) return;

        this.outputBuffer.push('RAW_DATA');
        this.updateStatusMarkers(tickCount);
    }

    destroy(): void {
        if (this.signalTween) {
            this.signalTween.remove();
        }
        super.destroy();
    }
}
