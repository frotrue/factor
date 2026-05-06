import Phaser from 'phaser';
import { CONFIG } from '../config.js';

export default class BaseBuilding {
    constructor(scene, x, y, type, config = {}) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.gridX = x;
        this.gridY = y;
        this.type = type;
        this.rotation = config.rotation || 0; // 0:R, 1:D, 2:L, 3:U
        this.gridSize = CONFIG.GRID_SIZE;

        // 시각적 요소 (Phaser Container)
        this.container = scene.add.container(x, y);
        this.container.setDepth(10);

        this.initGraphics(config.color || 0xcccccc);
    }

    initGraphics(color) {
        // 베이스 배경
        this.rect = this.scene.add.graphics();
        this.rect.fillStyle(color, 1);
        this.rect.fillRect(0, 0, this.gridSize, this.gridSize);
        this.rect.lineStyle(1, 0xffffff, 0.3);
        this.rect.strokeRect(0, 0, this.gridSize, this.gridSize);
        this.container.add(this.rect);

        // 방향 화살표
        this.arrow = this.scene.add.triangle(
            this.gridSize / 2, this.gridSize / 2,
            8, 0, 0, 8, 0, -8,
            0xffffff, 0.5
        );
        this.updateRotationDisplay();
        this.container.add(this.arrow);
    }

    updateRotationDisplay() {
        const angles = [0, 90, 180, 270];
        if (this.arrow) {
            this.arrow.setAngle(angles[this.rotation]);
        }
    }

    // 매 틱마다 실행될 로직 (서브클래스에서 구현)
    onTick(tickCount, occupiedPositions) {
        // 기본적으로는 아무것도 하지 않음
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
        }
    }
}
