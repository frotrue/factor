import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import Storage from './Storage';
import { BuildingOptions, IMainScene } from '../types';
import { getCategoryColor } from '../visuals/visualTheme';

export default class Unloader extends BaseBuilding {
    selectedType: string | null;
    unloaderGraphics: Phaser.GameObjects.Graphics;
    pistonProgress: number;
    unloaderTween: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'UNLOADER', { ...config, color: CONFIG.BUILDINGS.UNLOADER.COLOR });
        this.selectedType = null;

        this.unloaderGraphics = scene.add.graphics();
        this.container.add(this.unloaderGraphics);
        this.unloaderGraphics.angle = CONFIG.DIRECTIONS[this.rotation]?.angle || 0;

        this.pistonProgress = 0.5;
        this.unloaderTween = scene.tweens.add({
            targets: this,
            pistonProgress: 1.0,
            duration: 600,
            yoyo: true,
            repeat: -1,
            onUpdate: () => this.drawPiston()
        });
    }

    drawPiston(): void {
        if (this.shouldThrottleVisuals()) return;
        this.unloaderGraphics.clear();
        if (this.destroyed) return;

        const accent = getCategoryColor(CONFIG.BUILDINGS[this.type]?.CATEGORY) || 0xf43f5e;
        const progress = this.pistonProgress;

        const tailX = -10;
        const headX = 12 * progress;
        const width = 6;

        // Piston shaft
        this.unloaderGraphics.lineStyle(4, accent, 0.35);
        this.unloaderGraphics.lineBetween(tailX, 0, headX - 4, 0);
        this.unloaderGraphics.lineStyle(1.5, 0xffffff, 0.8);
        this.unloaderGraphics.lineBetween(tailX, 0, headX - 4, 0);

        // Arrow head
        this.unloaderGraphics.fillStyle(accent, 0.45);
        this.unloaderGraphics.lineStyle(1.5, 0xffffff, 0.9);
        this.unloaderGraphics.beginPath();
        this.unloaderGraphics.moveTo(headX - 6, -width);
        this.unloaderGraphics.lineTo(headX, 0);
        this.unloaderGraphics.lineTo(headX - 6, width);
        this.unloaderGraphics.closePath();
        this.unloaderGraphics.fillPath();
        this.unloaderGraphics.strokePath();

        // Outer brackets
        this.unloaderGraphics.lineStyle(2, accent, 0.25);
        this.unloaderGraphics.strokeRect(-13, -13, 26, 26);
    }

    canAcceptItem(): boolean {
        return false;
    }

    onTick(_tickCount: number): void {
        const dir = CONFIG.DIRECTIONS[this.rotation];
        const backX = this.x - dir.x * CONFIG.GRID_SIZE;
        const backY = this.y - dir.y * CONFIG.GRID_SIZE;
        const buildingManager = (this.scene as IMainScene).buildingManager;
        const backBuilding = buildingManager.get(`${backX},${backY}`);

        if (backBuilding && backBuilding.type === 'STORAGE') {
            if (this.outputBuffer.length === 0) {
                const storage = backBuilding as Storage;
                if (storage.inputBuffer.length > 0) {
                    let indexToExtract = 0;
                    if (this.selectedType) {
                        indexToExtract = storage.inputBuffer.indexOf(this.selectedType);
                    }
                    if (indexToExtract !== -1) {
                        const itemType = storage.inputBuffer.splice(indexToExtract, 1)[0];
                        this.outputBuffer.push(itemType);
                        storage.amountText.setText(storage.inputBuffer.length.toString());
                        storage.drawCapacityGauge();
                    }
                }
            }
        }
    }

    destroy(): void {
        if (this.unloaderTween) {
            this.unloaderTween.remove();
        }
        super.destroy();
    }
}
