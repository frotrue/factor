import { CONFIG } from '../config';
import { createBuilding } from '../buildings/BuildingFactory';
import EventBus from './EventBus';
export default class BuildingManager {
    constructor(scene) {
        this.scene = scene;
        this.buildings = new Map();
    }
    place(x, y, type, rotation, config = {}) {
        const bConfig = CONFIG.BUILDINGS[type];
        const w = bConfig?.WIDTH || 1;
        const h = bConfig?.HEIGHT || 1;
        for (let dx = 0; dx < w; dx++) {
            for (let dy = 0; dy < h; dy++) {
                const key = `${x + dx * CONFIG.GRID_SIZE},${y + dy * CONFIG.GRID_SIZE}`;
                if (this.buildings.has(key))
                    return null;
            }
        }
        // Check and deduct building costs
        if (bConfig.COST && bConfig.COST.length > 0) {
            const inventoryManager = this.scene.inventoryManager;
            if (inventoryManager && !inventoryManager.spend(bConfig.COST)) {
                const uiManager = this.scene.uiManager;
                if (uiManager) {
                    const costText = bConfig.COST.map((c) => `${c.amount} ${c.resource}`).join(', ');
                    uiManager.logMessage(`System: Insufficient resources. Need: ${costText}`, true);
                }
                return null;
            }
        }
        const building = createBuilding(this.scene, x, y, type, { ...config, rotation });
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
            if (building.type === 'CORE') {
                const uiManager = this.scene.uiManager;
                if (uiManager)
                    uiManager.logMessage("System: Cannot remove Neural Core.", true);
                return;
            }
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
//# sourceMappingURL=BuildingManager.js.map