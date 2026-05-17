import Phaser from 'phaser';
import { CONFIG } from '../config';
import EventBus from '../managers/EventBus';
import BaseBuilding from '../buildings/BaseBuilding';
import BuildingManager from '../managers/BuildingManager';
import { IMainScene } from '../types';

interface GridPoint {
    x: number;
    y: number;
}

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
    auraSpeedMultiplier: number;

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
        this.auraSpeedMultiplier = 1;

        this.sprite = scene.add.circle(x, y, config.RADIUS, config.COLOR);
        this.sprite.setStrokeStyle(1, 0xffffff);
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
            this.drawHpBar();
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

        this.hpBar.fillStyle(0xff0000, 1);
        this.hpBar.fillRect(this.x - width / 2, this.y - 12, width, height);

        this.hpBar.fillStyle(0x00ff00, 1);
        this.hpBar.fillRect(this.x - width / 2, this.y - 12, width * percent, height);
    }

    update(deltaMs: number, targetX: number, targetY: number): void {
        if (!this.active) return;

        const delta = deltaMs / 1000;
        this.pathTimer -= deltaMs;
        this.specialTimer -= deltaMs;

        const snappedX = Math.floor(this.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(this.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const building = this.buildingManager.get(`${snappedX},${snappedY}`) as BaseBuilding | null;

        if (this.type === 'MALWARE') {
            this.tryInfectBuilding();
        }

        let currentSpeed = this.speed * this.auraSpeedMultiplier;
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
        this.drawHpBar();
        this.updateStatusVisuals();

        const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
        if (dist < CONFIG.GRID_SIZE) {
            EventBus.emit('CORE_DAMAGED', { amount: this.damage });
            this.die();
        }
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
        this.updateStatusVisuals();
    }

    updateStatusVisuals(): void {
        this.statusGraphics.clear();
        if (this.auraGraphics) this.auraGraphics.clear();
        if (!this.active) return;

        if (this.type === 'DDOS_BOT') {
            this.statusGraphics.lineStyle(1, 0x00ff88, 0.75);
            this.statusGraphics.lineBetween(this.x - 8, this.y, this.x + 8, this.y);
            this.statusGraphics.lineBetween(this.x, this.y - 8, this.x, this.y + 8);
        } else if (this.type === 'MALWARE') {
            this.statusGraphics.lineStyle(2, 0xff00aa, 0.9);
            this.statusGraphics.strokeCircle(this.x, this.y, 14);
            this.statusGraphics.fillStyle(0xff00aa, 0.9);
            this.statusGraphics.fillCircle(this.x + 10, this.y - 10, 3);
        } else if (this.type === 'ADVERSARIAL') {
            this.statusGraphics.lineStyle(2, 0x22d3ee, 0.9);
            this.statusGraphics.strokeCircle(this.x, this.y, 12);
            this.statusGraphics.lineBetween(this.x - 8, this.y - 8, this.x + 8, this.y + 8);
        } else if (this.type === 'OVERFITTED_MODEL' && this.auraGraphics) {
            this.auraGraphics.fillStyle(0x7c3aed, 0.08);
            this.auraGraphics.lineStyle(2, 0x7c3aed, 0.35);
            this.auraGraphics.fillCircle(this.x, this.y, CONFIG.GRID_SIZE * 8);
            this.auraGraphics.strokeCircle(this.x, this.y, CONFIG.GRID_SIZE * 8);
            this.statusGraphics.fillStyle(0xffffff, 0.9);
            this.statusGraphics.fillCircle(this.x, this.y - 20, 4);
        }
    }

    getHitChanceMultiplier(): number {
        return this.type === 'ADVERSARIAL' ? 0.65 : 1;
    }

    getMoveTarget(targetX: number, targetY: number): GridPoint {
        if (this.pathTimer <= 0 || this.path.length === 0) {
            this.path = this.findPath(targetX, targetY);
            this.pathTimer = 700;
        }
        return this.path[0] || { x: targetX, y: targetY };
    }

    findPath(targetX: number, targetY: number): GridPoint[] {
        const gridSize = CONFIG.GRID_SIZE;
        const start = { x: Math.floor(this.x / gridSize), y: Math.floor(this.y / gridSize) };
        const target = { x: Math.floor(targetX / gridSize), y: Math.floor(targetY / gridSize) };
        const startKey = `${start.x},${start.y}`;
        const targetKey = `${target.x},${target.y}`;
        const queue = [start];
        const visited = new Set<string>([startKey]);
        const cameFrom = new Map<string, string>();
        const dirs = CONFIG.DIRECTIONS.map(d => ({ x: d.x, y: d.y }));

        while (queue.length > 0 && visited.size < 900) {
            const current = queue.shift()!;
            if (`${current.x},${current.y}` === targetKey) break;

            const sortedDirs = dirs.slice().sort((a, b) => {
                const da = Math.abs(target.x - (current.x + a.x)) + Math.abs(target.y - (current.y + a.y));
                const db = Math.abs(target.x - (current.x + b.x)) + Math.abs(target.y - (current.y + b.y));
                return da - db;
            });

            for (const dir of sortedDirs) {
                const next = { x: current.x + dir.x, y: current.y + dir.y };
                const key = `${next.x},${next.y}`;
                if (visited.has(key)) continue;
                if (Math.abs(next.x - start.x) > 35 || Math.abs(next.y - start.y) > 35) continue;

                const worldKey = `${next.x * gridSize},${next.y * gridSize}`;
                const blockingBuilding = this.buildingManager.get(worldKey) as BaseBuilding | null;
                const isTarget = key === targetKey;
                if (blockingBuilding && blockingBuilding.type !== 'FIREWALL' && !isTarget) continue;

                visited.add(key);
                cameFrom.set(key, `${current.x},${current.y}`);
                queue.push(next);
            }
        }

        if (!cameFrom.has(targetKey)) return [];

        const path: GridPoint[] = [];
        let currentKey = targetKey;
        while (currentKey !== startKey) {
            const [gx, gy] = currentKey.split(',').map(Number);
            path.unshift({ x: gx * gridSize + gridSize / 2, y: gy * gridSize + gridSize / 2 });
            currentKey = cameFrom.get(currentKey)!;
        }
        return path.slice(0, 8);
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
