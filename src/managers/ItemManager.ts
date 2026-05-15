import Phaser from 'phaser';
import { CONFIG } from '../config';
import EventBus from './EventBus';
import { GameItem } from '../types';

export default class ItemManager {
    scene: Phaser.Scene;
    items: GameItem[];
    pool: Phaser.GameObjects.Group;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.items = [];
        this.pool = scene.add.group({ maxSize: 2000 });

        EventBus.on('BUILDING_REMOVED', ({ key }: { key: string }) => {
            const [x, y] = key.split(',').map(Number);
            const orphanItems = this.items.filter(item => item.gridX === x && item.gridY === y);
            orphanItems.forEach(item => this.despawn(item));
        }, 'ItemManager');
    }

    spawn(gridX: number, gridY: number, type: string = 'RAW_DATA'): GameItem {
        const x = gridX + CONFIG.GRID_SIZE / 2;
        const y = gridY + CONFIG.GRID_SIZE / 2;
        const itemConfig = CONFIG.ITEMS[type] || CONFIG.ITEMS.RAW_DATA;

        let sprite = this.pool.getFirstDead(false) as Phaser.GameObjects.Arc | null;

        if (!sprite) {
            sprite = this.scene.add.circle(x, y, itemConfig.RADIUS, itemConfig.COLOR);
            sprite.setStrokeStyle(2, 0xffffff);
            sprite.setDepth(20);
            this.pool.add(sprite);
        } else {
            sprite.setActive(true);
            sprite.setVisible(true);
            sprite.setPosition(x, y);
            sprite.setFillStyle(itemConfig.COLOR);
            sprite.setRadius(itemConfig.RADIUS);
        }

        const item: GameItem = { gridX, gridY, sprite, type };
        this.items.push(item);
        return item;
    }

    despawn(item: GameItem): void {
        if (this.scene && this.scene.tweens) {
            this.scene.tweens.killTweensOf(item.sprite);
        }
        item.sprite.setActive(false);
        item.sprite.setVisible(false);
        this.pool.killAndHide(item.sprite);
        
        const index = this.items.indexOf(item);
        if (index > -1) {
            this.items.splice(index, 1);
        }
    }

    getItems(): GameItem[] {
        return this.items;
    }
}
