import BaseBuilding from './BaseBuilding.js';
import { CONFIG } from '../config.js';
import EventBus from '../managers/EventBus.js';

export default class Core extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'CORE', { 
            ...config, 
            color: CONFIG.BUILDINGS.CORE.COLOR 
        });
        
        this.totalDataReceived = 0;
        this.confidenceScore = 0;
    }

    // 메인 서버는 모든 아이템을 수락하고 즉시 처리함
    canAcceptItem(type) {
        return true;
    }

    acceptItem(itemType) {
        this.totalDataReceived++;
        
        // 특정 아이템일 경우 점수 가중치 부여
        if (itemType === 'WEIGHT_UPDATE') {
            this.confidenceScore += 10;
        } else if (itemType === 'LABELED_DATA') {
            this.confidenceScore += 2;
        } else {
            this.confidenceScore += 0.1;
        }

        EventBus.emit('CORE_DATA_RECEIVED', { 
            type: itemType, 
            score: this.confidenceScore,
            total: this.totalDataReceived 
        });
        return true;
    }

    onTick(tickCount) {
        // 메인 서버는 별도의 생산 로직은 없으나 
        // 추후 자가 수리나 특수 능력을 위해 비워둠
    }
}
