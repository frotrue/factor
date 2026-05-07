import Phaser from 'phaser';
import { CONFIG } from '../config.js';

export default class BaseBuilding {
    constructor(scene, x, y, type, config = {}) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.type = type;
        this.rotation = config.rotation || 0;

        const bConfig = CONFIG.BUILDINGS[type] || {};
        const w = bConfig.WIDTH || 1;
        const h = bConfig.HEIGHT || 1;

        // 컨테이너 생성 및 픽셀 보정
        this.container = scene.add.container(x + (w * CONFIG.GRID_SIZE) / 2, y + (h * CONFIG.GRID_SIZE) / 2);
        
        // 기본 도형 (상속받는 클래스에서 오버라이드 가능)
        this.graphics = scene.add.graphics();
        this.graphics.fillStyle(config.color || 0xaaaaaa, 1);
        this.graphics.fillRect(-(w * CONFIG.GRID_SIZE)/2, -(h * CONFIG.GRID_SIZE)/2, w * CONFIG.GRID_SIZE, h * CONFIG.GRID_SIZE);


        this.container.add(this.graphics);

        // 입출력 버퍼
        this.inputBuffer = [];
        this.outputBuffer = [];
        this.maxBufferSize = bConfig.MAX_BUFFER || config.maxBufferSize || 5;
        this.hasPower = true;
    }

    // 아이템 수락 가능 여부 확인 (기본값: false, 가공소 등에서 오버라이드)
    canAcceptItem(type) {
        return false;
    }

    // 아이템 투입
    acceptItem(itemType) {
        if (this.canAcceptItem(itemType)) {
            this.inputBuffer.push(itemType);
            return true;
        }
        return false;
    }

    // 출력 버퍼에서 아이템 하나 꺼내기
    popOutput() {
        return this.outputBuffer.shift();
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
