import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
export default class PowerPlant extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'POWER_PLANT', { ...config, color: CONFIG.BUILDINGS.POWER_PLANT.COLOR });
        this.coreGraphics = scene.add.circle(0, 0, 4, 0xffffff);
        this.container.add(this.coreGraphics);
        this.isActive = false;
        this.checkPlacement();
    }
    checkPlacement() {
        const mapManager = this.scene.mapManager;
        const resourceType = mapManager.getResourceAt(this.x, this.y);
        this.isActive = (resourceType === 'ENERGY');
        if (!this.isActive) {
            this.coreGraphics.setFillStyle(0xff0000);
        }
        else {
            this.scene.tweens.add({
                targets: this.coreGraphics,
                alpha: 0.2,
                yoyo: true,
                repeat: -1,
                duration: 500
            });
        }
    }
    canAcceptItem() {
        return false;
    }
    onTick(_tickCount) {
        // 실제 발전 로직은 PowerManager에서 일괄 처리
    }
}
//# sourceMappingURL=PowerPlant.js.map