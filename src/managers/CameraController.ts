import Phaser from 'phaser';
import { CONFIG } from '../config';

export default class CameraController {
    scene: Phaser.Scene;
    camera: Phaser.Cameras.Scene2D.Camera;
    moveSpeed: number;
    keys: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        this.moveSpeed = 10;

        this.keys = scene.input.keyboard!.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        }) as any;

        this.setup();
    }

    setup(): void {
        this.camera.setZoom(CONFIG.CAMERA.DEFAULT_ZOOM);

        this.scene.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
            let newZoom = this.camera.zoom + (deltaY > 0 ? -0.1 : 0.1);
            this.camera.zoom = Phaser.Math.Clamp(newZoom, CONFIG.CAMERA.MIN_ZOOM, CONFIG.CAMERA.MAX_ZOOM);
        });

        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.middleButtonDown()) {
                this.camera.scrollX -= (pointer.x - pointer.prevPosition.x) / this.camera.zoom;
                this.camera.scrollY -= (pointer.y - pointer.prevPosition.y) / this.camera.zoom;
            }
        });
    }

    update(): void {
        const zoom = this.camera.zoom;
        const speed = this.moveSpeed / zoom;

        if (this.keys.left.isDown) this.camera.scrollX -= speed;
        if (this.keys.right.isDown) this.camera.scrollX += speed;
        if (this.keys.up.isDown) this.camera.scrollY -= speed;
        if (this.keys.down.isDown) this.camera.scrollY += speed;
    }
}
