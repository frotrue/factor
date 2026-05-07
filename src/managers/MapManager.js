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
        this.resourceMap.clear();

        const types = ['RAW_DATA', 'SILICON', 'ENERGY'];
        const numPatches = Math.floor(Math.random() * 8) + 8; // 8 ~ 15 patches

        // Ensure at least one of each type is created
        for (let i = 0; i < numPatches; i++) {
            const type = i < types.length ? types[i] : types[Math.floor(Math.random() * types.length)];
            
            // Random position (-30 to +30 grid cells)
            let startX, startY, isSafeZone;
            do {
                startX = Math.floor(Math.random() * 61) - 30;
                startY = Math.floor(Math.random() * 61) - 30;
                
                // Safe zone check (distance from 0,0 should be >= 4)
                isSafeZone = Math.abs(startX) < 4 && Math.abs(startY) < 4;
            } while (isSafeZone);

            // Random size (2x2 to 5x5)
            const size = Math.floor(Math.random() * 4) + 2; 

            this.addPatch(startX, startY, size, type);
        }
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
