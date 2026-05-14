import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, DefenseModelState, DefenseTowerConfig } from '../types';
import BaseEnemy from '../enemies/BaseEnemy';
import type MainScene from '../scenes/MainScene';

export default class DefenseTower extends BaseBuilding {
    fireTimer: number;
    hp: number;
    maxHp: number;
    hpBar?: Phaser.GameObjects.Graphics;
    modelConfidence: number;
    modelVersion: number;
    inferenceCharge: number;
    lockedTarget: BaseEnemy | null;

    constructor(scene: Phaser.Scene, x: number, y: number, type: string, config: BuildingOptions = {}) {
        super(scene, x, y, type, { ...config, color: CONFIG.BUILDINGS[type].COLOR });
        this.fireTimer = 0;
        const sharedModel = (scene as MainScene).getDefenseModelState?.(type);
        this.modelConfidence = Phaser.Math.Clamp(config.customState?.modelConfidence ?? sharedModel?.modelConfidence ?? 35, 0, 100);
        this.modelVersion = Math.max(1, config.customState?.modelVersion ?? sharedModel?.modelVersion ?? 1);
        this.inferenceCharge = Math.max(0, config.customState?.inferenceCharge ?? sharedModel?.inferenceCharge ?? 0);
        this.lockedTarget = null;

        const bConfig = CONFIG.BUILDINGS[type];
        if (bConfig.HP) {
            const researchManager = (scene as MainScene).researchManager;
            const hpMultiplier = type === 'FIREWALL'
                ? researchManager?.getEffectValue('FIREWALL_HP_MULTIPLIER', 1) ?? 1
                : 1;
            this.maxHp = Math.round(bConfig.HP * hpMultiplier);
            this.hp = this.maxHp;
            this.hpBar = scene.add.graphics();
            this.container.add(this.hpBar);
            this.drawHpBar();
        } else {
            this.maxHp = 0;
            this.hp = 0;
        }
    }

    drawHpBar(): void {
        if (!this.hpBar) return;
        this.hpBar.clear();
        const width = CONFIG.GRID_SIZE;
        const height = 4;
        const percent = Math.max(0, this.hp / this.maxHp);
        
        this.hpBar.fillStyle(0xff0000, 1);
        this.hpBar.fillRect(-width/2, -CONFIG.GRID_SIZE/2 - 6, width, height);
        
        this.hpBar.fillStyle(0x00ff00, 1);
        this.hpBar.fillRect(-width/2, -CONFIG.GRID_SIZE/2 - 6, width * percent, height);
    }

    takeDamage(amount: number): void {
        if (this.maxHp <= 0) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            const buildingManager = (this.scene as MainScene).buildingManager;
            if (buildingManager) {
                buildingManager.remove(`${this.x},${this.y}`);
            }
        } else {
            this.drawHpBar();
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
        (this.scene as MainScene).effectsManager?.clearInferenceLock(this.getLockKey());
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
        const trained = (this.scene as MainScene).trainDefenseModelType?.(this.type, itemType) ?? false;
        return trained;
    }

    onTick(_tickCount: number): void {
        const dConfig = CONFIG.BUILDINGS[this.type].DEFENSE;
        if (!dConfig) return;

        if (this.isInfected(_tickCount) && _tickCount % 2 !== 0) return;

        const researchManager = (this.scene as MainScene).researchManager;
        const fireMultiplier = researchManager?.getEffectValue('TOWER_FIRE_RATE_MULTIPLIER', 1) ?? 1;
        const fireRate = Math.max(1, Math.round(dConfig.FIRE_RATE * fireMultiplier));

        this.fireTimer++;
        if (this.fireTimer >= fireRate) {
            this.tryFire(dConfig);
        }
    }

    tryFire(dConfig: DefenseTowerConfig): void {
        const waveManager = (this.scene as MainScene).waveManager;
        if (!waveManager) return;

        const researchManager = (this.scene as MainScene).researchManager;
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
            // 방화벽은 투사체 없이 직접 닿은 적에게 데미지
            enemies.forEach((enemy: BaseEnemy) => {
                const dist = Phaser.Math.Distance.Between(this.x + CONFIG.GRID_SIZE/2, this.y + CONFIG.GRID_SIZE/2, enemy.x, enemy.y);
                if (dist <= CONFIG.GRID_SIZE) {
                    enemy.takeDamage(actualDamage);
                    this.takeDamage(enemy.damage / 5); // 방화벽도 피해를 입음
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
                (this.scene as MainScene).effectsManager?.setInferenceLock(
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
            (this.scene as MainScene).effectsManager?.setInferenceLock(
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
        const mainScene = this.scene as MainScene;
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
        const mainScene = this.scene as MainScene;
        mainScene.soundManager?.play('shot');
        if (this.type === 'CLASSIFIER') {
            if (this.type === 'CLASSIFIER') {
                mainScene.effectsManager?.setInferenceLock(this.getLockKey(), target, this.type, this.modelConfidence);
            }
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
