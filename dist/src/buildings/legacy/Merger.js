import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
export default class Merger extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'MERGER', { ...config, color: CONFIG.BUILDINGS.MERGER.COLOR });
        const arrow = scene.add.triangle(0, 0, 10, 0, 0, 10, 0, -10, 0xffffff);
        this.container.add(arrow);
    }
    getNextPosition(item, currentTick) {
        const dir = CONFIG.DIRECTIONS[this.rotation];
        return {
            x: this.x + dir.x * CONFIG.GRID_SIZE,
            y: this.y + dir.y * CONFIG.GRID_SIZE
        };
    }
}
//# sourceMappingURL=Merger.js.map