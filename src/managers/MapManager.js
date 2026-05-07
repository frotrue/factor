import { CONFIG } from '../config.js';

/**
 * 맵 자원 매립지 관리 매니저
 * 자원 위치 데이터 및 조회 전담
 */
export default class MapManager {
    constructor() {
        this.resourceMap = new Map(); // key: "x,y", value: 'RAW_DATA' | 'SILICON' | 'ENERGY'
        this.gridSize = CONFIG.GRID_SIZE;
    }

    generateResourcePatches() {
        // 초기 자원들 배치 (시작 지점 근처)
        this.addPatch(2, 2, 4, 'RAW_DATA');
        this.addPatch(-6, 3, 3, 'SILICON');
        this.addPatch(4, -5, 3, 'ENERGY');
    }

    addPatch(startX, startY, size, type) {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const x = (startX + i) * this.gridSize;
                const y = (startY + j) * this.gridSize;
                this.resourceMap.set(`${x},${y}`, type);
            }
        }
    }

    getResourceAt(x, y) {
        return this.resourceMap.get(`${x},${y}`) || null;
    }

    getResourceAtKey(key) {
        return this.resourceMap.get(key) || null;
    }

    getResourceMap() {
        return this.resourceMap;
    }
}
