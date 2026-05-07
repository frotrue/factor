import { CONFIG } from '../config.js';

/**
 * 틱 기반 시뮬레이션 시스템
 * 아이템 이동 + 건물 틱 로직을 MainScene에서 완전 분리
 */
export default class TickSystem {
    constructor(scene, buildingManager, itemManager, mapManager) {
        this.scene = scene;
        this.buildingManager = buildingManager;
        this.itemManager = itemManager;
        this.mapManager = mapManager;

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
        const items = this.itemManager.getItems();
        const occupiedPositions = new Set();
        items.forEach(item => occupiedPositions.add(`${item.gridX},${item.gridY}`));

        // 1. 아이템 이동 계획 및 실행
        const nextMoves = this.planItemMoves(items, occupiedPositions);
        this.executeItemMoves(nextMoves);

        // 2. 건물 틱 처리 (생산 포함)
        this.processBuildings(occupiedPositions);
    }

    planItemMoves(items, occupiedPositions) {
        const directions = CONFIG.DIRECTIONS;
        const nextMoves = new Map();

        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const building = this.buildingManager.get(`${item.gridX},${item.gridY}`);

            if (building) {
                const dir = directions[building.rotation];
                const nextX = item.gridX + dir.x * this.gridSize;
                const nextY = item.gridY + dir.y * this.gridSize;
                const nextKey = `${nextX},${nextY}`;

                const nextBuilding = this.buildingManager.get(nextKey);
                const isNextOccupied = occupiedPositions.has(nextKey);

                if (nextBuilding && !isNextOccupied) {
                    nextMoves.set(item, { x: nextX, y: nextY });
                    occupiedPositions.add(nextKey);
                    occupiedPositions.delete(`${item.gridX},${item.gridY}`);
                }
            }
        }
        return nextMoves;
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
            // 생산형 건물 처리 (shouldProduce 메서드가 있는 건물)
            if (building.shouldProduce && building.shouldProduce(this.currentTick)) {
                this.tryProduceItem(building, occupiedPositions);
            }

            // 일반 틱 처리
            building.onTick(this.currentTick, occupiedPositions);
        });
    }

    tryProduceItem(building, occupiedPositions) {
        const key = `${building.x},${building.y}`;
        const resourceType = this.mapManager.getResourceAtKey(key);

        // 해당 위치에 자원이 있고, 아이템이 없을 때만 생산
        if (resourceType && !occupiedPositions.has(key)) {
            this.itemManager.spawn(building.x, building.y, resourceType);
            occupiedPositions.add(key);
        }
    }

    getCurrentTick() {
        return this.currentTick;
    }
}
