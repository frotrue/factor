import { CONFIG } from '../config.js';

/**
 * 틱 기반 시뮬레이션 시스템
 * 아이템 이동 + 건물 틱 로직을 MainScene에서 완전 분리
 */
export default class TickSystem {
    constructor(scene, buildingManager, itemManager, mapManager, powerManager) {
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

    update(time) {
        if (time > this.lastTickTime + this.tickRate) {
            this.lastTickTime = time;
            this.runTick();
        }
    }

    runTick() {
        this.currentTick++;
        
        // 0. 전력망 업데이트
        if (this.powerManager) {
            this.powerManager.updatePowerGrid();
        }

        const items = this.itemManager.getItems();
        const occupiedPositions = new Set();
        items.forEach(item => occupiedPositions.add(`${item.gridX},${item.gridY}`));

        // 1. 건물 출력 처리 (Output Buffer -> Grid)
        this.processBuildingOutputs(occupiedPositions);

        // 2. 아이템 이동 및 건물 입력 처리
        const nextMoves = this.planItemMoves(items, occupiedPositions);
        this.executeItemMoves(nextMoves);

        // 3. 건물 틱 처리 (생산 및 가공)
        this.processBuildings(occupiedPositions);
    }

    planItemMoves(items, occupiedPositions) {
        const nextMoves = new Map();
        const itemsToConsume = []; 

        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const currentBuilding = this.buildingManager.get(`${item.gridX},${item.gridY}`);

            // 1. 현재 아이템이 컨베이어 위에 있을 때만 다음 칸으로 이동 시도
            if (currentBuilding && currentBuilding.type === 'CONVEYOR') {
                const dir = CONFIG.DIRECTIONS[currentBuilding.rotation];
                const nextX = item.gridX + dir.x * this.gridSize;
                const nextY = item.gridY + dir.y * this.gridSize;
                const nextKey = `${nextX},${nextY}`;

                const nextBuilding = this.buildingManager.get(nextKey);
                const isNextOccupied = occupiedPositions.has(nextKey);

                if (nextBuilding) {
                    // 2. 다음 건물이 일반 건물(Processor, Core 등)이면 투입 시도
                    if (nextBuilding.type !== 'CONVEYOR') {
                        if (nextBuilding.canAcceptItem && nextBuilding.canAcceptItem(item.type)) {
                            itemsToConsume.push({ item, building: nextBuilding });
                            occupiedPositions.delete(`${item.gridX},${item.gridY}`);
                            continue; // 투입되었으므로 이동 로직 건너뜀
                        }
                    } 
                    // 3. 다음 건물이 컨베이어이고 비어있으면 이동
                    else if (!isNextOccupied) {
                        nextMoves.set(item, { x: nextX, y: nextY });
                        occupiedPositions.add(nextKey);
                        occupiedPositions.delete(`${item.gridX},${item.gridY}`);
                    }
                }
            } else if (currentBuilding && currentBuilding.type !== 'CONVEYOR') {
                // 혹시 아이템이 일반 건물 위에 올라와 있다면 즉시 투입 시도 (예외 케이스 방어)
                if (currentBuilding.canAcceptItem && currentBuilding.canAcceptItem(item.type)) {
                    itemsToConsume.push({ item: item, building: currentBuilding });
                    occupiedPositions.delete(`${item.gridX},${item.gridY}`);
                }
            }
        }

        // 아이템 건물 투입 실행
        itemsToConsume.forEach(({ item, building }) => {
            if (building.acceptItem(item.type)) {
                this.itemManager.despawn(item);
            }
        });

        return nextMoves;
    }

    processBuildingOutputs(occupiedPositions) {
        const directions = CONFIG.DIRECTIONS;
        this.buildingManager.forEach(building => {
            // 출력 버퍼에 아이템이 있고, 출구가 비어있다면 배출
            if (building.outputBuffer && building.outputBuffer.length > 0) {
                const dir = directions[building.rotation];
                const outX = building.x + dir.x * this.gridSize;
                const outY = building.y + dir.y * this.gridSize;
                const outKey = `${outX},${outY}`;

                if (!occupiedPositions.has(outKey)) {
                    const nextBuilding = this.buildingManager.get(outKey);
                    // 앞에 건물이 있고(주로 컨베이어) 아이템을 받을 수 있다면 배출
                    if (nextBuilding) {
                        const itemType = building.popOutput();
                        this.itemManager.spawn(outX, outY, itemType);
                        occupiedPositions.add(outKey);
                    }
                }
            }
        });
    }

    executeItemMoves(nextMoves) {
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

    processBuildings(occupiedPositions) {
        this.buildingManager.forEach(building => {
            // 전력이 필요한 건물이 전력을 공급받지 못하고 있다면 틱을 스킵
            if (building.hasPower === false) {
                return;
            }
            
            // 일반 틱 처리 (생산/가공 등)
            building.onTick(this.currentTick, occupiedPositions);
        });
    }

    getCurrentTick() {
        return this.currentTick;
    }
}
