import Phaser from 'phaser';
import { CONFIG } from '../config';
import { createBuilding } from '../buildings/BuildingFactory';
import BaseBuilding from '../buildings/BaseBuilding';
import EventBus from './EventBus';

export default class BuildingManager {
    scene: Phaser.Scene;
    buildings: Map<string, BaseBuilding>;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.buildings = new Map();
    }

    place(x: number, y: number, type: string, rotation: number): BaseBuilding | null {
        const bConfig = CONFIG.BUILDINGS[type];
        const w = bConfig?.WIDTH || 1;
        const h = bConfig?.HEIGHT || 1;

        for (let dx = 0; dx < w; dx++) {
            for (let dy = 0; dy < h; dy++) {
                const key = `${x + dx * CONFIG.GRID_SIZE},${y + dy * CONFIG.GRID_SIZE}`;
                if (this.buildings.has(key)) return null;
            }
        }

        const building = createBuilding(this.scene, x, y, type, { rotation });
        if (building) {
            for (let dx = 0; dx < w; dx++) {
                for (let dy = 0; dy < h; dy++) {
                    const key = `${x + dx * CONFIG.GRID_SIZE},${y + dy * CONFIG.GRID_SIZE}`;
                    this.buildings.set(key, building);
                }
            }
            EventBus.emit('BUILDING_PLACED', { key: `${x},${y}`, building, type });
        }
        return building;
    }

    remove(key: string): void {
        const building = this.buildings.get(key);
        if (building) {
            const bConfig = CONFIG.BUILDINGS[building.type];
            const w = bConfig?.WIDTH || 1;
            const h = bConfig?.HEIGHT || 1;

            for (let dx = 0; dx < w; dx++) {
                for (let dy = 0; dy < h; dy++) {
                    const k = `${building.x + dx * CONFIG.GRID_SIZE},${building.y + dy * CONFIG.GRID_SIZE}`;
                    this.buildings.delete(k);
                }
            }
            building.destroy();
            EventBus.emit('BUILDING_REMOVED', { key });
        }
    }

    get(key: string): BaseBuilding | null {
        return this.buildings.get(key) || null;
    }

    has(key: string): boolean {
        return this.buildings.has(key);
    }

    forEach(callback: (building: BaseBuilding) => void): void {
        const uniqueBuildings = new Set(this.buildings.values());
        uniqueBuildings.forEach(callback);
    }

    getAll(): Map<string, BaseBuilding> {
        return this.buildings;
    }
}
