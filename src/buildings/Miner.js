import BaseBuilding from './BaseBuilding.js';
import { CONFIG } from '../config.js';

export default class Miner extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'Miner', { 
            ...config, 
            color: CONFIG.BUILDINGS.MINER.COLOR 
        });
        this.productionRate = CONFIG.BUILDINGS.MINER.PRODUCTION_RATE;
    }

    shouldProduce(tickCount) {
        return tickCount % this.productionRate === 0;
    }

    onTick(tickCount, occupiedPositions) {
        // 생산 로직은 TickSystem에서 shouldProduce를 체크하여 처리함
    }
}
