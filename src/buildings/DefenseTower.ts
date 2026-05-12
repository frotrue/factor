import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, DefenseTowerConfig } from '../types';
import BaseEnemy from '../enemies/BaseEnemy';
import type MainScene from '../scenes/MainScene';

export default class DefenseTower extends BaseBuilding {
    fireTimer: number;
    hp: number;
    maxHp: number;
    hpBar?: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number, type: string, config: BuildingOptions = {}) {
        super(scene, x, y, type, { ...config, color: CONFIG.BUILDINGS[type].COLOR });
        this.fireTimer = 0;

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

        if (enemies.length === 0) return;

        let confidence = 100;
        if (dConfig.AMMO_CONSUMPTION > 0) {
            if (this.inputBuffer.length < dConfig.AMMO_CONSUMPTION) return;
            confidence = Math.min(100, (this.inputBuffer.length / this.maxBufferSize) * 100);
            for (let i = 0; i < dConfig.AMMO_CONSUMPTION; i++) {
                this.inputBuffer.shift();
            }
        }

        const damageMultiplier = researchManager?.getEffectValue('TOWER_DAMAGE_MULTIPLIER', 1) ?? 1;
        const actualDamage = dConfig.DAMAGE * damageMultiplier * (confidence / 100);
        const hitChance = 0.5 + (confidence / 200);

        if (dConfig.IS_AOE) {
            enemies.forEach((enemy: BaseEnemy) => {
                if (Math.random() <= hitChance * enemy.getHitChanceMultiplier()) {
                    this.fireProjectile(enemy, actualDamage);
                }
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
            const target = enemies.sort((a: BaseEnemy, b: BaseEnemy) => {
                const da = Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y);
                const db = Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y);
                return da - db;
            })[0];
            
            if (Math.random() <= hitChance * target.getHitChanceMultiplier()) {
                this.fireProjectile(target, actualDamage);
            }
        }
        
        this.fireTimer = 0;
    }

    fireProjectile(target: BaseEnemy, damage: number): void {
        if (!target.active) return;
        const x = this.x + CONFIG.GRID_SIZE / 2;
        const y = this.y + CONFIG.GRID_SIZE / 2;
        const mainScene = this.scene as MainScene;
        mainScene.soundManager?.play('shot');
        mainScene.effectsManager?.playDefenseShot(x, y, target.x, target.y, () => {
            target.takeDamage(damage);
        });
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
