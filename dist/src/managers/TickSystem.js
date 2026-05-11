import { CONFIG } from '../config';
export default class TickSystem {
    constructor(scene, buildingManager, itemManager, mapManager, powerManager = null) {
        this.scene = scene;
        this.buildingManager = buildingManager;
        this.itemManager = itemManager;
        this.mapManager = mapManager;
        this.powerManager = powerManager;
        this.cableManager = scene.cableManager || null;
        this.tickRate = CONFIG.TICK_RATE / 2; // Run ticks twice as fast
        this.currentTick = 0;
        this.lastTickTime = 0;
        this.gridSize = CONFIG.GRID_SIZE;
    }
    update(time) {
        const adjustedTickRate = this.tickRate / this.scene.gameSpeed;
        if (time > this.lastTickTime + adjustedTickRate) {
            this.lastTickTime = time;
            this.runTick();
        }
    }
    runTick() {
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
        const occupiedPositions = new Set();
        if (isFullTick) {
            this.processBuildings(occupiedPositions);
        }
    }
    processBuildings(occupiedPositions) {
        this.buildingManager.forEach(building => {
            if (building.hasPower === false)
                return;
            building.onTick(this.currentTick, occupiedPositions);
        });
    }
    getCurrentTick() {
        return this.currentTick;
    }
}
//# sourceMappingURL=TickSystem.js.map