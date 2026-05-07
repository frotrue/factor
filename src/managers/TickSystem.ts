import Phaser from 'phaser';
import { CONFIG } from '../config';
import BuildingManager from './BuildingManager';
import ItemManager from './ItemManager';
import MapManager from './MapManager';
import PowerManager from './PowerManager';
import { GameItem, MoveTarget } from '../types';

export default class TickSystem {
    scene: Phaser.Scene;
    buildingManager: BuildingManager;
    itemManager: ItemManager;
    mapManager: MapManager;
    powerManager: PowerManager | null;
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
        this.tickRate = CONFIG.TICK_RATE;
        this.currentTick = 0;
        this.lastTickTime = 0;
        this.gridSize = CONFIG.GRID_SIZE;
    }

    update(time: number): void {
        if (time > this.lastTickTime + this.tickRate) {
            this.lastTickTime = time;
            this.runTick();
        }
    }

    runTick(): void {
        this.currentTick++;

        if (this.powerManager) {
            this.powerManager.updatePowerGrid();
        }

        const items = this.itemManager.getItems();
        const occupiedPositions = new Set<string>();
        items.forEach(item => occupiedPositions.add(`${item.gridX},${item.gridY}`));

        this.processBuildingOutputs(occupiedPositions);
        const nextMoves = this.planItemMoves(items, occupiedPositions);
        this.executeItemMoves(nextMoves);
        this.processBuildings(occupiedPositions);
    }

    planItemMoves(items: GameItem[], occupiedPositions: Set<string>): Map<GameItem, MoveTarget> {
        const nextMoves = new Map<GameItem, MoveTarget>();
        const itemsToConsume: { item: GameItem; building: any }[] = [];

        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const currentBuilding = this.buildingManager.get(`${item.gridX},${item.gridY}`);

            if (currentBuilding && currentBuilding.type === 'CONVEYOR') {
                const dir = CONFIG.DIRECTIONS[currentBuilding.rotation];
                const nextX = item.gridX + dir.x * this.gridSize;
                const nextY = item.gridY + dir.y * this.gridSize;
                const nextKey = `${nextX},${nextY}`;

                const nextBuilding = this.buildingManager.get(nextKey);
                const isNextOccupied = occupiedPositions.has(nextKey);

                if (nextBuilding) {
                    if (nextBuilding.type !== 'CONVEYOR') {
                        if (nextBuilding.canAcceptItem && nextBuilding.canAcceptItem(item.type)) {
                            itemsToConsume.push({ item, building: nextBuilding });
                            occupiedPositions.delete(`${item.gridX},${item.gridY}`);
                            continue;
                        }
                    } else if (!isNextOccupied) {
                        nextMoves.set(item, { x: nextX, y: nextY });
                        occupiedPositions.add(nextKey);
                        occupiedPositions.delete(`${item.gridX},${item.gridY}`);
                    }
                }
            } else if (currentBuilding && currentBuilding.type !== 'CONVEYOR') {
                if (currentBuilding.canAcceptItem && currentBuilding.canAcceptItem(item.type)) {
                    itemsToConsume.push({ item, building: currentBuilding });
                    occupiedPositions.delete(`${item.gridX},${item.gridY}`);
                }
            }
        }

        itemsToConsume.forEach(({ item, building }) => {
            if (building.acceptItem(item.type)) {
                this.itemManager.despawn(item);
            }
        });

        return nextMoves;
    }

    processBuildingOutputs(occupiedPositions: Set<string>): void {
        const directions = CONFIG.DIRECTIONS;
        this.buildingManager.forEach(building => {
            if (building.outputBuffer && building.outputBuffer.length > 0) {
                const dir = directions[building.rotation];
                const outX = building.x + dir.x * this.gridSize;
                const outY = building.y + dir.y * this.gridSize;
                const outKey = `${outX},${outY}`;

                if (!occupiedPositions.has(outKey)) {
                    const nextBuilding = this.buildingManager.get(outKey);
                    if (nextBuilding) {
                        const itemType = building.popOutput();
                        if (itemType) {
                            this.itemManager.spawn(outX, outY, itemType);
                            occupiedPositions.add(outKey);
                        }
                    }
                }
            }
        });
    }

    executeItemMoves(nextMoves: Map<GameItem, MoveTarget>): void {
        nextMoves.forEach((pos, item) => {
            item.gridX = pos.x;
            item.gridY = pos.y;
            this.scene.tweens.add({
                targets: item.sprite,
                x: item.gridX + this.gridSize / 2,
                y: item.gridY + this.gridSize / 2,
                duration: this.tickRate,
                ease: 'Linear'
            });
        });
    }

    processBuildings(occupiedPositions: Set<string>): void {
        this.buildingManager.forEach(building => {
            if (building.hasPower === false) return;
            building.onTick(this.currentTick, occupiedPositions);
        });
    }

    getCurrentTick(): number {
        return this.currentTick;
    }
}
