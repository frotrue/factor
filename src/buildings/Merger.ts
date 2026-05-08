import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, GameItem, MoveTarget } from '../types';

export default class Merger extends BaseBuilding {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'MERGER', { ...config, color: CONFIG.BUILDINGS.MERGER.COLOR });
        
        const arrow = scene.add.triangle(0, 0, 10, 0, 0, 10, 0, -10, 0xffffff);
        this.container.add(arrow);
    }

    getNextPosition(item: GameItem, currentTick: number): MoveTarget | null {
        const dir = CONFIG.DIRECTIONS[this.rotation];
        return {
            x: this.x + dir.x * CONFIG.GRID_SIZE,
            y: this.y + dir.y * CONFIG.GRID_SIZE
        };
    }
}
