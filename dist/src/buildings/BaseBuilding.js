import { CONFIG } from '../config';
/**
 * 모든 건물의 기반 클래스
 */
export default class BaseBuilding {
    constructor(scene, x, y, type, config = {}) {
        const bConfig = CONFIG.BUILDINGS[type];
        if (!bConfig) {
            const validTypes = Object.keys(CONFIG.BUILDINGS).join(', ');
            throw new Error(`[BaseBuilding] Invalid building type: "${type}". Valid types are: [${validTypes}]`);
        }
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.type = type;
        this.rotation = config.rotation || 0;
        const w = bConfig.WIDTH || 1;
        const h = bConfig.HEIGHT || 1;
        this.container = scene.add.container(x + (w * CONFIG.GRID_SIZE) / 2, y + (h * CONFIG.GRID_SIZE) / 2);
        this.graphics = scene.add.graphics();
        this.graphics.fillStyle(config.color || 0xaaaaaa, 1);
        this.graphics.fillRect(-(w * CONFIG.GRID_SIZE) / 2, -(h * CONFIG.GRID_SIZE) / 2, w * CONFIG.GRID_SIZE, h * CONFIG.GRID_SIZE);
        this.container.add(this.graphics);
        this.inputBuffer = [];
        this.outputBuffer = [];
        this.maxBufferSize = bConfig.MAX_BUFFER || config.maxBufferSize || 5;
        this.hasPower = true;
    }
    canAcceptItem(_type) {
        return false;
    }
    acceptItem(itemType) {
        if (this.canAcceptItem(itemType)) {
            this.inputBuffer.push(itemType);
            return true;
        }
        return false;
    }
    popOutput() {
        return this.outputBuffer.shift();
    }
    onTick(_tickCount, _occupiedPositions) {
        // Override in subclass
    }
    getNextPosition(item, currentTick) {
        return null;
    }
    destroy() {
        if (this.container) {
            this.container.destroy();
        }
    }
}
//# sourceMappingURL=BaseBuilding.js.map