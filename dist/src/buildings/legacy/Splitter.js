import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
export default class Splitter extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'SPLITTER', { ...config, color: CONFIG.BUILDINGS.SPLITTER.COLOR });
        // Restore custom state if exists
        this.toggleState = config.customState?.toggleState || false;
        const arrow1 = scene.add.triangle(0, -5, 6, 0, 0, 6, 0, -6, 0xffffff);
        const arrow2 = scene.add.triangle(5, 5, 6, 0, 0, 6, 0, -6, 0xffffff);
        arrow2.setAngle(90);
        this.container.add([arrow1, arrow2]);
    }
    getNextPosition(item, currentTick) {
        // Alternates between forward (rotation) and right (rotation + 1)
        const targetRotation = this.toggleState ? this.rotation : (this.rotation + 1) % 4;
        this.toggleState = !this.toggleState;
        const dir = CONFIG.DIRECTIONS[targetRotation];
        return {
            x: this.x + dir.x * CONFIG.GRID_SIZE,
            y: this.y + dir.y * CONFIG.GRID_SIZE
        };
    }
    getCustomState() {
        return { toggleState: this.toggleState };
    }
}
//# sourceMappingURL=Splitter.js.map