import Phaser from 'phaser';
import BaseEnemy from '../enemies/BaseEnemy';
import { CONFIG } from '../config';
import EventBus from './EventBus';
import BuildingManager from './BuildingManager';

export default class WaveManager {
    scene: Phaser.Scene;
    buildingManager: BuildingManager;
    enemies: Map<string, BaseEnemy>;
    currentWave: number;
    waveActive: boolean;
    waveTimer: number;
    spawnTimer: number;
    enemiesToSpawn: number;
    enemiesSpawned: number;
    hpMultiplier: number;
    enemyIdCounter: number;
    coreX: number;
    coreY: number;
    difficultyId: string;
    ddosSwarmSpawned: boolean;
    ddosBotsToSpawn: number;
    ddosRewardGranted: boolean;

    constructor(scene: Phaser.Scene, buildingManager: BuildingManager) {
        this.scene = scene;
        this.buildingManager = buildingManager;
        this.enemies = new Map();
        this.currentWave = 0;
        this.waveActive = false;
        this.waveTimer = CONFIG.TIMING.INITIAL_WAVE_DELAY_MS;
        this.spawnTimer = 0;
        this.enemiesToSpawn = 0;
        this.enemiesSpawned = 0;
        this.hpMultiplier = 1;
        this.enemyIdCounter = 0;
        
        this.coreX = CONFIG.GRID_SIZE / 2;
        this.coreY = CONFIG.GRID_SIZE / 2;
        this.difficultyId = 'NORMAL';
        this.ddosSwarmSpawned = false;
        this.ddosBotsToSpawn = 0;
        this.ddosRewardGranted = false;

        EventBus.on('ENEMY_KILLED', ({ id, type, rewardSilicon }: { id: string; type: string; rewardSilicon: number }) => {
            this.enemies.delete(id);
            this.grantSiliconReward(rewardSilicon);
            if (type === 'DDOS_BOT') {
                this.tryGrantDdosSwarmReward();
            }
            if (this.waveActive && this.enemies.size === 0 && this.enemiesSpawned >= this.enemiesToSpawn) {
                this.endWave();
            }
        });

        EventBus.on('GAME_OVER', () => {
            this.waveActive = false;
            this.enemies.forEach(e => {
                if (e.active) e.die();
            });
            this.enemies.clear();
        });
    }

    setDifficulty(difficultyId: string): void {
        this.difficultyId = CONFIG.DIFFICULTY[difficultyId] ? difficultyId : 'NORMAL';
    }

    getDifficulty() {
        return CONFIG.DIFFICULTY[this.difficultyId] || CONFIG.DIFFICULTY.NORMAL;
    }

    startWave(): void {
        this.currentWave++;
        this.waveActive = true;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.ddosSwarmSpawned = false;
        this.ddosBotsToSpawn = this.currentWave >= 8 ? Phaser.Math.Between(8, 12) : 0;
        this.ddosRewardGranted = false;
        
        if (this.currentWave <= 5) {
            this.enemiesToSpawn = 4 + this.currentWave;
            this.hpMultiplier = 1;
        } else if (this.currentWave <= 15) {
            this.enemiesToSpawn = 8 + Math.floor(this.currentWave * 1.5);
            this.hpMultiplier = 1.25 + (this.currentWave - 5) * 0.04;
        } else {
            this.enemiesToSpawn = 18 + Math.floor(this.currentWave * 1.8);
            this.hpMultiplier = 1.8 + (this.currentWave - 15) * 0.12;
        }

        // Add 1 extra boss enemy every 10 waves
        if (this.currentWave % 10 === 0) {
            this.enemiesToSpawn += 1;
        }

        this.enemiesToSpawn = Math.max(1, Math.round(this.enemiesToSpawn * this.getDifficulty().ENEMY_SPAWN_MULTIPLIER));
        this.enemiesToSpawn += this.ddosBotsToSpawn;

        EventBus.emit('WAVE_STARTED', { wave: this.currentWave });
    }

    endWave(): void {
        this.waveActive = false;
        this.waveTimer = this.getDifficulty().WAVE_COOLDOWN_MS;
        EventBus.emit('WAVE_ENDED', { wave: this.currentWave });
    }

