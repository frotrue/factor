import { CONFIG } from '../config.js';
import EventBus from './EventBus.js';

export default class ItemManager {
    constructor(scene) {
        this.scene = scene;
        this.items = []; // 현재 맵에 있는 활성 아이템들

        // Phaser Group을 이용한 오브젝트 풀링
        this.pool = scene.add.group({
            maxSize: 2000 
        });

        // 고아 아이템(Orphan Items) 처리 (Fix 5)
        EventBus.on('BUILDING_REMOVED', ({ key }) => {
            const [x, y] = key.split(',').map(Number);
            const orphanItems = this.items.filter(item => item.gridX === x && item.gridY === y);
            orphanItems.forEach(item => this.despawn(item));
        });
    }

    // 아이템 생성
    spawn(gridX, gridY, type = 'RAW_DATA') {
        const x = gridX + CONFIG.GRID_SIZE / 2;
        const y = gridY + CONFIG.GRID_SIZE / 2;
        
        const itemConfig = CONFIG.ITEMS[type] || CONFIG.ITEMS.RAW_DATA;

        // 풀에서 비활성 객체 찾기
        let sprite = this.pool.getFirstDead(false);

        if (!sprite) {
            sprite = this.scene.add.circle(x, y, itemConfig.RADIUS, itemConfig.COLOR);
            sprite.setStrokeStyle(2, 0xffffff);
            sprite.setDepth(20);
            this.pool.add(sprite);
        } else {
            // 재사용 및 상태 초기화
            sprite.setActive(true);
            sprite.setVisible(true);
            sprite.setPosition(x, y);
            sprite.setFillStyle(itemConfig.COLOR);
            sprite.setRadius(itemConfig.RADIUS);
        }

        const item = {
            gridX,
            gridY,
            sprite,
            type
        };

        this.items.push(item);
        return item;
    }

    // 아이템 제거
    despawn(item) {
        // 트윈 애니메이션 강제 종료 (Fix 4)
        if (this.scene && this.scene.tweens) {
            this.scene.tweens.killTweensOf(item.sprite);
        }

        item.sprite.setActive(false);
        item.sprite.setVisible(false);
        // pool.killAndHide()는 sprite를 비활성화하고 숨깁니다.
        this.pool.killAndHide(item.sprite);
        
        const index = this.items.indexOf(item);
        if (index > -1) {
            this.items.splice(index, 1);
        }
    }

    getItems() {
        return this.items;
    }
}
