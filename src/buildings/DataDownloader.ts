import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';
import type MainScene from '../scenes/MainScene';

export default class DataDownloader extends BaseBuilding {
    productionRate: number;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'DATA_DOWNLOADER', { ...config, color: CONFIG.BUILDINGS.DATA_DOWNLOADER.COLOR });
        this.productionRate = CONFIG.BUILDINGS.DATA_DOWNLOADER.PRODUCTION_RATE || 2;
        this.drawAntenna();
    }

    drawAntenna(): void {
        this.graphics.lineStyle(2, 0x00ffff, 0.9);
        this.graphics.lineBetween(0, 9, 0, -9);
        this.graphics.strokeCircle(0, -11, 5);
        this.graphics.strokeCircle(0, -11, 11);
        this.graphics.lineStyle(1, 0xffffff, 0.4);
        this.graphics.lineBetween(-9, 8, 9, 8);
    }

    shouldProduce(tickCount: number): boolean {
        const researchManager = (this.scene as MainScene).researchManager;
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
}
