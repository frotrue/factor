import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';

export default class Conveyor extends BaseBuilding {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'CONVEYOR', { ...config, color: CONFIG.BUILDINGS.CONVEYOR.COLOR });
    }

    onTick(_tickCount: number): void {
        // 기본 컨베이어는 특별한 틱 동작 없음
    }
}
