import { CONFIG } from '../config.js';
import { createBuilding } from '../buildings/BuildingFactory.js';
import EventBus from './EventBus.js';

/**
 * 건물 배치/삭제/조회 전담 매니저
 * MainScene에서 분리된 건물 관리 로직
 */
export default class BuildingManager {
    constructor(scene) {
        this.scene = scene;
        this.buildings = new Map(); // key: "x,y", value: BaseBuilding
    }

    place(x, y, type, rotation) {
        const bConfig = CONFIG.BUILDINGS[type];
        const w = bConfig?.WIDTH || 1;
        const h = bConfig?.HEIGHT || 1;

        // Check availability
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

    remove(key) {
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

    get(key) {
        return this.buildings.get(key) || null;
    }

    has(key) {
        return this.buildings.has(key);
    }

    forEach(callback) {
        const uniqueBuildings = new Set(this.buildings.values());
        uniqueBuildings.forEach(callback);
    }

    getAll() {
        return this.buildings;
    }
}
