import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, DefenseModelState, DefenseTowerConfig, IMainScene } from '../types';
import BaseEnemy from '../enemies/BaseEnemy';
import { getCategoryColor } from '../visuals/visualTheme';

export default class DefenseTower extends BaseBuilding {
    fireTimer: number;
    modelConfidence: number;
    modelVersion: number;
    inferenceCharge: number;
    lockedTarget: BaseEnemy | null;
    towerGraphics: Phaser.GameObjects.Graphics;
    animProgress: number;
    towerTween: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, type: string, config: BuildingOptions = {}) {
        super(scene, x, y, type, { ...config, color: CONFIG.BUILDINGS[type].COLOR });
        this.fireTimer = 0;
        const sharedModel = (scene as IMainScene).getDefenseModelState?.(type);
        this.modelConfidence = Phaser.Math.Clamp(config.customState?.modelConfidence ?? sharedModel?.modelConfidence ?? 35, 0, 100);
        this.modelVersion = Math.max(1, config.customState?.modelVersion ?? sharedModel?.modelVersion ?? 1);
        this.inferenceCharge = Math.max(0, config.customState?.inferenceCharge ?? sharedModel?.inferenceCharge ?? 0);
        this.lockedTarget = null;

        const bConfig = CONFIG.BUILDINGS[type];
        if (bConfig.HP) {
            const researchManager = (scene as IMainScene).researchManager;
            const hpMultiplier = type === 'FIREWALL'
                ? researchManager?.getEffectValue('FIREWALL_HP_MULTIPLIER', 1) ?? 1
                : 1;
            this.maxHp = Math.round(bConfig.HP * hpMultiplier);
            this.hp = this.maxHp;
        }

        this.towerGraphics = scene.add.graphics();
        this.container.add(this.towerGraphics);

        this.animProgress = 0;
        this.towerTween = scene.tweens.add({
            targets: this,
            animProgress: 1.0,
            duration: 2000,
            repeat: -1,
            onUpdate: () => this.drawTowerVisuals()
        });
    }

    drawTowerVisuals(): void {
        this.towerGraphics.clear();
        if (this.destroyed) return;

        const accent = getCategoryColor(CONFIG.BUILDINGS[this.type]?.CATEGORY) || 0xef4444;
        const pulse = 0.55 + 0.35 * Math.sin(this.scene.time.now / 180);
        const timeNow = this.scene.time.now;

        if (this.type === 'CLASSIFIER') {
            let angle = this.scene.time.now / 1500;
            if (this.lockedTarget && this.lockedTarget.active) {
                const localX = this.lockedTarget.x - (this.x + CONFIG.GRID_SIZE / 2);
                const localY = this.lockedTarget.y - (this.y + CONFIG.GRID_SIZE / 2);
                angle = Math.atan2(localY, localX);
            }

            this.towerGraphics.lineStyle(2, accent, 0.45);
            this.towerGraphics.strokeCircle(0, 0, 10);

            const barrelLen = 14;
            const bx = Math.cos(angle) * barrelLen;
            const by = Math.sin(angle) * barrelLen;

            const orthoAngle = angle + Math.PI / 2;
            const offsetDist = 2.5;
            const ox = Math.cos(orthoAngle) * offsetDist;
            const oy = Math.sin(orthoAngle) * offsetDist;

            this.towerGraphics.lineStyle(2, accent, 0.5);
            this.towerGraphics.lineBetween(-ox, -oy, bx - ox, by - oy);
            this.towerGraphics.lineBetween(ox, oy, bx + ox, by + oy);

            this.towerGraphics.lineStyle(1.5, 0xffffff, 0.85);
            this.towerGraphics.lineBetween(-ox, -oy, bx * 0.9 - ox, by * 0.9 - oy);
            this.towerGraphics.lineBetween(ox, oy, bx * 0.9 + ox, by * 0.9 + oy);

            this.towerGraphics.fillStyle(0xffffff, 0.95);
            this.towerGraphics.fillCircle(0, 0, 3);
        }
        else if (this.type === 'FILTER') {
            this.towerGraphics.lineStyle(3.5, accent, 0.38 * pulse);
            this.towerGraphics.beginPath();
            this.towerGraphics.arc(0, 0, 13, Math.PI * 0.7, Math.PI * 1.3, false);
            this.towerGraphics.strokePath();

            this.towerGraphics.beginPath();
            this.towerGraphics.arc(0, 0, 13, -Math.PI * 0.3, Math.PI * 0.3, false);
            this.towerGraphics.strokePath();

            this.towerGraphics.lineStyle(1.5, 0xffffff, 0.8 * pulse);
            this.towerGraphics.beginPath();
            this.towerGraphics.arc(0, 0, 13, Math.PI * 0.75, Math.PI * 1.25, false);
            this.towerGraphics.strokePath();

            this.towerGraphics.beginPath();
            this.towerGraphics.arc(0, 0, 13, -Math.PI * 0.25, Math.PI * 0.25, false);
            this.towerGraphics.strokePath();

            this.towerGraphics.fillStyle(accent, 0.28 * pulse);
            this.towerGraphics.lineStyle(1.5, accent, 0.85);
            this.towerGraphics.strokeCircle(0, 0, 6);
            this.towerGraphics.fillCircle(0, 0, 6);

            const cAngle = timeNow / 300;
            this.towerGraphics.fillStyle(0xffffff, 0.9);
            this.towerGraphics.fillCircle(Math.cos(cAngle) * 3, Math.sin(cAngle) * 3, 1.8);
        }
        else if (this.type === 'FIREWALL') {
            const fireSeed = timeNow / 60;
            const segments = 3;

            this.towerGraphics.lineStyle(1.5, accent, 0.38);
            this.towerGraphics.strokeCircle(0, 0, 12);

            for (let i = 0; i < segments; i++) {
                const angleOffset = (i * Math.PI * 2) / segments;
                const jitterAngle = angleOffset + 0.15 * Math.sin(fireSeed + i * 17);
                const height = 11 + 6 * Math.abs(Math.sin(fireSeed * 1.8 + i * 23));
                const width = 4 + 2 * Math.abs(Math.cos(fireSeed * 1.2 + i * 11));

                const ax = Math.cos(jitterAngle) * height;
                const ay = Math.sin(jitterAngle) * height;

                const baseAngleLeft = jitterAngle + Math.PI / 2;
                const baseAngleRight = jitterAngle - Math.PI / 2;
                const baseDist = width;
                const bx1 = Math.cos(baseAngleLeft) * baseDist;
                const by1 = Math.sin(baseAngleLeft) * baseDist;
                const bx2 = Math.cos(baseAngleRight) * baseDist;
                const by2 = Math.sin(baseAngleRight) * baseDist;

                const flameAlpha = 0.35 + 0.35 * Math.abs(Math.sin(fireSeed * 0.9 + i * 7));

                this.towerGraphics.fillStyle(accent, flameAlpha * 0.45);
                this.towerGraphics.lineStyle(3, accent, flameAlpha * 0.25);
                this.towerGraphics.beginPath();
                this.towerGraphics.moveTo(bx1, by1);
                this.towerGraphics.lineTo(ax, ay);
                this.towerGraphics.lineTo(bx2, by2);
                this.towerGraphics.closePath();
                this.towerGraphics.fillPath();
                this.towerGraphics.strokePath();

                this.towerGraphics.lineStyle(1.2, 0xffffff, flameAlpha * 0.9);
                this.towerGraphics.beginPath();
                this.towerGraphics.moveTo(bx1, by1);
                this.towerGraphics.lineTo(ax, ay);
                this.towerGraphics.lineTo(bx2, by2);
                this.towerGraphics.closePath();
                this.towerGraphics.strokePath();
            }

            this.towerGraphics.fillStyle(0xffffff, 0.9);
            this.towerGraphics.fillCircle(0, 0, 3.5);
        }
    }

    canAcceptItem(type: string): boolean {
        const dConfig = CONFIG.BUILDINGS[this.type].DEFENSE;
        if (!dConfig || dConfig.AMMO_CONSUMPTION === 0) return false;
        return type === dConfig.AMMO_TYPE && this.inputBuffer.length < this.maxBufferSize;
    }

    clearLockedTarget(): void {
        if (!this.lockedTarget) return;
        this.lockedTarget = null;
        (this.scene as IMainScene).effectsManager?.clearInferenceLock(this.getLockKey());
    }

    getLockKey(): string {
        return `${this.type}:${this.x},${this.y}`;
    }

    getCustomState(): object {
        return {};
    }

    applyModelState(state: DefenseModelState): void {
        this.modelConfidence = Phaser.Math.Clamp(state.modelConfidence, 0, 100);
        this.modelVersion = Math.max(1, state.modelVersion);
        this.inferenceCharge = Math.max(0, state.inferenceCharge);
    }

    improveModel(itemType: string): boolean {
        const trained = (this.scene as IMainScene).trainDefenseModelType?.(this.type, itemType) ?? false;
        return trained;
    }

    onTick(_tickCount: number): void {
        super.onTick(_tickCount);
        const dConfig = CONFIG.BUILDINGS[this.type].DEFENSE;
        if (!dConfig) return;

        if (this.isInfected(_tickCount) && _tickCount % 2 !== 0) return;

        const researchManager = (this.scene as IMainScene).researchManager;
        const fireMultiplier = researchManager?.getEffectValue('TOWER_FIRE_RATE_MULTIPLIER', 1) ?? 1;
        const fireRate = Math.max(1, Math.round(dConfig.FIRE_RATE * fireMultiplier));

        this.fireTimer++;
        if (this.fireTimer >= fireRate) {
            this.tryFire(dConfig);
        }
    }

    tryFire(dConfig: DefenseTowerConfig): void {
        const waveManager = (this.scene as IMainScene).waveManager;
        if (!waveManager) return;

        const researchManager = (this.scene as IMainScene).researchManager;
        const range = dConfig.RANGE + (researchManager?.getEffectValue('TOWER_RANGE_BONUS', 0) ?? 0);
        const enemies = waveManager.getEnemiesInRange(
            this.x + (CONFIG.GRID_SIZE/2),
            this.y + (CONFIG.GRID_SIZE/2),
            range
        );

        if (this.type === 'CLASSIFIER' && this.lockedTarget && !this.lockedTarget.active) {
            this.clearLockedTarget();
        }

        if (enemies.length === 0) {
            if (this.type !== 'CLASSIFIER') return;
            if (!this.lockedTarget || !this.lockedTarget.active) this.clearLockedTarget();
            return;
        }

        if (dConfig.AMMO_CONSUMPTION > 0) {
            if (this.inputBuffer.length < dConfig.AMMO_CONSUMPTION) return;
            for (let i = 0; i < dConfig.AMMO_CONSUMPTION; i++) {
                this.inputBuffer.shift();
            }
        }

        const damageMultiplier = researchManager?.getEffectValue('TOWER_DAMAGE_MULTIPLIER', 1) ?? 1;
        const confidenceFactor = 0.6 + this.modelConfidence / 125;
        const actualDamage = dConfig.DAMAGE * damageMultiplier * confidenceFactor;
        const hitChance = Phaser.Math.Clamp(0.45 + this.modelConfidence / 180, 0.05, 0.95);

        if (dConfig.IS_AOE) {
            if (this.type === 'FILTER') {
                this.fireAreaInference(enemies, actualDamage, hitChance, range * CONFIG.GRID_SIZE);
                this.fireTimer = 0;
                return;
            }
            enemies.forEach((enemy: BaseEnemy) => {
                this.resolveShot(enemy, actualDamage, hitChance);
            });
        } else if (this.type === 'FIREWALL') {
            enemies.forEach((enemy: BaseEnemy) => {
                const dist = Phaser.Math.Distance.Between(this.x + CONFIG.GRID_SIZE/2, this.y + CONFIG.GRID_SIZE/2, enemy.x, enemy.y);
                if (dist <= CONFIG.GRID_SIZE) {
                    enemy.takeDamage(actualDamage);
                    this.takeDamage(enemy.damage / 5);
                }
            });
        } else {
            const sortedEnemies = enemies.sort((a: BaseEnemy, b: BaseEnemy) => {
                const da = Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y);
                const db = Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y);
                return da - db;
            });
            const target = this.type === 'CLASSIFIER'
                ? this.getClassifierTarget(sortedEnemies)
                : sortedEnemies[0];

            if (!target) return;

            this.resolveShot(target, actualDamage, hitChance);
        }

        this.fireTimer = 0;
    }

    getClassifierTarget(enemies: BaseEnemy[]): BaseEnemy | null {
        if (this.lockedTarget && this.lockedTarget.active) {
            const lockedInRange = enemies.includes(this.lockedTarget);
            if (!lockedInRange) {
                (this.scene as IMainScene).effectsManager?.setInferenceLock(
                    this.getLockKey(),
                    this.lockedTarget,
                    this.type,
                    this.modelConfidence
                );
                return null;
            }
            return this.lockedTarget;
        }

        this.lockedTarget = enemies[0] ?? null;
        if (this.lockedTarget) {
            (this.scene as IMainScene).effectsManager?.setInferenceLock(
                this.getLockKey(),
                this.lockedTarget,
                this.type,
                this.modelConfidence
            );
        }
        return this.lockedTarget;
    }

    resolveShot(target: BaseEnemy, damage: number, hitChance: number): void {
        const finalHitChance = this.getFinalHitChance(target, hitChance);
        this.fireProjectile(target, damage, Math.random() <= finalHitChance);
    }

    getFinalHitChance(target: BaseEnemy, hitChance: number): number {
        const adversarialResist = target.type === 'ADVERSARIAL'
            ? 0.65 + this.modelConfidence / 300
            : 1;
        return Phaser.Math.Clamp(hitChance * target.getHitChanceMultiplier() * adversarialResist, 0.05, 0.98);
    }

    fireAreaInference(enemies: BaseEnemy[], damage: number, hitChance: number, radius: number): void {
        const mainScene = this.scene as IMainScene;
        const x = this.x + CONFIG.GRID_SIZE / 2;
        const y = this.y + CONFIG.GRID_SIZE / 2;
        const results = enemies
            .filter(enemy => enemy.active)
            .map(enemy => ({
                enemy,
                x: enemy.x,
                y: enemy.y,
                radius: CONFIG.ENEMIES[enemy.type]?.RADIUS ?? 8,
                type: enemy.type,
                hit: Math.random() <= this.getFinalHitChance(enemy, hitChance)
            }));

        if (results.length === 0) return;

        mainScene.soundManager?.play('shot');
        mainScene.effectsManager?.playAnomalyDetectionSweep({
            x,
            y,
            radius,
            confidence: this.modelConfidence,
            targets: results.map(result => ({
                x: result.x,
                y: result.y,
                radius: result.radius,
                type: result.type,
                hit: result.hit
            })),
            onComplete: () => {
                results.forEach(result => {
                    if (result.hit && result.enemy.active) {
                        result.enemy.takeDamage(damage);
                    }
                });
            }
        });
    }

    fireProjectile(target: BaseEnemy, damage: number, hit: boolean = true): void {
        if (!target.active) return;
        const x = this.x + CONFIG.GRID_SIZE / 2;
        const y = this.y + CONFIG.GRID_SIZE / 2;
        const mainScene = this.scene as IMainScene;
        mainScene.soundManager?.play('shot');
        if (this.type === 'CLASSIFIER') {
            mainScene.effectsManager?.setInferenceLock(this.getLockKey(), target, this.type, this.modelConfidence);
            mainScene.effectsManager?.playInferenceTargeting({
                towerType: this.type,
                x,
                y,
                targetX: target.x,
                targetY: target.y,
                targetRadius: CONFIG.ENEMIES[target.type]?.RADIUS ?? 8,
                targetType: target.type,
                confidence: this.modelConfidence,
                hit,
                onHit: () => {
                    if (hit) target.takeDamage(damage);
                }
            });
            return;
        }

        mainScene.effectsManager?.playDefenseShot(x, y, target.x, target.y, () => {
            if (hit) target.takeDamage(damage);
        });
    }

    destroy(): void {
        this.clearLockedTarget();
        if (this.towerTween) {
            this.towerTween.remove();
        }
        super.destroy();
    }
}

export class Classifier extends DefenseTower {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'CLASSIFIER', config);
    }
}

export class Filter extends DefenseTower {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'FILTER', config);
    }
}

export class Firewall extends DefenseTower {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'FIREWALL', config);
    }
}
