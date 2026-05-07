import BaseBuilding from './BaseBuilding.js';
import { CONFIG } from '../config.js';

export default class Miner extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'MINER', { 
            ...config, 
            color: CONFIG.BUILDINGS.MINER.COLOR 
        });
        this.productionRate = CONFIG.BUILDINGS.MINER.PRODUCTION_RATE;
    }

    shouldProduce(tickCount) {
        return tickCount % this.productionRate === 0;
    }

    onTick(tickCount, occupiedPositions) {
        if (tickCount % this.productionRate === 0) {
            if (this.outputBuffer.length >= this.maxBufferSize) return; // 무한 버퍼 증식 방지 (Fix 1)
            
            const resourceType = this.scene.mapManager.getResourceAt(this.x, this.y);
            if (resourceType) {
                this.outputBuffer.push(resourceType);
            }
        }
    }
}
