import Phaser from 'phaser';
import { CONFIG } from '../config';
import EventBus from './EventBus';
import BuildingManager from './BuildingManager';
import { PowerNodeInfo } from '../types';

export default class PowerManager {
    scene: Phaser.Scene;
    buildingManager: BuildingManager;
    gridSize: number;
    totalProduction: number;
    totalConsumption: number;
    availablePower: number;
    poweredArea: Set<string>;
    nodes: PowerNodeInfo[];

    constructor(scene: Phaser.Scene, buildingManager: BuildingManager) {
        this.scene = scene;
        this.buildingManager = buildingManager;
        this.gridSize = CONFIG.GRID_SIZE;
        this.totalProduction = 0;
        this.totalConsumption = 0;
        this.availablePower = 0;
        this.poweredArea = new Set();
        this.nodes = [];
    }

    updatePowerGrid(): void {
        this.totalProduction = 0;
        this.totalConsumption = 0;
        this.poweredArea.clear();
        this.nodes = [];

        const generators: PowerNodeInfo[] = [];
        const relays: PowerNodeInfo[] = [];

        this.buildingManager.forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            if (!pConfig) return;

            let isGenerating = true;
            if (building.type === 'POWER_PLANT' && !(building as any).isActive) {
                isGenerating = false;
            }

            if (isGenerating && pConfig.PRODUCTION > 0) {
                this.totalProduction += pConfig.PRODUCTION;
                const range = pConfig.RANGE || 0;
                generators.push({ x: building.x, y: building.y, range });
            } else if (pConfig.RANGE && pConfig.RANGE > 0) {
                relays.push({ x: building.x, y: building.y, range: pConfig.RANGE });
            }
        });

        const getCoveredTiles = (node: PowerNodeInfo): string[] => {
            if (node.range <= 0) return [];
            const tiles: string[] = [];
            const cx = Math.floor(node.x / this.gridSize);
            const cy = Math.floor(node.y / this.gridSize);
            for (let dx = -node.range; dx <= node.range; dx++) {
                for (let dy = -node.range; dy <= node.range; dy++) {
                    tiles.push(`${(cx + dx) * this.gridSize},${(cy + dy) * this.gridSize}`);
                }
            }
            return tiles;
        };

        const connectedRelays = new Set<PowerNodeInfo>();
        const queue: PowerNodeInfo[] = [...generators];

        while (queue.length > 0) {
            const current = queue.shift()!;
            const currentTiles = getCoveredTiles(current);
            currentTiles.forEach(t => this.poweredArea.add(t));

            relays.forEach(relay => {
                if (!connectedRelays.has(relay)) {
                    const relayKey = `${relay.x},${relay.y}`;
                    if (this.poweredArea.has(relayKey)) {
                        connectedRelays.add(relay);
                        queue.push(relay);
                    }
                }
            });
        }

        this.buildingManager.forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            if (!pConfig) return;
            const key = `${building.x},${building.y}`;
            const inGrid = this.poweredArea.has(key);
            if (pConfig.CONSUMPTION > 0 && inGrid) {
                this.totalConsumption += pConfig.CONSUMPTION;
            }
        });

        this.availablePower = this.totalProduction - this.totalConsumption;
        const isBlackout = this.availablePower < 0;

        this.buildingManager.forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            if (!pConfig) return;
            const key = `${building.x},${building.y}`;
            const inGrid = this.poweredArea.has(key);
            if (pConfig.CONSUMPTION > 0) {
                building.hasPower = inGrid && !isBlackout;
            } else {
                building.hasPower = true;
            }
        });

        EventBus.emit('POWER_UPDATED', {
            production: this.totalProduction,
            consumption: this.totalConsumption,
            net: this.availablePower,
            isBlackout
        });
    }

    isPowered(x: number, y: number): boolean {
        return this.poweredArea.has(`${x},${y}`);
    }
}
