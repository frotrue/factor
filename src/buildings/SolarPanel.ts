import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';

export default class SolarPanel extends BaseBuilding {
    coreGraphics: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'SOLAR_PANEL', { ...config, color: CONFIG.BUILDINGS.SOLAR_PANEL.COLOR });

        this.coreGraphics = scene.add.rectangle(0, 0, 16, 16, 0x0ea5e9);
        this.container.add(this.coreGraphics);

        scene.tweens.add({
            targets: this.coreGraphics,
            alpha: 0.6,
            yoyo: true,
            repeat: -1,
            duration: 2000
        });
    }

    canAcceptItem(): boolean {
        return false;
    }

    onTick(_tickCount: number): void {
        // 실제 발전 로직은 PowerManager에서 일괄 처리
    }
}
