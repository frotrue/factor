import Miner from './Miner.js';
import Conveyor from './Conveyor.js';
import Processor from './Processor.js';
import Core from './Core.js';
import PowerPlant from './PowerPlant.js';
import PowerNode from './PowerNode.js';
import Storage from './Storage.js';
import Unloader from './Unloader.js';

// 타입 문자열 → 클래스 매핑 레지스트리
const REGISTRY = {
    MINER: Miner,
    CONVEYOR: Conveyor,
    PROCESSOR: Processor,
    CORE: Core,
    POWER_PLANT: PowerPlant,
    POWER_NODE: PowerNode,
    STORAGE: Storage,
    UNLOADER: Unloader
};

/**
 * CONFIG 기반 건물 생성 팩토리
 * 새 건물 추가 시: 클래스 작성 → REGISTRY에 등록 → CONFIG.BUILDINGS에 데이터 추가
 */
export function createBuilding(scene, x, y, type, config = {}) {
    const BuildingClass = REGISTRY[type];
    if (!BuildingClass) {
        console.warn(`Unknown building type: ${type}`);
        return null;
    }
    return new BuildingClass(scene, x, y, config);
}

export function registerBuilding(type, BuildingClass) {
    REGISTRY[type] = BuildingClass;
}
