import Miner from './Miner.js';
import Conveyor from './Conveyor.js';

// 타입 문자열 → 클래스 매핑 레지스트리
const REGISTRY = {
    MINER: Miner,
    CONVEYOR: Conveyor
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
