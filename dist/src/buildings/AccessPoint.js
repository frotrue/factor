import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
export default class AccessPoint extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'ACCESS_POINT', { ...config, color: CONFIG.ACCESS_POINT.COLOR });
        this.range = CONFIG.ACCESS_POINT.RANGE;
        this.bandwidth = CONFIG.ACCESS_POINT.BANDWIDTH;
        // 시각 효과: 와이파이 모양 애니메이션
        const radius = this.range * CONFIG.GRID_SIZE;
        const wave = scene.add.circle(0, 0, 10, 0xffffff, 0.5);
        this.container.add(wave);
        scene.tweens.add({
            targets: wave,
            radius: radius,
            alpha: 0,
            duration: 2000,
            repeat: -1,
            ease: 'Sine.easeOut'
        });
    }
    // AP 자체는 아이템을 받지 않고, CableManager가 범위 내 노드간 데이터를 중계합니다.
    canAcceptItem(_type) {
        return false;
    }
}
//# sourceMappingURL=AccessPoint.js.map