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
        this.tickRate = CONFIG.TICK_RATE / 2; // Run ticks twice as fast
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

        const items = this.itemManager.getItems();
        const occupiedPositions = new Set<string>();
        items.forEach(item => occupiedPositions.add(`${item.gridX},${item.gridY}`));

        if (isFullTick) {
            this.processBuildingOutputs(occupiedPositions);
        }

        const nextMoves = this.planItemMoves(items, occupiedPositions, isFullTick);
        this.executeItemMoves(nextMoves);

        if (isFullTick) {
            this.processBuildings(occupiedPositions);
        }
    }

    planItemMoves(items: GameItem[], occupiedPositions: Set<string>, isFullTick: boolean): Map<GameItem, MoveTarget> {
        const nextMoves = new Map<GameItem, MoveTarget>();
        const itemsToConsume: { item: GameItem; building: any }[] = [];

        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const currentBuilding = this.buildingManager.get(`${item.gridX},${item.gridY}`);

            if (currentBuilding) {
                const isFast = currentBuilding.type === 'FAST_LINK';
                if (!isFast && !isFullTick) continue;

                if ((currentBuilding as any).getNextPosition) {
                    const nextPos = (currentBuilding as any).getNextPosition(item, this.currentTick);
                    if (!nextPos) continue;

                    const nextKey = `${nextPos.x},${nextPos.y}`;
                    const nextBuilding = this.buildingManager.get(nextKey);
                    const isNextOccupied = occupiedPositions.has(nextKey);

                    if (nextBuilding) {
                        if (!(nextBuilding as any).getNextPosition) { // Not a conveyor-like building
                            if (nextBuilding.canAcceptItem && nextBuilding.canAcceptItem(item.type)) {
                                itemsToConsume.push({ item, building: nextBuilding });
                                occupiedPositions.delete(`${item.gridX},${item.gridY}`);
                            }
                        } else if (!isNextOccupied) {
                            nextMoves.set(item, nextPos);
                            occupiedPositions.add(nextKey);
                            occupiedPositions.delete(`${item.gridX},${item.gridY}`);
                        }
                    }
                } else if (!isFast && isFullTick) {
                    if (currentBuilding.canAcceptItem && currentBuilding.canAcceptItem(item.type)) {
                        itemsToConsume.push({ item, building: currentBuilding });
                        occupiedPositions.delete(`${item.gridX},${item.gridY}`);
                    }
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
        const adjustedTickRate = this.tickRate / (this.scene as any).gameSpeed;
        nextMoves.forEach((pos, item) => {
            item.gridX = pos.x;
            item.gridY = pos.y;
            this.scene.tweens.add({
                targets: item.sprite,
                x: item.gridX + this.gridSize / 2,
                y: item.gridY + this.gridSize / 2,
                duration: adjustedTickRate,
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
