import Phaser from 'phaser';
import { CONFIG } from '../config';
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
        this.scene.input.on('wheel', (pointer, _gameObjects, _deltaX, deltaY) => {
            const cam = this.camera;
            const oldZoom = cam.zoom;
            // Continuous zoom delta
            const zoomDelta = -deltaY * 0.001;
            let newZoom = Phaser.Math.Clamp(oldZoom + zoomDelta, CONFIG.CAMERA.MIN_ZOOM, CONFIG.CAMERA.MAX_ZOOM);
            if (oldZoom === newZoom)
                return;
            // Use activePointer to ensure we have the latest screen coordinates
            const mouse = this.scene.input.activePointer;
            // Screen center offsets (Phaser cameras zoom relative to their center by default)
            const halfWidth = cam.width / 2;
            const halfHeight = cam.height / 2;
            // Calculate the world point under the mouse cursor BEFORE zooming
            // world = (screen - screenCenter) / zoom + scroll + screenCenter
            const worldX = (mouse.x - halfWidth) / oldZoom + cam.scrollX + halfWidth;
            const worldY = (mouse.y - halfHeight) / oldZoom + cam.scrollY + halfHeight;
            // Apply the new zoom
            cam.setZoom(newZoom);
            // Adjust scroll to keep that world point under the mouse cursor AFTER zooming
            // scroll = world - screenCenter - (screen - screenCenter) / zoom
            cam.scrollX = worldX - halfWidth - (mouse.x - halfWidth) / newZoom;
            cam.scrollY = worldY - halfHeight - (mouse.y - halfHeight) / newZoom;
        });
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
        if (this.keys.left.isDown)
            this.camera.scrollX -= speed;
        if (this.keys.right.isDown)
            this.camera.scrollX += speed;
        if (this.keys.up.isDown)
            this.camera.scrollY -= speed;
        if (this.keys.down.isDown)
            this.camera.scrollY += speed;
    }
}
//# sourceMappingURL=CameraController.js.map