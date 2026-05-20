import Phaser from 'phaser';
import { CONFIG } from '../config';
import type MainScene from '../scenes/MainScene';
import BaseBuilding from '../buildings/BaseBuilding';
import BaseEnemy from '../enemies/BaseEnemy';
import { getSpawnPointForRoute, type IntrusionRouteId } from '../utils/waveSimulation';

interface InferenceLockMarker {
    target: BaseEnemy;
    towerType: string;
    confidence: number;
    box: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
}

export default class EffectsManager {
    private scene: MainScene;
    private outageMarkers = new Map<BaseBuilding, Phaser.GameObjects.Graphics>();
    private bufferMarkers = new Map<BaseBuilding, Phaser.GameObjects.Graphics>();
    private inferenceLocks = new Map<string, InferenceLockMarker>();
    private routeHintObjects: Phaser.GameObjects.GameObject[] = [];

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

    playBuildingDamaged(building: BaseBuilding): void {
        if (!building.container?.active) return;
        this.scene.tweens.add({
            targets: building.container,
            alpha: 0.45,
            yoyo: true,
            duration: 80,
            ease: 'Sine.easeInOut'
        });
    }

    playWaveStart(routes: string[] = []): void {
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
        this.playRouteWarnings(routes);
    }

    private playRouteWarnings(routes: string[]): void {
        if (routes.length === 0) return;
        this.clearRouteHints();

        const positions: Record<string, { x: number; y: number }> = {
            NORTH: { x: this.scene.scale.width / 2, y: 72 },
            EAST: { x: this.scene.scale.width - 92, y: this.scene.scale.height / 2 },
            SOUTH: { x: this.scene.scale.width / 2, y: this.scene.scale.height - 92 },
            WEST: { x: 92, y: this.scene.scale.height / 2 }
        };

        routes.forEach(route => {
            const position = positions[route];
            if (!position) return;
            const label = this.scene.add.text(position.x, position.y, `INTRUSION ${route}`, {
                fontSize: '14px',
                color: '#ffdddd',
                fontFamily: 'Share Tech Mono',
                backgroundColor: 'rgba(127, 29, 29, 0.72)',
                padding: { x: 8, y: 4 }
            });
            label.setOrigin(0.5);
            label.setScrollFactor(0);
            label.setDepth(95);
            this.scene.tweens.add({
                targets: label,
                alpha: 0,
                y: position.y - 10,
                delay: 900,
                duration: 420,
                onComplete: () => label.destroy()
            });
            this.drawRouteGuidance(route);
        });
    }

    private clearRouteHints(): void {
        this.routeHintObjects.forEach(object => object.destroy());
        this.routeHintObjects = [];
    }

    private drawRouteGuidance(route: string): void {
        if (!this.isRouteId(route)) return;

        const spawn = getSpawnPointForRoute(route, 0.5);
        const core = {
            x: CONFIG.GRID_SIZE * 2 + CONFIG.GRID_SIZE * 2,
            y: CONFIG.GRID_SIZE * 2 + CONFIG.GRID_SIZE * 2
        };
        const graphics = this.scene.add.graphics();
        graphics.setDepth(18);
        graphics.lineStyle(3, 0xff4444, 0.45);
        graphics.lineBetween(spawn.x, spawn.y, core.x, core.y);
        graphics.lineStyle(18, 0xff4444, 0.08);
        graphics.lineBetween(spawn.x, spawn.y, core.x, core.y);

        const portLabel = this.scene.add.text(spawn.x, spawn.y, `${route} PORT`, {
            fontSize: '14px',
            color: '#ffdddd',
            fontFamily: 'Share Tech Mono',
            backgroundColor: 'rgba(127, 29, 29, 0.78)',
            padding: { x: 8, y: 4 }
        });
        portLabel.setOrigin(0.5);
        portLabel.setDepth(45);

        this.routeHintObjects.push(graphics, portLabel);
    }

