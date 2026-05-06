import BaseBuilding from './BaseBuilding.js';
import { CONFIG } from '../config.js';

export default class Conveyor extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'Conveyor', { 
            ...config, 
            color: CONFIG.BUILDINGS.CONVEYOR.COLOR 
        });
    }

    // 컨베이어는 아이템 이동 로직을 직접 처리하기보다 
    // 방향 정보만 제공하고 MainScene의 아이템 관리 루프에서 처리하는 것이 효율적일 수 있습니다.
    // 하지만 추후 특수 컨베이어(고속, 필터 등)를 위해 메서드 공간을 비워둡니다.
    onTick(tickCount, occupiedPositions) {
        // 기본 컨베이어는 특별한 틱 동작이 필요 없을 수 있음
    }
}
