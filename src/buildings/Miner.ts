import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';
import type MainScene from '../scenes/MainScene';

export default class Miner extends BaseBuilding {
    productionRate: number;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'MINER', { ...config, color: CONFIG.BUILDINGS.MINER.COLOR });
        this.productionRate = CONFIG.BUILDINGS.MINER.PRODUCTION_RATE || 2;
    }

    shouldProduce(tickCount: number): boolean {
        return tickCount % this.productionRate === 0;
    }

    onTick(tickCount: number): void {
        if (tickCount % this.productionRate === 0) {
            if (this.outputBuffer.length >= this.maxBufferSize) return;
            const mapManager = (this.scene as MainScene).mapManager;
            const resourceType = mapManager.getResourceAt(this.x, this.y);
            if (resourceType) {
                this.outputBuffer.push(resourceType);
            }
        }
    }
}
