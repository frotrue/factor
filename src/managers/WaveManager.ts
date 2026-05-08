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

    constructor(scene: Phaser.Scene, buildingManager: BuildingManager) {
        this.scene = scene;
        this.buildingManager = buildingManager;
        this.enemies = new Map();
        this.currentWave = 0;
        this.waveActive = false;
        this.waveTimer = 30000;
        this.spawnTimer = 0;
        this.enemiesToSpawn = 0;
        this.enemiesSpawned = 0;
        this.hpMultiplier = 1;
        this.enemyIdCounter = 0;
        
        this.coreX = CONFIG.GRID_SIZE / 2;
        this.coreY = CONFIG.GRID_SIZE / 2;

        EventBus.on('ENEMY_KILLED', ({ id }: { id: string }) => {
            this.enemies.delete(id);
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

    startWave(): void {
        this.currentWave++;
        this.waveActive = true;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        
        if (this.currentWave <= 5) {
            this.enemiesToSpawn = 5 + this.currentWave;
            this.hpMultiplier = 1;
        } else if (this.currentWave <= 15) {
            this.enemiesToSpawn = 10 + this.currentWave * 2;
            this.hpMultiplier = 1.5;
        } else {
            this.enemiesToSpawn = 20 + this.currentWave * 2;
            this.hpMultiplier = 2.5 + (this.currentWave - 15) * 0.15;
        }

        // Add 1 extra boss enemy every 10 waves
        if (this.currentWave % 10 === 0) {
            this.enemiesToSpawn += 1;
        }

        EventBus.emit('WAVE_STARTED', { wave: this.currentWave });
    }

    endWave(): void {
        this.waveActive = false;
        this.waveTimer = 20000;
        EventBus.emit('WAVE_ENDED', { wave: this.currentWave });
    }

    spawnEnemy(): void {
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

        let type = 'NOISE';
        const isBossWave = this.currentWave % 10 === 0;
        
        // If it's a boss wave and it's the last enemy to spawn, make it a boss
        if (isBossWave && this.enemiesSpawned === this.enemiesToSpawn) {
            type = 'OVERFITTED_MODEL';
            const uiManager = (this.scene as any).uiManager;
            if (uiManager) uiManager.logMessage('System: WARNING - Overfitted Model detected!', true);
        } else {
            if (this.currentWave > 5 && Math.random() < 0.3) type = 'MALWARE';
            if (this.currentWave > 15 && Math.random() < 0.2) type = 'ADVERSARIAL';
        }

        const enemy = new BaseEnemy(this.scene, type, x, y, this.hpMultiplier, id, this.buildingManager);
        this.enemies.set(id, enemy);
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
                    this.spawnEnemy();
                    this.spawnTimer = 1000;
                }
            }
        }

        this.enemies.forEach(enemy => {
            enemy.update(delta, this.coreX, this.coreY);
        });
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
