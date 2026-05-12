import { CONFIG } from '../config';

export default class MapManager {
    resourceMap: Map<string, string>;
    gridSize: number;

    constructor() {
        this.resourceMap = new Map();
        this.gridSize = CONFIG.GRID_SIZE;
    }

    generateResourcePatches(): void {
        this.resourceMap.clear();
        const types = ['SILICON', 'ENERGY'];
        const numPatches = Math.floor(Math.random() * 8) + 8;

        for (let i = 0; i < numPatches; i++) {
            const type = i < types.length ? types[i] : types[Math.floor(Math.random() * types.length)];
            let startX: number, startY: number, isSafeZone: boolean;
            do {
                startX = Math.floor(Math.random() * 61) - 30;
                startY = Math.floor(Math.random() * 61) - 30;
                isSafeZone = Math.abs(startX) < 4 && Math.abs(startY) < 4;
            } while (isSafeZone);

            const size = Math.floor(Math.random() * 4) + 2;
            this.addPatch(startX, startY, size, type);
        }
    }

    addPatch(startX: number, startY: number, size: number, type: string): void {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const x = (startX + i) * this.gridSize;
                const y = (startY + j) * this.gridSize;
                this.resourceMap.set(`${x},${y}`, type);
            }
        }
    }

    getResourceAt(x: number, y: number): string | null {
        return this.resourceMap.get(`${x},${y}`) || null;
    }

    getResourceAtKey(key: string): string | null {
        return this.resourceMap.get(key) || null;
    }

    getResourceMap(): Map<string, string> {
        return this.resourceMap;
    }
}
