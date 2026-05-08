import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, GameItem, MoveTarget } from '../types';

export default class FastLink extends BaseBuilding {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'FAST_LINK', { ...config, color: CONFIG.BUILDINGS.FAST_LINK.COLOR });
        
        // 추가적인 시각적 효과
        const overlay = scene.add.rectangle(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE, 0xffffff, 0.2);
        this.container.add(overlay);
        
        scene.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 300,
            yoyo: true,
            repeat: -1
        });
    }

    getNextPosition(item: GameItem, currentTick: number): MoveTarget | null {
        const dir = CONFIG.DIRECTIONS[this.rotation];
        return {
            x: this.x + dir.x * CONFIG.GRID_SIZE,
            y: this.y + dir.y * CONFIG.GRID_SIZE
        };
    }
}
