import Phaser from 'phaser';
import { CONFIG } from '../config.js';

/**
 * 카메라 제어 컨트롤러
 * 줌 + 팬(중간 버튼 드래그) 처리
 */
export default class CameraController {
    constructor(scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;

        this.setup();
    }

    setup() {
        this.camera.setZoom(CONFIG.CAMERA.DEFAULT_ZOOM);

        // 마우스 휠 줌
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            let newZoom = this.camera.zoom + (deltaY > 0 ? -0.1 : 0.1);
            this.camera.zoom = Phaser.Math.Clamp(newZoom, CONFIG.CAMERA.MIN_ZOOM, CONFIG.CAMERA.MAX_ZOOM);
        });

        // 중간 버튼 드래그 팬
        this.scene.input.on('pointermove', (pointer) => {
            if (pointer.middleButtonDown()) {
                this.camera.scrollX -= (pointer.x - pointer.prevPosition.x) / this.camera.zoom;
                this.camera.scrollY -= (pointer.y - pointer.prevPosition.y) / this.camera.zoom;
            }
        });
    }
}
