import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import EventBus from '../managers/EventBus';
export default class Core extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'CORE', { ...config, color: CONFIG.BUILDINGS.CORE.COLOR });
        this.totalDataReceived = 0;
        this.confidenceScore = 0;
        this.maxHp = CONFIG.BUILDINGS.CORE.HP || 1000;
        this.hp = this.maxHp;
        this.hpBar = scene.add.graphics();
        this.container.add(this.hpBar);
        this.drawHpBar();
        EventBus.on('CORE_DAMAGED', ({ amount }) => {
            this.hp -= amount;
            this.drawHpBar();
            if (this.hp <= 0) {
                this.hp = 0;
                EventBus.emit('GAME_OVER');
            }
        });
    }
    drawHpBar() {
        this.hpBar.clear();
        const width = CONFIG.GRID_SIZE;
        const height = 4;
        const percent = Math.max(0, this.hp / this.maxHp);
        this.hpBar.fillStyle(0xff0000, 1);
        this.hpBar.fillRect(-width / 2, -CONFIG.GRID_SIZE / 2 - 6, width, height);
        this.hpBar.fillStyle(0x00ff00, 1);
        this.hpBar.fillRect(-width / 2, -CONFIG.GRID_SIZE / 2 - 6, width * percent, height);
    }
    canAcceptItem(_type) {
        return true;
    }
    acceptItem(itemType) {
        this.totalDataReceived++;
        if (itemType === 'WEIGHT_UPDATE') {
            this.confidenceScore += 10;
        }
        else if (itemType === 'LABELED_DATA') {
            this.confidenceScore += 2;
        }
        else {
            this.confidenceScore += 0.1;
        }
        EventBus.emit('CORE_DATA_RECEIVED', {
            type: itemType,
            score: this.confidenceScore,
            total: this.totalDataReceived
        });
        return true;
    }
    onTick(_tickCount) {
        // 추후 자가 수리나 특수 능력
    }
}
//# sourceMappingURL=Core.js.map