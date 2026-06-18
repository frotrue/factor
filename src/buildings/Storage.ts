import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';
import { getCategoryColor } from '../visuals/visualTheme';

export default class Storage extends BaseBuilding {
    amountText: Phaser.GameObjects.Text;
    storageGraphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}, type: string = 'STORAGE') {
        super(scene, x, y, type, { ...config, color: CONFIG.BUILDINGS[type].COLOR });

        this.amountText = scene.add.text(0, 0, '0', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Share Tech Mono'
        }).setOrigin(0.5);
        this.container.add(this.amountText);

        this.storageGraphics = scene.add.graphics();
        this.container.add(this.storageGraphics);
        this.drawCapacityGauge();
    }

    drawCapacityGauge(): void {
        this.storageGraphics.clear();
        if (this.destroyed) return;

        const max = this.maxBufferSize || 5;
        const current = this.inputBuffer.length;
        const ratio = Math.min(1, current / max);

        const accent = getCategoryColor(CONFIG.BUILDINGS[this.type]?.CATEGORY) || 0x3b82f6;
        const bConfig = CONFIG.BUILDINGS[this.type];
        const w = bConfig?.WIDTH || 1;
        const h = bConfig?.HEIGHT || 1;
        const size = Math.min(w * CONFIG.GRID_SIZE, h * CONFIG.GRID_SIZE);
        const radius = size * 0.36;

        // Background track
        this.storageGraphics.lineStyle(4, accent, 0.12);
        this.storageGraphics.strokeCircle(0, 0, radius);

        if (ratio > 0) {
            // Draw segmented neon circular arc gauge
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (Math.PI * 2 * ratio);

            // Glow outer line
            this.storageGraphics.lineStyle(4, accent, 0.45);
            this.storageGraphics.beginPath();
            this.storageGraphics.arc(0, 0, radius, startAngle, endAngle, false);
            this.storageGraphics.strokePath();

            // Core inner line
            this.storageGraphics.lineStyle(1.5, 0xffffff, 0.9);
            this.storageGraphics.beginPath();
            this.storageGraphics.arc(0, 0, radius, startAngle, endAngle, false);
            this.storageGraphics.strokePath();
        }
    }

    /** 케이블은 Storage의 inputBuffer에서 데이터를 빼감 */
    getOutputSource(): string[] {
        return this.inputBuffer;
    }

    popOutput(): string | undefined {
        const item = super.popOutput();
        this.amountText.setText(this.inputBuffer.length.toString());
        this.drawCapacityGauge();
        return item;
    }

    canAcceptItem(type: string): boolean {
        if (this.inputBuffer.length >= this.maxBufferSize) return false;
        if (this.inputBuffer.length > 0) {
            return this.inputBuffer[0] === type;
        }
        return true;
    }

    acceptItem(type: string): boolean {
        if (this.canAcceptItem(type)) {
            this.inputBuffer.push(type);
            this.amountText.setText(this.inputBuffer.length.toString());
            this.drawCapacityGauge();
            return true;
        }
        return false;
    }

    onTick(tickCount: number): void {
        super.onTick(tickCount);
        this.amountText.setText(this.inputBuffer.length.toString());
        this.drawCapacityGauge();
    }
}
