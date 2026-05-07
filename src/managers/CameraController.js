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
        this.moveSpeed = 10;

        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

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

    update() {
        const zoom = this.camera.zoom;
        const speed = this.moveSpeed / zoom;

        if (this.keys.left.isDown) this.camera.scrollX -= speed;
        if (this.keys.right.isDown) this.camera.scrollX += speed;
        if (this.keys.up.isDown) this.camera.scrollY -= speed;
        if (this.keys.down.isDown) this.camera.scrollY += speed;
    }
}
