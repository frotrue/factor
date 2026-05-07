import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';

export default class PowerNode extends BaseBuilding {
    antenna: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'POWER_NODE', { ...config, color: CONFIG.BUILDINGS.POWER_NODE.COLOR });
        this.antenna = scene.add.rectangle(0, -5, 4, 10, 0xffffff);
        this.container.add(this.antenna);
    }

    canAcceptItem(): boolean {
        return false;
    }

    onTick(_tickCount: number): void {
        // 전력망 연산은 PowerManager에서 수행
    }
}