    private isRouteId(route: string): route is IntrusionRouteId {
        return route === 'NORTH' || route === 'EAST' || route === 'SOUTH' || route === 'WEST';
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

    playInferenceTargeting(options: {
        towerType: string;
        x: number;
        y: number;
        targetX: number;
        targetY: number;
        targetRadius: number;
        targetType: string;
        confidence: number;
        hit: boolean;
        onHit: () => void;
    }): void {
        const confidence = Phaser.Math.Clamp(options.confidence, 0, 100);
        const highConfidence = confidence >= 70;
        const lowConfidence = confidence <= 30;
        const isAdversarial = options.targetType === 'ADVERSARIAL';
        const color = highConfidence ? 0x22c55e : lowConfidence ? 0xf97316 : 0x38bdf8;
        const scan = this.scene.add.graphics();
        scan.setDepth(39);
        scan.lineStyle(1, color, 0.45);
        scan.strokeLineShape(new Phaser.Geom.Line(options.x, options.y, options.targetX, options.targetY));

        const labelText = isAdversarial && !options.hit
            ? 'ADV SHIFT'
            : `${Math.round(confidence)}% ${options.hit ? 'LOCK' : 'MISS'}`;
        const label = this.scene.add.text(options.targetX, options.targetY - options.targetRadius - 18, labelText, {
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '9px',
            color: options.hit ? '#dbeafe' : '#fca5a5',
            backgroundColor: 'rgba(2, 6, 23, 0.78)',
            padding: { x: 3, y: 2 }
        }).setOrigin(0.5);
        label.setDepth(43);

        this.scene.tweens.add({
            targets: scan,
            alpha: 0,
            duration: 160,
            onComplete: () => scan.destroy()
        });

        this.scene.time.delayedCall(110, () => {
            if (options.hit) {
                options.onHit();
            }

            this.scene.tweens.add({
                targets: label,
                y: label.y - 8,
                alpha: 0,
                duration: 420,
                onComplete: () => label.destroy()
            });
        });
    }

    playAnomalyDetectionSweep(options: {
        x: number;
        y: number;
        radius: number;
        confidence: number;
        targets: Array<{
            x: number;
            y: number;
            radius: number;
            type: string;
            hit: boolean;
        }>;
        onComplete: () => void;
    }): void {
        const confidence = Phaser.Math.Clamp(options.confidence, 0, 100);
        const color = confidence >= 70 ? 0x22c55e : confidence <= 30 ? 0xf97316 : 0xfacc15;
        const sweep = this.scene.add.graphics();
        sweep.setDepth(39);
        sweep.fillStyle(color, 0.08);
        sweep.fillCircle(options.x, options.y, options.radius);
        sweep.lineStyle(2, color, 0.72);
        sweep.strokeCircle(options.x, options.y, options.radius);

        const inner = this.scene.add.circle(options.x, options.y, 6, color, 0);
        inner.setDepth(40);
        inner.setStrokeStyle(2, color, 0.9);

        const scanLine = this.scene.add.rectangle(options.x - options.radius, options.y, 2, options.radius * 2, color, 0.5);
        scanLine.setDepth(41);
        scanLine.setOrigin(0.5);

        const labels: Phaser.GameObjects.Text[] = [];
        options.targets.forEach(target => {
            const isAdversarial = target.type === 'ADVERSARIAL';
            const score = Math.round(Phaser.Math.Clamp(confidence + (target.hit ? 8 : -18) + (isAdversarial ? -10 : 0), 1, 99));
            const label = this.scene.add.text(
                target.x,
                target.y - target.radius - 14,
                target.hit ? `ANOM ${score}` : (isAdversarial ? 'SCORE DRIFT' : `ANOM ${score}?`),
                {
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: '9px',
                    color: target.hit ? '#fde68a' : '#fca5a5',
                    backgroundColor: 'rgba(2, 6, 23, 0.76)',
                    padding: { x: 3, y: 2 }
                }
            ).setOrigin(0.5);
            label.setDepth(43);
            labels.push(label);

            const blip = this.scene.add.circle(target.x, target.y, target.radius + 3, target.hit ? color : 0xef4444, 0);
            blip.setDepth(42);
            blip.setStrokeStyle(2, target.hit ? color : 0xef4444, target.hit ? 0.75 : 0.45);
            this.scene.tweens.add({
                targets: blip,
                radius: target.radius + 12,
                alpha: 0,
                duration: 360,
                ease: 'Cubic.easeOut',
                onComplete: () => blip.destroy()
            });
        });

        this.scene.tweens.add({
            targets: inner,
            radius: options.radius,
            alpha: 0,
            duration: 260,
            ease: 'Cubic.easeOut',
            onComplete: () => inner.destroy()
        });

        this.scene.tweens.add({
            targets: scanLine,
            x: options.x + options.radius,
            alpha: 0,
            duration: 220,
            ease: 'Sine.easeInOut',
            onComplete: () => scanLine.destroy()
        });

        this.scene.tweens.add({
            targets: sweep,
            alpha: 0,
            duration: 320,
            onComplete: () => sweep.destroy()
        });

        this.scene.time.delayedCall(150, () => {
            options.onComplete();
            labels.forEach(label => {
                this.scene.tweens.add({
                    targets: label,
                    y: label.y - 8,
                    alpha: 0,
                    duration: 420,
                    onComplete: () => label.destroy()
                });
            });
        });
    }

    setInferenceLock(key: string, target: BaseEnemy, towerType: string, confidence: number): void {
        let marker = this.inferenceLocks.get(key);
        if (!marker) {
            const box = this.scene.add.graphics();
            box.setDepth(42);
            const label = this.scene.add.text(target.x, target.y, '', {
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '9px',
                color: '#dbeafe',
                backgroundColor: 'rgba(2, 6, 23, 0.78)',
                padding: { x: 3, y: 2 }
            }).setOrigin(0.5);
            label.setDepth(43);
            marker = { target, towerType, confidence, box, label };
            this.inferenceLocks.set(key, marker);
        }

        marker.target = target;
        marker.towerType = towerType;
        marker.confidence = confidence;
        this.drawInferenceLock(marker);
    }

    clearInferenceLock(key: string): void {
        const marker = this.inferenceLocks.get(key);
        if (!marker) return;
        marker.box.destroy();
        marker.label.destroy();
        this.inferenceLocks.delete(key);
    }

    updateInferenceLocks(): void {
        this.inferenceLocks.forEach((marker, key) => {
            if (!marker.target.active) {
                this.clearInferenceLock(key);
                return;
            }
            this.drawInferenceLock(marker);
        });
    }

    drawInferenceLock(marker: InferenceLockMarker): void {
        const confidence = Phaser.Math.Clamp(marker.confidence, 0, 100);
        const color = confidence >= 70 ? 0x22c55e : confidence <= 30 ? 0xf97316 : 0x38bdf8;
        const isAdversarial = marker.target.type === 'ADVERSARIAL';
        const pulse = Math.sin(this.scene.time.now / 140) * 0.18 + 0.72;
        const radius = CONFIG.ENEMIES[marker.target.type]?.RADIUS ?? 8;
        const size = radius * 2.8;
        const jitterX = isAdversarial ? Math.sin(this.scene.time.now / 70) * 4 : 0;
        const jitterY = isAdversarial ? Math.cos(this.scene.time.now / 90) * 4 : 0;

        marker.box.clear();
        marker.box.lineStyle(2, color, pulse);
        marker.box.strokeRect(
            marker.target.x - size / 2 + jitterX,
            marker.target.y - size / 2 + jitterY,
            size,
            size
        );
        marker.box.lineStyle(1, color, pulse * 0.7);
        marker.box.lineBetween(marker.target.x - size / 2 - 4, marker.target.y, marker.target.x - size / 2 + 4, marker.target.y);
        marker.box.lineBetween(marker.target.x + size / 2 - 4, marker.target.y, marker.target.x + size / 2 + 4, marker.target.y);
        marker.box.lineBetween(marker.target.x, marker.target.y - size / 2 - 4, marker.target.x, marker.target.y - size / 2 + 4);
        marker.box.lineBetween(marker.target.x, marker.target.y + size / 2 - 4, marker.target.x, marker.target.y + size / 2 + 4);

        marker.label.setText(`${marker.towerType} ${Math.round(confidence)}% LOCK`);
        marker.label.setPosition(marker.target.x, marker.target.y - radius - 20);
        marker.label.setAlpha(0.9);
    }

    playModelTrainingPulse(building: BaseBuilding, itemType: string): void {
        const color = itemType === 'TRAINED_MODEL' ? 0xa855f7 : itemType === 'INFERENCE_UNIT' ? 0xec4899 : 0x14b8a6;
        const x = building.x + CONFIG.GRID_SIZE / 2;
        const y = building.y + CONFIG.GRID_SIZE / 2;
        const ring = this.scene.add.circle(x, y, 6, color, 0);
        ring.setDepth(44);
        ring.setStrokeStyle(2, color, 0.9);

        const label = this.scene.add.text(x, y - 22, itemType === 'WEIGHT_UPDATE' ? 'MODEL +2%' : itemType === 'TRAINED_MODEL' ? 'MODEL +10%' : 'CHARGE +5', {
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '9px',
            color: '#ffffff',
            backgroundColor: 'rgba(2, 6, 23, 0.76)',
            padding: { x: 3, y: 2 }
        }).setOrigin(0.5);
        label.setDepth(45);

        this.scene.tweens.add({
            targets: ring,
            radius: CONFIG.GRID_SIZE * 0.9,
            alpha: 0,
            duration: 420,
            onComplete: () => ring.destroy()
        });
        this.scene.tweens.add({
            targets: label,
            y: label.y - 12,
            alpha: 0,
            duration: 650,
            onComplete: () => label.destroy()
        });
    }

    updatePowerWarnings(): void {
        this.updateInferenceLocks();

        const activeOutages = new Set<BaseBuilding>();
        const activeBuffers = new Set<BaseBuilding>();
        this.scene.buildingManager.forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            const hasOutage = Boolean(pConfig && pConfig.CONSUMPTION > 0 && !building.hasPower);

            building.container.setAlpha(hasOutage ? 0.62 : 1);

            if (hasOutage) {
                activeOutages.add(building);
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
            }

            const inputFull = building.maxBufferSize > 0 && building.inputBuffer?.length >= building.maxBufferSize;
            const outputFull = building.maxBufferSize > 0 && building.outputBuffer?.length >= building.maxBufferSize;
            if (inputFull || outputFull) {
                activeBuffers.add(building);
                let marker = this.bufferMarkers.get(building);
                if (!marker) {
                    marker = this.scene.add.graphics();
                    marker.setDepth(35);
                    building.container.add(marker);
                    this.bufferMarkers.set(building, marker);
                }

                const pulse = Math.sin(this.scene.time.now / 210) * 0.2 + 0.7;
                const color = outputFull ? 0xfb923c : 0x38bdf8;
                marker.clear();
                marker.lineStyle(2, color, pulse);
                marker.strokeCircle(0, 0, CONFIG.GRID_SIZE * 0.43);
                marker.fillStyle(color, pulse * 0.22);
                marker.fillRect(CONFIG.GRID_SIZE / 2 - 8, -CONFIG.GRID_SIZE / 2 - 8, 10, 10);
            }
        });

        this.outageMarkers.forEach((marker, building) => {
            if (!activeOutages.has(building)) {
                marker.destroy();
                this.outageMarkers.delete(building);
            }
        });
        this.bufferMarkers.forEach((marker, building) => {
            if (!activeBuffers.has(building)) {
                marker.destroy();
                this.bufferMarkers.delete(building);
            }
        });
    }
}
