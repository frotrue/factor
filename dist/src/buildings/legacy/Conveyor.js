import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
export default class Conveyor extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'CONVEYOR', { ...config, color: CONFIG.BUILDINGS.CONVEYOR.COLOR });
    }
    onTick(_tickCount) {
        // 기본 컨베이어는 특별한 틱 동작 없음
    }
    getNextPosition(item, currentTick) {
        // Conveyors move items every 2 ticks if global tick is FastLink-speed
        // Wait, if TickSystem processes items, we might not need to filter by currentTick here,
        // we can filter inside TickSystem.
        const dir = CONFIG.DIRECTIONS[this.rotation];
        return {
            x: this.x + dir.x * CONFIG.GRID_SIZE,
            y: this.y + dir.y * CONFIG.GRID_SIZE
        };
    }
}
//# sourceMappingURL=Conveyor.js.map