    spawnEnemy(typeOverride?: string): void {
        this.enemiesSpawned++;
        const id = `enemy_${this.enemyIdCounter++}`;
        
        const edge = Math.floor(Math.random() * 4);
        const mapSize = 60 * CONFIG.GRID_SIZE;
        let x = 0, y = 0;
        switch(edge) {
            case 0: x = -mapSize/2 + Math.random() * mapSize; y = -mapSize/2; break;
            case 1: x = mapSize/2; y = -mapSize/2 + Math.random() * mapSize; break;
            case 2: x = -mapSize/2 + Math.random() * mapSize; y = mapSize/2; break;
            case 3: x = -mapSize/2; y = -mapSize/2 + Math.random() * mapSize; break;
        }

        let type = typeOverride || 'NOISE';
        const isBossWave = this.currentWave % 10 === 0;
        
        // If it's a boss wave and it's the last enemy to spawn, make it a boss
        if (!typeOverride && isBossWave && this.enemiesSpawned === this.enemiesToSpawn) {
            type = 'OVERFITTED_MODEL';
            const uiManager = (this.scene as any).uiManager;
            if (uiManager) uiManager.logMessage('System: WARNING - Overfitted Model detected!', true);
        } else if (!typeOverride) {
            if (this.currentWave > 5 && Math.random() < 0.3) type = 'MALWARE';
            if (this.currentWave > 15 && Math.random() < 0.2) type = 'ADVERSARIAL';
        }

        const enemy = new BaseEnemy(this.scene, type, x, y, this.hpMultiplier * this.getDifficulty().ENEMY_HP_MULTIPLIER, id, this.buildingManager);
        this.enemies.set(id, enemy);
    }

    spawnDdosSwarm(): void {
        if (this.ddosSwarmSpawned || this.ddosBotsToSpawn <= 0) return;
        this.ddosSwarmSpawned = true;
        const uiManager = (this.scene as any).uiManager;
        if (uiManager) uiManager.logMessage(`System: DDoS swarm detected (${this.ddosBotsToSpawn} packets)!`, true);
        for (let i = 0; i < this.ddosBotsToSpawn; i++) {
            this.spawnEnemy('DDOS_BOT');
        }
    }

    update(delta: number): void {
        if (!this.waveActive) {
            this.waveTimer -= delta;
            EventBus.emit('WAVE_UPDATE', { timer: this.waveTimer });
            if (this.waveTimer <= 0) {
                this.startWave();
            }
        } else {
            if (this.enemiesSpawned < this.enemiesToSpawn) {
                this.spawnTimer -= delta;
                if (this.spawnTimer <= 0) {
                    if (!this.ddosSwarmSpawned && this.ddosBotsToSpawn > 0 && this.enemiesSpawned >= Math.floor(this.enemiesToSpawn / 3)) {
                        this.spawnDdosSwarm();
                    } else {
                        this.spawnEnemy();
                    }
                    this.spawnTimer = CONFIG.TIMING.ENEMY_SPAWN_INTERVAL_MS;
                }
            }
        }

        this.applyBossAuras();
        this.enemies.forEach(enemy => {
            enemy.update(delta, this.coreX, this.coreY);
        });
    }

    applyBossAuras(): void {
        const bosses = Array.from(this.enemies.values()).filter(e => e.active && e.type === 'OVERFITTED_MODEL');
        this.enemies.forEach(enemy => {
            enemy.auraSpeedMultiplier = 1;
            if (enemy.type === 'OVERFITTED_MODEL') return;
            const boosted = bosses.some(boss => Phaser.Math.Distance.Between(enemy.x, enemy.y, boss.x, boss.y) <= CONFIG.GRID_SIZE * 8);
            if (boosted) enemy.auraSpeedMultiplier = 1.25;
        });
    }

    grantSiliconReward(amount: number): void {
        if (amount <= 0) return;
        amount = Math.max(1, Math.round(amount * this.getDifficulty().REWARD_MULTIPLIER));
        const buildingManager = (this.scene as any).buildingManager as BuildingManager;
        let remaining = amount;

        buildingManager.forEach(building => {
            if (remaining <= 0 || building.type !== 'STORAGE') return;
            while (remaining > 0 && building.canAcceptItem('SILICON')) {
                building.acceptItem('SILICON');
                remaining--;
            }
        });

        const uiManager = (this.scene as any).uiManager;
        if (uiManager && remaining < amount) {
            uiManager.logMessage(`System: Recovered ${amount - remaining} Silicon from enemy residue.`);
        }
    }

    tryGrantDdosSwarmReward(): void {
        if (this.ddosRewardGranted || this.ddosBotsToSpawn <= 0) return;
        const activeDdos = Array.from(this.enemies.values()).some(enemy => enemy.active && enemy.type === 'DDOS_BOT');
        if (activeDdos) return;

        this.ddosRewardGranted = true;
        this.grantSiliconReward(5);
        const uiManager = (this.scene as any).uiManager;
        if (uiManager) uiManager.logMessage('System: DDoS swarm scrubbed. Silicon bounty recovered.');
    }

    getEnemiesInRange(x: number, y: number, range: number): BaseEnemy[] {
        const inRange: BaseEnemy[] = [];
        this.enemies.forEach(enemy => {
            if (!enemy.active) return;
            const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (dist <= range * CONFIG.GRID_SIZE) {
                inRange.push(enemy);
            }
        });
        return inRange;
    }
}
