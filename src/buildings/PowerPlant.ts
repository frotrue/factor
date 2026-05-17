import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, IMainScene } from '../types';

export default class PowerPlant extends BaseBuilding {
    coreGraphics: Phaser.GameObjects.Arc;
    isActive: boolean;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'POWER_PLANT', { ...config, color: CONFIG.BUILDINGS.POWER_PLANT.COLOR });

        this.coreGraphics = scene.add.circle(0, 0, 4, 0xffffff);
        this.container.add(this.coreGraphics);

        this.isActive = false;
        this.checkPlacement();
    }

    checkPlacement(): void {
        const mapManager = (this.scene as IMainScene).mapManager;
        const resourceType = mapManager.getResourceAt(this.x, this.y);
        this.isActive = (resourceType === 'ENERGY');
        if (!this.isActive) {
            this.coreGraphics.setFillStyle(0xff0000);
        } else {
            this.scene.tweens.add({
                targets: this.coreGraphics,
                alpha: 0.2,
                yoyo: true,
                repeat: -1,
                duration: 500
            });
        }
    }

    canAcceptItem(): boolean {
        return false;
    }

    onTick(_tickCount: number): void {
        // 실제 발전 로직은 PowerManager에서 일괄 처리
    }
}
