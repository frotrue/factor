import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';

export default class AccessPoint extends BaseBuilding {
    range: number;
    bandwidth: number;
    statusText: Phaser.GameObjects.Text;
    wave: Phaser.GameObjects.Arc;
    waveTween: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'ACCESS_POINT', { ...config, color: CONFIG.ACCESS_POINT.COLOR });

        this.range = CONFIG.ACCESS_POINT.RANGE;
        this.bandwidth = CONFIG.ACCESS_POINT.BANDWIDTH;

        const radius = this.range * CONFIG.GRID_SIZE;
        this.wave = scene.add.circle(0, 0, 10, 0xffffff, 0.5);
        this.container.add(this.wave);

        this.waveTween = scene.tweens.add({
            targets: this.wave,
            radius,
            alpha: 0,
            duration: 2000,
            repeat: -1,
            ease: 'Sine.easeOut'
        });

        this.statusText = scene.add.text(0, 0, 'AP', {
            fontSize: '9px',
            color: '#ffffff',
            fontFamily: 'Share Tech Mono'
        }).setOrigin(0.5);
        this.container.add(this.statusText);
    }

    canAcceptItem(_type: string): boolean {
        return false;
    }

    destroy(): void {
        this.waveTween?.stop();
        this.scene.tweens.killTweensOf(this.wave);
        super.destroy();
    }
}
