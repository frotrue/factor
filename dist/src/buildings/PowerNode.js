import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
export default class PowerNode extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'POWER_NODE', { ...config, color: CONFIG.BUILDINGS.POWER_NODE.COLOR });
        this.antenna = scene.add.rectangle(0, -5, 4, 10, 0xffffff);
        this.container.add(this.antenna);
    }
    canAcceptItem() {
        return false;
    }
    onTick(_tickCount) {
        // 전력망 연산은 PowerManager에서 수행
    }
}
//# sourceMappingURL=PowerNode.js.map