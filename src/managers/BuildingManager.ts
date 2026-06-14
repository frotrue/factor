import Phaser from 'phaser';
import { CONFIG } from '../config';
import { createBuilding } from '../buildings/BuildingFactory';
import BaseBuilding from '../buildings/BaseBuilding';
import EventBus from './EventBus';
import { BuildingCost, BuildingOptions, IMainScene } from '../types';
import { getBuildingLifecycleEvent, type BuildingRemovalReason } from '../utils/buildingLifecycle';

export default class BuildingManager {
    scene: IMainScene;
    buildings: Map<string, BaseBuilding>;
    private _uniqueCache: BaseBuilding[] | null = null;
    private buildingsByType: Map<string, Set<BaseBuilding>>;

    constructor(scene: IMainScene) {
        this.scene = scene;
        this.buildings = new Map();
        this.buildingsByType = new Map();
    }

    place(x: number, y: number, type: string, rotation: number, config: BuildingOptions = {}): BaseBuilding | null {
        const bConfig = CONFIG.BUILDINGS[type];
        const w = bConfig?.WIDTH || 1;
        const h = bConfig?.HEIGHT || 1;

        for (let dx = 0; dx < w; dx++) {
            for (let dy = 0; dy < h; dy++) {
                const key = `${x + dx * CONFIG.GRID_SIZE},${y + dy * CONFIG.GRID_SIZE}`;
                if (this.buildings.has(key)) return null;
            }
        }

        // Check and deduct building costs unless restoring trusted save data.
        if (!config.skipCost && bConfig.COST && bConfig.COST.length > 0) {
            const inventoryManager = this.scene.inventoryManager;
            if (inventoryManager && !inventoryManager.spend(bConfig.COST)) {
                const costText = bConfig.COST.map((c: BuildingCost) => `${c.amount} ${c.resource}`).join(', ');
                this.logMessage(`System: Insufficient resources. Need: ${costText}`, true);
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
            this._uniqueCache = null;
            this.addToTypeIndex(building);
            EventBus.emit('BUILDING_PLACED', { key: `${x},${y}`, building, type });
        }
        return building;
    }

    remove(key: string): void {
        this.removeInternal(key, 'removed');
    }

    destroyBuilding(key: string): void {
        this.removeInternal(key, 'destroyed');
    }

    private removeInternal(key: string, reason: BuildingRemovalReason): void {
        const building = this.buildings.get(key);
        if (building) {
            if (building.type === 'CORE') {
                this.logMessage("System: Cannot remove Neural Core.", true);
                return;
            }

            const bConfig = CONFIG.BUILDINGS[building.type];
            const w = bConfig?.WIDTH || 1;
            const h = bConfig?.HEIGHT || 1;
            const baseKey = `${building.x},${building.y}`;
            this.scene.cableManager?.handleBuildingRemoved(baseKey);

            for (let dx = 0; dx < w; dx++) {
                for (let dy = 0; dy < h; dy++) {
                    const k = `${building.x + dx * CONFIG.GRID_SIZE},${building.y + dy * CONFIG.GRID_SIZE}`;
                    this.buildings.delete(k);
                }
            }
            this._uniqueCache = null;
            this.removeFromTypeIndex(building);
            building.destroy();
            const event = getBuildingLifecycleEvent(reason);
            if (event === 'BUILDING_DESTROYED') {
                EventBus.emit('BUILDING_DESTROYED', { key: baseKey, building, type: building.type });
            } else {
                EventBus.emit('BUILDING_REMOVED', { key: baseKey });
            }
        }
    }

    get(key: string): BaseBuilding | null {
        return this.buildings.get(key) || null;
    }

    has(key: string): boolean {
        return this.buildings.has(key);
    }

    private logMessage(message: string, isAlert: boolean = false): void {
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', { message, isAlert });
    }

    forEach(callback: (building: BaseBuilding) => void): void {
        const buildings = this.getUniqueBuildings();
        for (let i = 0; i < buildings.length; i++) {
            callback(buildings[i]);
        }
    }

    getUniqueBuildings(): BaseBuilding[] {
        if (!this._uniqueCache) {
            this._uniqueCache = [...new Set(this.buildings.values())];
        }
        return this._uniqueCache;
    }

    getByType(type: string): BaseBuilding[] {
        return Array.from(this.buildingsByType.get(type) || []);
    }

    getByTypes(types: string[]): BaseBuilding[] {
        const result: BaseBuilding[] = [];
        types.forEach(type => {
            const buildings = this.buildingsByType.get(type);
            if (!buildings) return;
            buildings.forEach(building => result.push(building));
        });
        return result;
    }

    countByTypes(types: string[]): number {
        return types.reduce((total, type) => total + (this.buildingsByType.get(type)?.size || 0), 0);
    }

    clear(): void {
        this.buildings.clear();
        this.buildingsByType.clear();
        this._uniqueCache = null;
    }

    getAll(): Map<string, BaseBuilding> {
        return this.buildings;
    }

    private addToTypeIndex(building: BaseBuilding): void {
        let buildings = this.buildingsByType.get(building.type);
        if (!buildings) {
            buildings = new Set();
            this.buildingsByType.set(building.type, buildings);
        }
        buildings.add(building);
    }

    private removeFromTypeIndex(building: BaseBuilding): void {
        const buildings = this.buildingsByType.get(building.type);
        if (!buildings) return;
        buildings.delete(building);
        if (buildings.size === 0) {
            this.buildingsByType.delete(building.type);
        }
    }
}
