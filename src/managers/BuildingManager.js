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
        const key = `${x},${y}`;
        if (this.buildings.has(key)) return null;

        const building = createBuilding(this.scene, x, y, type, { rotation });
        if (building) {
            this.buildings.set(key, building);
            EventBus.emit('BUILDING_PLACED', { key, building, type });
        }
        return building;
    }

    remove(key) {
        const building = this.buildings.get(key);
        if (building) {
            building.destroy();
            this.buildings.delete(key);
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
        this.buildings.forEach(callback);
    }

    getAll() {
        return this.buildings;
    }
}
