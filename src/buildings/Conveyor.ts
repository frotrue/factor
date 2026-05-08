import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, GameItem, MoveTarget } from '../types';

export default class Conveyor extends BaseBuilding {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'CONVEYOR', { ...config, color: CONFIG.BUILDINGS.CONVEYOR.COLOR });
    }

    onTick(_tickCount: number): void {
        // 기본 컨베이어는 특별한 틱 동작 없음
    }

    getNextPosition(item: GameItem, currentTick: number): MoveTarget | null {
        // Conveyors move items every 2 ticks if global tick is FastLink-speed
        // Wait, if TickSystem processes items, we might not need to filter by currentTick here,
        // we can filter inside TickSystem.
        const dir = CONFIG.DIRECTIONS[this.rotation];
        return {
            x: this.x + dir.x * CONFIG.GRID_SIZE,
            y: this.y + dir.y * CONFIG.GRID_SIZE
        };
    }
}
