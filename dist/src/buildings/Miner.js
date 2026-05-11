import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
export default class Miner extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'MINER', { ...config, color: CONFIG.BUILDINGS.MINER.COLOR });
        this.productionRate = CONFIG.BUILDINGS.MINER.PRODUCTION_RATE || 2;
    }
    shouldProduce(tickCount) {
        return tickCount % this.productionRate === 0;
    }
    onTick(tickCount) {
        if (tickCount % this.productionRate === 0) {
            if (this.outputBuffer.length >= this.maxBufferSize)
                return;
            const mapManager = this.scene.mapManager;
            const resourceType = mapManager.getResourceAt(this.x, this.y);
            if (resourceType) {
                this.outputBuffer.push(resourceType);
            }
        }
    }
}
//# sourceMappingURL=Miner.js.map