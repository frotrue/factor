import Phaser from 'phaser';
import { CONFIG } from '../config';
import type MainScene from '../scenes/MainScene';
import BaseBuilding from '../buildings/BaseBuilding';

export default class EffectsManager {
    private scene: MainScene;
    private outageMarkers = new Map<BaseBuilding, Phaser.GameObjects.Graphics>();

    constructor(scene: MainScene) {
        this.scene = scene;
    }

    playBuildOnline(building: BaseBuilding, type: string): void {
        building.container.setScale(0.5);
        building.container.setAlpha(0);
        this.scene.tweens.add({
            targets: building.container,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 220,
            ease: 'Back.easeOut'
        });

        const color = CONFIG.BUILDINGS[type]?.COLOR ?? 0x00f3ff;
        const ring = this.scene.add.circle(building.x + CONFIG.GRID_SIZE / 2, building.y + CONFIG.GRID_SIZE / 2, 8, color, 0);
        ring.setDepth(28);
        ring.setStrokeStyle(2, color, 0.9);
        this.scene.tweens.add({
            targets: ring,
            radius: CONFIG.GRID_SIZE,
            alpha: 0,
            duration: 360,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy()
        });
    }

    playBuildingRemoved(x: number, y: number): void {
        const effect = this.scene.add.rectangle(x + CONFIG.GRID_SIZE / 2, y + CONFIG.GRID_SIZE / 2, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE, 0xff4444);
        effect.setDepth(28);
        this.scene.tweens.add({
            targets: effect,
            scaleX: 1.6,
            scaleY: 1.6,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => effect.destroy()
        });
    }

    playWaveStart(): void {
        this.scene.cameras.main.shake(160, 0.004);
        const flash = this.scene.add.rectangle(
            this.scene.cameras.main.midPoint.x,
            this.scene.cameras.main.midPoint.y,
            this.scene.scale.width / this.scene.cameras.main.zoom,
            this.scene.scale.height / this.scene.cameras.main.zoom,
            0xff4444,
            0.12
        );
        flash.setDepth(90);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 260,
            onComplete: () => flash.destroy()
        });
    }

    playEnemyKilled(x: number, y: number): void {
        const burst = this.scene.add.circle(x, y, 6, 0x39ff14, 0);
        burst.setDepth(41);
        burst.setStrokeStyle(2, 0x39ff14, 0.8);
        this.scene.tweens.add({
            targets: burst,
            radius: 22,
            alpha: 0,
            duration: 240,
            onComplete: () => burst.destroy()
        });
    }

    playDefenseShot(x: number, y: number, targetX: number, targetY: number, onHit: () => void): void {
        const trail = this.scene.add.graphics();
        trail.setDepth(39);
        trail.lineStyle(2, 0xffffff, 0.55);
        trail.strokeLineShape(new Phaser.Geom.Line(x, y, targetX, targetY));

        const proj = this.scene.add.circle(x, y, 3, 0xffffff);
        proj.setDepth(40);

        this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            duration: 120,
            onComplete: () => trail.destroy()
        });

        this.scene.tweens.add({
            targets: proj,
            x: targetX,
            y: targetY,
            duration: 100,
            onComplete: () => {
                proj.destroy();
                const impact = this.scene.add.circle(targetX, targetY, 4, 0xffffff, 0);
                impact.setDepth(41);
                impact.setStrokeStyle(2, 0xffffff, 0.8);
                this.scene.tweens.add({
                    targets: impact,
                    radius: 14,
                    alpha: 0,
                    duration: 160,
                    onComplete: () => impact.destroy()
                });
                onHit();
            }
        });
    }

    updatePowerWarnings(): void {
        const active = new Set<BaseBuilding>();
        this.scene.buildingManager.forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            if (!pConfig || pConfig.CONSUMPTION <= 0 || building.hasPower) {
                building.container.setAlpha(1);
                return;
            }

            active.add(building);
            building.container.setAlpha(0.62);
            let marker = this.outageMarkers.get(building);
            if (!marker) {
                marker = this.scene.add.graphics();
                marker.setDepth(34);
                building.container.add(marker);
                this.outageMarkers.set(building, marker);
            }

            const pulse = Math.sin(this.scene.time.now / 170) * 0.25 + 0.65;
            marker.clear();
            marker.lineStyle(2, 0xfde047, pulse);
            marker.strokeCircle(0, 0, CONFIG.GRID_SIZE * 0.58);
            marker.fillStyle(0xfde047, pulse * 0.25);
            marker.fillTriangle(-5, -CONFIG.GRID_SIZE / 2 - 10, 5, -CONFIG.GRID_SIZE / 2 - 10, 0, -CONFIG.GRID_SIZE / 2 - 1);
        });

        this.outageMarkers.forEach((marker, building) => {
            if (!active.has(building)) {
                marker.destroy();
                this.outageMarkers.delete(building);
            }
        });
    }
}
