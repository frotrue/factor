import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
export default class SolarPanel extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'SOLAR_PANEL', { ...config, color: CONFIG.BUILDINGS.SOLAR_PANEL.COLOR });
        this.coreGraphics = scene.add.rectangle(0, 0, 16, 16, 0x0ea5e9);
        this.container.add(this.coreGraphics);
        scene.tweens.add({
            targets: this.coreGraphics,
            alpha: 0.6,
            yoyo: true,
            repeat: -1,
            duration: 2000
        });
    }
    canAcceptItem() {
        return false;
    }
    onTick(_tickCount) {
        // 실제 발전 로직은 PowerManager에서 일괄 처리
    }
}
//# sourceMappingURL=SolarPanel.js.map