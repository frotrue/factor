import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import EventBus from '../managers/EventBus';
import { BuildingOptions } from '../types';

export default class Core extends BaseBuilding {
    totalDataReceived: number;
    confidenceScore: number;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'CORE', { ...config, color: CONFIG.BUILDINGS.CORE.COLOR });
        this.totalDataReceived = 0;
        this.confidenceScore = 0;
    }

    canAcceptItem(_type: string): boolean {
        return true;
    }

    acceptItem(itemType: string): boolean {
        this.totalDataReceived++;
        
        if (itemType === 'WEIGHT_UPDATE') {
            this.confidenceScore += 10;
        } else if (itemType === 'LABELED_DATA') {
            this.confidenceScore += 2;
        } else {
            this.confidenceScore += 0.1;
        }

        EventBus.emit('CORE_DATA_RECEIVED', { 
            type: itemType, 
            score: this.confidenceScore,
            total: this.totalDataReceived 
        });
        return true;
    }

    onTick(_tickCount: number): void {
        // 추후 자가 수리나 특수 능력
    }
}
