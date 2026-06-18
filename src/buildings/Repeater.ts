import Phaser from 'phaser';
import { CONFIG } from '../config';
import BaseBuilding from './BaseBuilding';
import { BuildingOptions } from '../types';
import { VISUAL_THEME } from '../visuals/visualTheme';

export default class Repeater extends BaseBuilding {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'REPEATER', { ...config, color: CONFIG.BUILDINGS.REPEATER.COLOR });
        this.drawRepeaterBody();
    }

    private drawRepeaterBody(): void {
        const size = CONFIG.GRID_SIZE;
        const left = -size / 2;
        const top = -size / 2;
        const accent = CONFIG.BUILDINGS.REPEATER.COLOR;

        this.graphics.clear();
        this.graphics.fillStyle(VISUAL_THEME.buildings.shadow, 0.36);
        this.graphics.fillRoundedRect(left + 4, top + 5, size - 4, size - 4, 5);
        this.graphics.fillStyle(VISUAL_THEME.buildings.panelDark, 0.96);
        this.graphics.fillRoundedRect(left + 2, top + 2, size - 4, size - 4, 5);
        this.graphics.fillStyle(accent, 0.2);
        this.graphics.fillRoundedRect(left + 6, top + 6, size - 12, size - 12, 4);
        this.graphics.lineStyle(2, accent, 0.86);
        this.graphics.strokeRoundedRect(left + 3, top + 3, size - 6, size - 6, 5);
        this.graphics.lineStyle(2, 0xdbeafe, 0.65);
        this.graphics.strokeCircle(0, 0, 7);
        this.graphics.lineStyle(2, accent, 0.9);
        this.graphics.lineBetween(-12, 0, -7, 0);
        this.graphics.lineBetween(7, 0, 12, 0);
        this.graphics.lineBetween(0, -12, 0, -7);
        this.graphics.lineBetween(0, 7, 0, 12);
        this.graphics.fillStyle(accent, 0.95);
        this.graphics.fillCircle(0, 0, 3);
    }
}
