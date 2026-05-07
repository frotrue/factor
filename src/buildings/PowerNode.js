import BaseBuilding from './BaseBuilding.js';
import { CONFIG } from '../config.js';

export default class PowerNode extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'POWER_NODE', { 
            ...config, 
            color: CONFIG.BUILDINGS.POWER_NODE.COLOR 
        });

        // 안테나 모양 시각 효과
        this.antenna = scene.add.rectangle(0, -5, 4, 10, 0xffffff);
        this.container.add(this.antenna);
    }

    canAcceptItem() {
        return false; // 송신탑은 아이템을 받지 않음
    }

    onTick(tickCount) {
        // 전력망 연산은 PowerManager에서 수행
    }
}
