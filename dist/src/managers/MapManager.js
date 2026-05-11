import { CONFIG } from '../config';
export default class MapManager {
    constructor() {
        this.resourceMap = new Map();
        this.gridSize = CONFIG.GRID_SIZE;
    }
    generateResourcePatches() {
        this.resourceMap.clear();
        const types = ['RAW_DATA', 'SILICON', 'ENERGY'];
        const numPatches = Math.floor(Math.random() * 8) + 8;
        for (let i = 0; i < numPatches; i++) {
            const type = i < types.length ? types[i] : types[Math.floor(Math.random() * types.length)];
            let startX, startY, isSafeZone;
            do {
                startX = Math.floor(Math.random() * 61) - 30;
                startY = Math.floor(Math.random() * 61) - 30;
                isSafeZone = Math.abs(startX) < 4 && Math.abs(startY) < 4;
            } while (isSafeZone);
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
//# sourceMappingURL=MapManager.js.map