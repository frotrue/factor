import Phaser from 'phaser';
import { CONFIG } from '../config';
import BuildingManager from './BuildingManager';
import ItemManager from './ItemManager';
import MapManager from './MapManager';
import PowerManager from './PowerManager';
import CableManager from './CableManager';
import { GameItem } from '../types';

export default class TickSystem {
    scene: Phaser.Scene;
    buildingManager: BuildingManager;
    itemManager: ItemManager;
    mapManager: MapManager;
    powerManager: PowerManager | null;
    cableManager: CableManager | null;
    tickRate: number;
    currentTick: number;
    lastTickTime: number;
    gridSize: number;

    constructor(
        scene: Phaser.Scene,
        buildingManager: BuildingManager,
        itemManager: ItemManager,
        mapManager: MapManager,
        powerManager: PowerManager | null = null
    ) {
        this.scene = scene;
        this.buildingManager = buildingManager;
        this.itemManager = itemManager;
        this.mapManager = mapManager;
        this.powerManager = powerManager;
        this.cableManager = (scene as any).cableManager || null;
        this.tickRate = CONFIG.TICK_RATE * CONFIG.TIMING.TICK_RATE_MULTIPLIER;
        this.currentTick = 0;
        this.lastTickTime = 0;
        this.gridSize = CONFIG.GRID_SIZE;
    }

    update(time: number): void {
        const adjustedTickRate = this.tickRate / (this.scene as any).gameSpeed;
        if (time > this.lastTickTime + adjustedTickRate) {
            this.lastTickTime = time;
            this.runTick();
        }
    }

    runTick(): void {
        this.currentTick++;
        const isFullTick = this.currentTick % 2 === 0;

        if (this.powerManager && isFullTick) {
            this.powerManager.updatePowerGrid();
        }
        
        if (this.cableManager) {
            if (isFullTick) {
                this.cableManager.updateAPConnections(this.buildingManager);
            }
            // 전송은 매 틱마다 (또는 full tick에만 할지 결정할 수 있음)
            this.cableManager.transferData(this.buildingManager, this.itemManager);
        }

        const occupiedPositions = new Set<string>();

        if (isFullTick) {
            this.processBuildings(occupiedPositions);
        }
    }

    processBuildings(occupiedPositions: Set<string>): void {
        this.buildingManager.forEach(building => {
            if (building.hasPower === false) return;
            building.onTick(this.currentTick, occupiedPositions);
            building.updateStatusMarkers(this.currentTick);
        });
    }

    getCurrentTick(): number {
        return this.currentTick;
    }
}
