import Phaser from 'phaser';
import { CONFIG, CORE_KEY } from '../config';
import { IMainScene } from '../types';

export default class CameraController {
    scene: IMainScene;
    camera: Phaser.Cameras.Scene2D.Camera;
    moveSpeed: number;
    keys: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
    lastPinchDistance: number | null;

    constructor(scene: IMainScene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        this.moveSpeed = 10;
        this.lastPinchDistance = null;

        this.keys = scene.input.keyboard!.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        }) as { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };

        this.setup();
    }

    setup(): void {
        const isMobile = this.scene.isMobileLayout;
        this.camera.setZoom(isMobile ? 1 : CONFIG.CAMERA.DEFAULT_ZOOM);
        this.applyBounds();

        this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
            const cam = this.camera;
            const oldZoom = cam.zoom;
            
            // Continuous zoom delta
            const zoomDelta = -deltaY * 0.001;
            let newZoom = Phaser.Math.Clamp(oldZoom + zoomDelta, CONFIG.CAMERA.MIN_ZOOM, CONFIG.CAMERA.MAX_ZOOM);
            
            if (oldZoom === newZoom) return;

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
            this.clampToBounds();
        });

        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.handlePinchZoom()) return;

            const isMobileLayout = this.scene.isMobileLayout;
            const secondPointerActive = Boolean(this.scene.input.pointer2?.isDown);
            const shouldPan = pointer.middleButtonDown() || (isMobileLayout && pointer.isDown && !secondPointerActive);
            if (shouldPan) {
                this.camera.scrollX -= (pointer.x - pointer.prevPosition.x) / this.camera.zoom;
                this.camera.scrollY -= (pointer.y - pointer.prevPosition.y) / this.camera.zoom;
                this.clampToBounds();
            }
        });

        this.scene.input.on('pointerup', () => {
            this.lastPinchDistance = null;
        });
    }

    centerOnCore(): void {
        const core = this.scene.buildingManager.get(CORE_KEY);
        if (!core) return;

        this.camera.centerOn(core.container.x, core.container.y);
        this.clampToBounds();
    }

    handlePinchZoom(): boolean {
        if (!this.scene.isMobileLayout) return false;

        const pointer1 = this.scene.input.pointer1;
        const pointer2 = this.scene.input.pointer2;
        if (!pointer1?.isDown || !pointer2?.isDown) {
            this.lastPinchDistance = null;
            return false;
        }

        const distance = Phaser.Math.Distance.Between(pointer1.x, pointer1.y, pointer2.x, pointer2.y);
        if (!this.lastPinchDistance) {
            this.lastPinchDistance = distance;
            return true;
        }

        const oldZoom = this.camera.zoom;
        const zoomDelta = (distance - this.lastPinchDistance) * 0.006;
        const newZoom = Phaser.Math.Clamp(oldZoom + zoomDelta, 0.45, CONFIG.CAMERA.MAX_ZOOM);
        if (newZoom !== oldZoom) {
            this.camera.setZoom(newZoom);
            this.clampToBounds();
        }
        this.lastPinchDistance = distance;
        return true;
    }

    update(): void {
        if (this.scene.isMobileLayout) return;

        const zoom = this.camera.zoom;
        const speed = this.moveSpeed / zoom;

        if (this.keys.left.isDown) this.camera.scrollX -= speed;
        if (this.keys.right.isDown) this.camera.scrollX += speed;
        if (this.keys.up.isDown) this.camera.scrollY -= speed;
        if (this.keys.down.isDown) this.camera.scrollY += speed;
        this.clampToBounds();
    }

    applyBounds(): void {
        // We do not use Phaser's internal setBounds because it fights with zoom levels and prevents centering on edges.
        // Instead, we handle bounds clamping dynamically in clampToBounds.
    }

    clampToBounds(): void {
        const bounds = this.scene.mapManager?.getCameraBoundsPixels?.();
        if (!bounds) return;

        const viewWidth = this.camera.width / this.camera.zoom;
        const viewHeight = this.camera.height / this.camera.zoom;

        const centerX = this.camera.scrollX + viewWidth / 2;
        const centerY = this.camera.scrollY + viewHeight / 2;

        const minCenterX = bounds.x;
        const maxCenterX = bounds.x + bounds.width;
        const minCenterY = bounds.y;
        const maxCenterY = bounds.y + bounds.height;

        const clampedCenterX = Phaser.Math.Clamp(centerX, minCenterX, maxCenterX);
        const clampedCenterY = Phaser.Math.Clamp(centerY, minCenterY, maxCenterY);

        this.camera.scrollX = clampedCenterX - viewWidth / 2;
        this.camera.scrollY = clampedCenterY - viewHeight / 2;
    }
}
