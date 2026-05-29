import Phaser from 'phaser';
import { CONFIG } from '../config';
import EventBus from '../managers/EventBus';
import BaseBuilding from '../buildings/BaseBuilding';
import BuildingManager from '../managers/BuildingManager';
import { IMainScene } from '../types';
import { selectEnemyBuildingTarget } from '../utils/enemyBuildingInteraction';
import { findGridPath, type GridPoint } from '../utils/gridPath';
import { getEnemyColor, VISUAL_THEME } from '../visuals/visualTheme';

export default class BaseEnemy {
    scene: Phaser.Scene;
    id: string;
    type: string;
    hp: number;
    maxHp: number;
    speed: number;
    damage: number;
    x: number;
    y: number;
    active: boolean;
    sprite: Phaser.GameObjects.Arc;
    hpBar: Phaser.GameObjects.Graphics;
    statusGraphics: Phaser.GameObjects.Graphics;
    auraGraphics?: Phaser.GameObjects.Graphics;
    buildingManager: BuildingManager;
    path: GridPoint[];
    pathTimer: number;
    specialTimer: number;
    attackTimer: number;
    auraSpeedMultiplier: number;
    private _hpDirty: boolean = true;
    private _statusDrawn: boolean = false;

    constructor(scene: Phaser.Scene, type: string, x: number, y: number, hpMultiplier: number = 1, id: string, buildingManager: BuildingManager) {
        this.scene = scene;
        this.type = type;
        this.x = x;
        this.y = y;
        this.id = id;
        this.buildingManager = buildingManager;

        const config = CONFIG.ENEMIES[type];
        this.maxHp = config.BASE_HP * hpMultiplier;
        this.hp = this.maxHp;
        this.speed = config.SPEED;
        this.damage = config.DAMAGE;
        this.active = true;
        this.path = [];
        this.pathTimer = 0;
        this.specialTimer = 0;
        this.attackTimer = 0;
        this.auraSpeedMultiplier = 1;

        const color = getEnemyColor(type);
        this.sprite = scene.add.circle(x, y, config.RADIUS, color);
        this.sprite.setStrokeStyle(2, 0x060914, 0.95);
        this.sprite.setDepth(30);

        this.hpBar = scene.add.graphics();
        this.hpBar.setDepth(31);
        this.statusGraphics = scene.add.graphics();
        this.statusGraphics.setDepth(32);
        this.createStatusVisuals();
        this.drawHpBar();
    }

