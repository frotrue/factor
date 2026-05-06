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

    onTick(tickCount, occupiedPositions) {
        if (tickCount % this.productionRate === 0) {
            this.scene.tryProduceItem(this, occupiedPositions);
        }
    }
}
