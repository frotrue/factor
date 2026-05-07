import BaseBuilding from './BaseBuilding.js';
import { CONFIG } from '../config.js';

export default class PowerPlant extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'POWER_PLANT', { 
            ...config, 
            color: CONFIG.BUILDINGS.POWER_PLANT.COLOR 
        });

        // 애니메이션 효과를 위한 그래픽 (깜빡이는 코어)
        this.coreGraphics = scene.add.circle(0, 0, 4, 0xffffff);
        this.container.add(this.coreGraphics);

        // 발전소는 ENERGY 자원 위에서만 동작한다고 가정
        this.isActive = false;
        this.checkPlacement();
    }

    checkPlacement() {
        const resourceType = this.scene.mapManager.getResourceAt(this.x, this.y);
        this.isActive = (resourceType === 'ENERGY');
        if (!this.isActive) {
            this.coreGraphics.setFillStyle(0xff0000); // 잘못된 배치
        } else {
            // 발전 애니메이션
            this.scene.tweens.add({
                targets: this.coreGraphics,
                alpha: 0.2,
                yoyo: true,
                repeat: -1,
                duration: 500
            });
        }
    }

    // 아이템을 받지 않음
    canAcceptItem() {
        return false;
    }

    onTick(tickCount) {
        // 실제 발전 로직은 PowerManager에서 일괄 처리
    }
}