    takeDamage(amount: number): void {
        if (!this.active) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        } else {
            this._hpDirty = true;
        }
    }

    die(): void {
        if (!this.active) return;
        this.active = false;
        if (this.sprite && this.sprite.active) this.sprite.destroy();
        if (this.hpBar && this.hpBar.active) this.hpBar.destroy();
        if (this.statusGraphics && this.statusGraphics.active) this.statusGraphics.destroy();
        if (this.auraGraphics && this.auraGraphics.active) this.auraGraphics.destroy();
        EventBus.emit('ENEMY_KILLED', {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            rewardSilicon: CONFIG.ENEMIES[this.type].REWARD_SILICON || 0
        });
    }

    drawHpBar(): void {
        this.hpBar.clear();
        if (!this.active) return;
        const width = 16;
        const height = 3;
        const percent = Math.max(0, this.hp / this.maxHp);

        this.hpBar.fillStyle(0x270914, 0.92);
        this.hpBar.fillRect(-width / 2, -12, width, height);

        const hpColor = percent > 0.5 ? VISUAL_THEME.buildings.online : percent > 0.25 ? VISUAL_THEME.buildings.warning : VISUAL_THEME.buildings.danger;
        this.hpBar.fillStyle(hpColor, 1);
        this.hpBar.fillRect(-width / 2, -12, width * percent, height);
        this.hpBar.setPosition(this.x, this.y);
        this._hpDirty = false;
    }

    update(deltaMs: number, targetX: number, targetY: number): void {
        if (!this.active) return;

        const delta = deltaMs / 1000;
        this.pathTimer -= deltaMs;
        this.specialTimer -= deltaMs;
        this.attackTimer -= deltaMs;

        const snappedX = Math.floor(this.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(this.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const building = this.buildingManager.get(`${snappedX},${snappedY}`) as BaseBuilding | null;

        if (this.type === 'MALWARE') {
            this.tryInfectBuilding();
        }

        let currentSpeed = this.speed * this.auraSpeedMultiplier;
        const attackTarget = this.getAttackTarget(snappedX, snappedY);
        if (attackTarget) {
            currentSpeed = 0;
            this.attackBuilding(attackTarget);
        }
        if (building && building.type === 'FIREWALL') {
            currentSpeed = 0;
        }

        if (currentSpeed > 0) {
            const moveTarget = this.getMoveTarget(targetX, targetY);
            const angle = Phaser.Math.Angle.Between(this.x, this.y, moveTarget.x, moveTarget.y);
            this.x += Math.cos(angle) * currentSpeed * delta;
            this.y += Math.sin(angle) * currentSpeed * delta;

            if (Phaser.Math.Distance.Between(this.x, this.y, moveTarget.x, moveTarget.y) < CONFIG.GRID_SIZE * 0.25) {
                this.path.shift();
            }
        }

        this.sprite.setPosition(this.x, this.y);
        if (this._hpDirty) {
            this.drawHpBar();
        } else {
            this.hpBar.setPosition(this.x, this.y);
        }
        this.repositionStatusVisuals();


        const inCoreBounds = (this.x >= 0 && this.x <= 128 && this.y >= 0 && this.y <= 128);
        if (inCoreBounds || (building && building.type === 'CORE')) {
            EventBus.emit('CORE_DAMAGED', { amount: this.damage });
            this.die();
        }
    }

    getAttackTarget(snappedX: number, snappedY: number): BaseBuilding | null {
        const gridSize = CONFIG.GRID_SIZE;
        const candidates = [
            `${snappedX},${snappedY}`,
            `${snappedX + gridSize},${snappedY}`,
            `${snappedX - gridSize},${snappedY}`,
            `${snappedX},${snappedY + gridSize}`,
            `${snappedX},${snappedY - gridSize}`
        ]
            .map(key => {
                const building = this.buildingManager.get(key) as BaseBuilding | null;
                return building ? { key, type: building.type, building } : null;
            })
            .filter((candidate): candidate is { key: string; type: string; building: BaseBuilding } => Boolean(candidate));

        return selectEnemyBuildingTarget(candidates)?.building ?? null;
    }

    attackBuilding(building: BaseBuilding): void {
        if (this.attackTimer > 0) return;
        this.attackTimer = 900;
        building.takeDamage(Math.max(1, this.damage));
    }

    createStatusVisuals(): void {
        if (this.type === 'DDOS_BOT') {
            this.scene.tweens.add({
                targets: this.sprite,
                scaleX: 1.35,
                scaleY: 1.35,
                yoyo: true,
                repeat: -1,
                duration: 180
            });
        } else if (this.type === 'OVERFITTED_MODEL') {
            this.auraGraphics = this.scene.add.graphics();
            this.auraGraphics.setDepth(24);
            this.scene.tweens.add({
                targets: this.auraGraphics,
                alpha: 0.35,
                yoyo: true,
                repeat: -1,
                duration: 700
            });
        } else {
            this.scene.tweens.add({
                targets: this.statusGraphics,
                alpha: 0.35,
                yoyo: true,
                repeat: -1,
                duration: this.type === 'ADVERSARIAL' ? 350 : 550
            });
        }
        this.drawStatusVisualsOnce();
    }

    /** Draw status visuals once relative to origin (0,0). Only called once per enemy. */
    private drawStatusVisualsOnce(): void {
        this.statusGraphics.clear();
        if (this.auraGraphics) this.auraGraphics.clear();
        if (!this.active) return;

        if (this.type === 'DDOS_BOT') {
            this.statusGraphics.lineStyle(1, VISUAL_THEME.enemies.DDOS_BOT, 0.85);
            this.statusGraphics.lineBetween(-8, 0, 8, 0);
            this.statusGraphics.lineBetween(0, -8, 0, 8);
            this.statusGraphics.strokeCircle(0, 0, 9);
        } else if (this.type === 'MALWARE') {
            this.statusGraphics.lineStyle(2, VISUAL_THEME.enemies.MALWARE, 0.92);
            this.statusGraphics.strokeCircle(0, 0, 14);
            this.statusGraphics.fillStyle(VISUAL_THEME.enemies.MALWARE, 0.9);
            this.statusGraphics.fillCircle(10, -10, 3);
        } else if (this.type === 'ADVERSARIAL') {
            this.statusGraphics.lineStyle(2, VISUAL_THEME.enemies.ADVERSARIAL, 0.92);
            this.statusGraphics.strokeCircle(0, 0, 12);
            this.statusGraphics.lineBetween(-8, -8, 8, 8);
            this.statusGraphics.lineBetween(8, -8, -8, 8);
        } else if (this.type === 'OVERFITTED_MODEL' && this.auraGraphics) {
            this.auraGraphics.fillStyle(VISUAL_THEME.enemies.OVERFITTED_MODEL, 0.08);
            this.auraGraphics.lineStyle(2, VISUAL_THEME.enemies.OVERFITTED_MODEL, 0.36);
            this.auraGraphics.fillCircle(0, 0, CONFIG.GRID_SIZE * 8);
            this.auraGraphics.strokeCircle(0, 0, CONFIG.GRID_SIZE * 8);
            this.statusGraphics.fillStyle(0xffffff, 0.9);
            this.statusGraphics.fillCircle(0, -20, 4);
        } else {
            this.statusGraphics.lineStyle(1, VISUAL_THEME.enemies.NOISE, 0.72);
            this.statusGraphics.strokeCircle(0, 0, (CONFIG.ENEMIES[this.type]?.RADIUS ?? 8) + 4);
        }
        this._statusDrawn = true;
    }

    /** Reposition status visuals without redrawing. Draws once if not yet drawn. */
    repositionStatusVisuals(): void {
        if (!this._statusDrawn) {
            this.drawStatusVisualsOnce();
        }
        this.statusGraphics.setPosition(this.x, this.y);
        if (this.auraGraphics) this.auraGraphics.setPosition(this.x, this.y);
    }

    getHitChanceMultiplier(): number {
        return this.type === 'ADVERSARIAL' ? 0.65 : 1;
    }

    getMoveTarget(targetX: number, targetY: number): GridPoint {
        if (this.pathTimer <= 0 || this.path.length === 0) {
            this.path = this.findPath(targetX, targetY);
            this.pathTimer = 700;
        }
        return this.path[0] || { x: this.x, y: this.y };
    }

    findPath(targetX: number, targetY: number): GridPoint[] {
        const gridSize = CONFIG.GRID_SIZE;
        return findGridPath({
            startWorld: { x: this.x, y: this.y },
            targetWorld: { x: targetX, y: targetY },
            gridSize,
            directions: CONFIG.DIRECTIONS.map(d => ({ x: d.x, y: d.y })),
            isBlocked: (worldX, worldY, isTarget) => {
                const worldKey = `${worldX},${worldY}`;
                const blockingBuilding = this.buildingManager.get(worldKey) as BaseBuilding | null;
                const blocksEnemy = (this.scene as IMainScene).mapManager?.blocksEnemyAt(worldX, worldY);
                if (blocksEnemy && !isTarget) return true;
                return Boolean(blockingBuilding && blockingBuilding.type !== 'FIREWALL' && blockingBuilding.type !== 'CORE' && !isTarget);
            }
        });
    }

    tryInfectBuilding(): void {
        if (this.specialTimer > 0) return;
        this.specialTimer = 2000;

        const gridSize = CONFIG.GRID_SIZE;
        const gridX = Math.floor(this.x / gridSize) * gridSize;
        const gridY = Math.floor(this.y / gridSize) * gridSize;
        const tickSystem = (this.scene as IMainScene).tickSystem;
        const untilTick = (tickSystem?.getCurrentTick?.() || 0) + 6;
        const candidates = [
            `${gridX},${gridY}`,
            `${gridX + gridSize},${gridY}`,
            `${gridX - gridSize},${gridY}`,
            `${gridX},${gridY + gridSize}`,
            `${gridX},${gridY - gridSize}`
        ];

        for (const key of candidates) {
            const building = this.buildingManager.get(key) as BaseBuilding | null;
            if (building && building.type !== 'CORE' && building.type !== 'FIREWALL') {
                building.infectUntil(untilTick);
                return;
            }
        }
    }
}
