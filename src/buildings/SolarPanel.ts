import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';
import { getCategoryColor } from '../visuals/visualTheme';

export default class SolarPanel extends BaseBuilding {
    solarGraphics: Phaser.GameObjects.Graphics;
    glintOffset: number;
    solarTween: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'SOLAR_PANEL', { ...config, color: CONFIG.BUILDINGS.SOLAR_PANEL.COLOR });

        this.solarGraphics = scene.add.graphics();
        this.container.add(this.solarGraphics);

        this.glintOffset = -24;
        this.solarTween = scene.tweens.add({
            targets: this,
            glintOffset: 24,
            duration: 2500,
            repeat: -1,
            repeatDelay: 1000,
            onUpdate: () => this.drawSolarGrid()
        });
    }

    drawSolarGrid(): void {
        this.solarGraphics.clear();
        if (this.destroyed) return;

        const accent = getCategoryColor(CONFIG.BUILDINGS[this.type]?.CATEGORY) || 0x0ea5e9;
        const pulse = 0.75 + 0.15 * Math.sin(this.scene.time.now / 300);

        // 1. Draw 2x2 grid of solar cell rectangles
        const cells = [
            { x: -11, y: -11 },
            { x: 1, y: -11 },
            { x: -11, y: 1 },
            { x: 1, y: 1 }
        ];

        this.solarGraphics.fillStyle(accent, 0.22 * pulse);
        this.solarGraphics.lineStyle(1.5, accent, 0.45);

        for (const cell of cells) {
            this.solarGraphics.fillRect(cell.x, cell.y, 10, 10);
            this.solarGraphics.strokeRect(cell.x, cell.y, 10, 10);
        }

        // 2. Draw sweeping diagonal glint line
        const offset = this.glintOffset;

        this.solarGraphics.lineStyle(2.5, 0xffffff, 0.7);
        this.solarGraphics.beginPath();

        let started = false;
        for (let y = -11; y <= 11; y += 1) {
            const x = offset - y;
            if (x >= -11 && x <= 11) {
                if (!started) {
                    this.solarGraphics.moveTo(x, y);
                    started = true;
                } else {
                    this.solarGraphics.lineTo(x, y);
                }
            }
        }
        if (started) {
            this.solarGraphics.strokePath();
        }

        // 3. Central light sensor dot
        this.solarGraphics.fillStyle(0xffffff, 0.8 * pulse);
        this.solarGraphics.fillCircle(0, 0, 2.5);
    }

    canAcceptItem(): boolean {
        return false;
    }

    onTick(tickCount: number): void {
        super.onTick(tickCount);
    }

    destroy(): void {
        if (this.solarTween) {
            this.solarTween.remove();
        }
        super.destroy();
    }
}
