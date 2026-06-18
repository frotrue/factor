import Phaser from 'phaser';
import BaseEnemy from '../enemies/BaseEnemy';
import { CONFIG, CORE_KEY, CORE_PIXEL_X, CORE_PIXEL_Y } from '../config';
import EventBus from './EventBus';
import BuildingManager from './BuildingManager';
import { IMainScene } from '../types';
import {
    createWaveBriefing,
    createWavePlan,
    getSpawnPointForRoute,
    selectActiveIntrusionRoutes
} from '../utils/waveSimulation';
import { getWaveBriefingKey } from '../utils/waveBriefingKey';
import { getFootprintCenter, type Point } from '../utils/geometry';
import { TUTORIAL_STEP_DEFINITIONS } from '../utils/tutorialFlow';
import type { IntrusionRoute } from '../utils/waveSimulation';

const TUTORIAL_FIRST_WAVE_INDEX = TUTORIAL_STEP_DEFINITIONS.findIndex(step => step.id === 'FIRST_WAVE');
const ENEMY_SPATIAL_BUCKET_SIZE = CONFIG.GRID_SIZE * 4;

export default class WaveManager {
    scene: IMainScene;
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
    difficultyId: string;
    ddosSwarmSpawned: boolean;
    ddosBotsToSpawn: number;
    ddosRewardGranted: boolean;
    activeRoutes: IntrusionRoute[];
    lastBriefingKey: string | null;
    private lastWaveTimerSecond: number;
    private enemySpatialBuckets: Map<string, BaseEnemy[]>;
    private enemySpatialDirty: boolean;

    constructor(scene: IMainScene, buildingManager: BuildingManager) {
        this.scene = scene;
        this.buildingManager = buildingManager;
        this.enemies = new Map();
        this.currentWave = 0;
        this.waveActive = false;
        this.waveTimer = scene.mode === 'campaign'
            ? CONFIG.TIMING.CAMPAIGN_INITIAL_WAVE_DELAY_MS
            : CONFIG.TIMING.INITIAL_WAVE_DELAY_MS;
        this.spawnTimer = 0;
        this.enemiesToSpawn = 0;
        this.enemiesSpawned = 0;
        this.hpMultiplier = 1;
        this.enemyIdCounter = 0;

        this.difficultyId = 'NORMAL';
        this.ddosSwarmSpawned = false;
        this.ddosBotsToSpawn = 0;
        this.ddosRewardGranted = false;
        this.activeRoutes = selectActiveIntrusionRoutes(1, this.difficultyId);
        this.lastBriefingKey = null;
        this.lastWaveTimerSecond = -1;
        this.enemySpatialBuckets = new Map();
        this.enemySpatialDirty = true;
        EventBus.on('ENEMY_KILLED', ({ id, type, rewardSilicon }: { id: string; type: string; rewardSilicon: number }) => {
            this.enemies.delete(id);
            this.enemySpatialDirty = true;
            this.grantSiliconReward(rewardSilicon);
            if (type === 'DDOS_BOT') {
                this.tryGrantDdosSwarmReward();
            }
            if (this.waveActive && this.enemies.size === 0 && this.enemiesSpawned >= this.enemiesToSpawn) {
                this.endWave();
            }
        }, 'WaveManager');

        EventBus.on('GAME_OVER', () => {
            this.waveActive = false;
            this.enemies.forEach(e => {
                if (e.active) e.die();
            });
            this.enemies.clear();
            this.enemySpatialBuckets.clear();
            this.enemySpatialDirty = true;
        }, 'WaveManager');
    }

    setDifficulty(difficultyId: string): void {
        this.difficultyId = CONFIG.DIFFICULTY[difficultyId] ? difficultyId : 'NORMAL';
        this.activeRoutes = selectActiveIntrusionRoutes(this.currentWave || 1, this.difficultyId);
        this.emitNextWaveBriefing();
    }

    getDifficulty() {
        return CONFIG.DIFFICULTY[this.difficultyId] || CONFIG.DIFFICULTY.NORMAL;
    }

    getEffectiveHpMultiplier(): number {
        return this.hpMultiplier * this.getDifficulty().ENEMY_HP_MULTIPLIER;
    }

    getCoreTarget(): Point {
        const core = this.buildingManager.get(CORE_KEY);
        if (core) {
            const coreConfig = CONFIG.BUILDINGS[core.type];
            return getFootprintCenter(core.x, core.y, coreConfig.WIDTH || 1, coreConfig.HEIGHT || 1, CONFIG.GRID_SIZE);
        }

        const coreConfig = CONFIG.BUILDINGS.CORE;
        return getFootprintCenter(CORE_PIXEL_X, CORE_PIXEL_Y, coreConfig.WIDTH || 1, coreConfig.HEIGHT || 1, CONFIG.GRID_SIZE);
    }

    startWave(): void {
        this.currentWave++;
        this.waveActive = true;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.ddosSwarmSpawned = false;
        this.lastWaveTimerSecond = -1;

        const tm = this.scene.tutorialManager;
        const isTutorialFirstWave = tm && !tm.isCompleted() && tm.getSavedStep() === TUTORIAL_FIRST_WAVE_INDEX;

        if (isTutorialFirstWave) {
            this.ddosBotsToSpawn = 0;
            this.enemiesToSpawn = 1;
            this.hpMultiplier = 0.5;
            this.ddosRewardGranted = true;
        } else {
            this.ddosBotsToSpawn = this.currentWave >= 8 ? Phaser.Math.Between(6, 8) : 0;
            this.ddosRewardGranted = false;
        }

        this.activeRoutes = selectActiveIntrusionRoutes(this.currentWave, this.difficultyId);

        const plan = createWavePlan({
            wave: this.currentWave,
            difficultyId: this.difficultyId,
            ddosBots: this.ddosBotsToSpawn
        });

        if (isTutorialFirstWave) {
            this.enemiesToSpawn = 1;
            this.hpMultiplier = 0.5;
        } else {
            this.enemiesToSpawn = plan.enemiesToSpawn;
            this.hpMultiplier = plan.hpMultiplier;
        }

        EventBus.emit('WAVE_STARTED', { wave: this.currentWave, routes: this.activeRoutes.map(route => route.id) });
    }

    endWave(): void {
        this.waveActive = false;
        this.waveTimer = this.getDifficulty().WAVE_COOLDOWN_MS;
        EventBus.emit('WAVE_ENDED', { wave: this.currentWave });
        this.emitNextWaveBriefing();
        this.emitWaveTimerUpdate(true);
    }

    private emitNextWaveBriefing(): void {
        const nextWave = this.currentWave + 1;
        const briefingKey = getWaveBriefingKey(nextWave, this.difficultyId);
        if (briefingKey === this.lastBriefingKey) return;
        this.lastBriefingKey = briefingKey;
        EventBus.emit('WAVE_BRIEFING_UPDATED', createWaveBriefing(nextWave, this.difficultyId));
    }

    private emitWaveTimerUpdate(force = false): void {
        const timerSecond = Math.max(0, Math.ceil(this.waveTimer / 1000));
        if (!force && timerSecond === this.lastWaveTimerSecond) return;

        this.lastWaveTimerSecond = timerSecond;
        EventBus.emit('WAVE_UPDATE', { timer: this.waveTimer });
    }

    spawnEnemy(typeOverride?: string): void {
        this.enemiesSpawned++;
        const id = `enemy_${this.enemyIdCounter++}`;

        const routes = this.activeRoutes.length > 0 ? this.activeRoutes : selectActiveIntrusionRoutes(this.currentWave || 1, this.difficultyId);
        const route = routes[(this.enemiesSpawned - 1) % routes.length];
        const tm = this.scene.tutorialManager;
        const isTutorialMockWave = tm && !tm.isCompleted() && tm.getSavedStep() === TUTORIAL_FIRST_WAVE_INDEX;
        const spawnPoint = isTutorialMockWave
            ? { x: 0, y: -9 * CONFIG.GRID_SIZE }
            : getSpawnPointForRoute(route.id, 0.5 + Phaser.Math.FloatBetween(-0.08, 0.08));

        let type = typeOverride || 'NOISE';

        if (isTutorialMockWave) {
            type = 'NOISE';
        } else {
            const isBossWave = this.currentWave % 10 === 0;

            // If it's a boss wave and it's the last enemy to spawn, make it a boss
            if (!typeOverride && isBossWave && this.enemiesSpawned === this.enemiesToSpawn) {
                type = 'OVERFITTED_MODEL';
                this.logMessage('System: WARNING - Overfitted Model detected!', true);
            } else if (!typeOverride) {
                if (this.currentWave > 5 && Math.random() < 0.3) type = 'MALWARE';
                if (this.currentWave > 15 && Math.random() < 0.2) type = 'ADVERSARIAL';
            }
        }

        const enemy = new BaseEnemy(this.scene, type, spawnPoint.x, spawnPoint.y, this.getEffectiveHpMultiplier(), id, this.buildingManager);

        if (isTutorialMockWave) {
            enemy.speed = enemy.speed * 0.3; // 30% speed
        }

        this.enemies.set(id, enemy);
        this.enemySpatialDirty = true;
    }

    spawnDdosSwarm(): void {
        if (this.ddosSwarmSpawned || this.ddosBotsToSpawn <= 0) return;
        this.ddosSwarmSpawned = true;
        this.logMessage(`System: DDoS swarm detected (${this.ddosBotsToSpawn} packets)!`, true);
        for (let i = 0; i < this.ddosBotsToSpawn; i++) {
            this.spawnEnemy('DDOS_BOT');
        }
    }

    update(delta: number): void {
        const tm = this.scene.tutorialManager;
        const isTutorialActive = tm && !tm.isCompleted();
        const savedStep = isTutorialActive ? tm.getSavedStep() : -1;

        if (isTutorialActive) {
            if (savedStep < TUTORIAL_FIRST_WAVE_INDEX) {
                // Tutorial setup steps: freeze waveTimer until defense placement opens the first wave.
                this.waveTimer = CONFIG.TIMING.INITIAL_WAVE_DELAY_MS;
                this.emitWaveTimerUpdate();

                // Still update existing enemies if any (unlikely in early tutorial)
                this.applyBossAuras();
                const coreTarget = this.getCoreTarget();
                this.enemies.forEach(enemy => {
                    enemy.update(delta, coreTarget.x, coreTarget.y);
                });
                return;
            } else if (savedStep === TUTORIAL_FIRST_WAVE_INDEX) {
                // FIRST_WAVE: trigger the tutorial mock wave after any defense is online.
                const hasDefense = this.buildingManager.countByTypes(['CLASSIFIER', 'FIREWALL', 'FILTER']) > 0;

                if (!this.waveActive && hasDefense) {
                    // Trigger the tutorial mock wave immediately!
                    this.startWave();
                } else if (!this.waveActive) {
                    // Keep the timer frozen at initial delay until the defense is built.
                    this.waveTimer = CONFIG.TIMING.INITIAL_WAVE_DELAY_MS;
                    this.emitWaveTimerUpdate();
                    return;
                }
            } else if (savedStep > TUTORIAL_FIRST_WAVE_INDEX) {
                this.waveTimer = CONFIG.TIMING.INITIAL_WAVE_DELAY_MS;
                this.emitWaveTimerUpdate();
                return;
            }
        }

        if (!this.waveActive) {
            this.waveTimer -= delta;
            this.emitNextWaveBriefing();
            this.emitWaveTimerUpdate();
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
        const coreTarget = this.getCoreTarget();
        this.enemies.forEach(enemy => {
            enemy.update(delta, coreTarget.x, coreTarget.y);
        });
        this.enemySpatialDirty = true;
    }

    applyBossAuras(): void {
        // Quick scan: count bosses without allocating a filtered array
        let hasBoss = false;
        this.enemies.forEach(e => {
            if (e.active && e.type === 'OVERFITTED_MODEL') hasBoss = true;
        });

        if (!hasBoss) {
            // Reset all multipliers without boss distance checks
            this.enemies.forEach(enemy => {
                enemy.auraSpeedMultiplier = 1;
            });
            return;
        }

        // Collect bosses only when we know there are some
        const bosses: BaseEnemy[] = [];
        this.enemies.forEach(e => {
            if (e.active && e.type === 'OVERFITTED_MODEL') bosses.push(e);
        });

        this.enemies.forEach(enemy => {
            enemy.auraSpeedMultiplier = 1;
            if (enemy.type === 'OVERFITTED_MODEL') return;
            for (let i = 0; i < bosses.length; i++) {
                if (Phaser.Math.Distance.Between(enemy.x, enemy.y, bosses[i].x, bosses[i].y) <= CONFIG.GRID_SIZE * 8) {
                    enemy.auraSpeedMultiplier = 1.25;
                    break;
                }
            }
        });
    }

    grantSiliconReward(amount: number): void {
        if (amount <= 0) return;
        amount = Math.max(1, Math.round(amount * this.getDifficulty().REWARD_MULTIPLIER));
        const buildingManager = this.scene.buildingManager;
        let remaining = amount;

        buildingManager.getByType('STORAGE').forEach(building => {
            if (remaining <= 0 || building.type !== 'STORAGE') return;
            while (remaining > 0 && building.canAcceptItem('SILICON')) {
                building.acceptItem('SILICON');
                remaining--;
            }
        });

        if (remaining < amount) {
            this.logMessage(`System: Recovered ${amount - remaining} Silicon from enemy residue.`);
        }
    }

    tryGrantDdosSwarmReward(): void {
        if (this.ddosRewardGranted || this.ddosBotsToSpawn <= 0) return;
        const activeDdos = Array.from(this.enemies.values()).some(enemy => enemy.active && enemy.type === 'DDOS_BOT');
        if (activeDdos) return;

        this.ddosRewardGranted = true;
        this.grantSiliconReward(5);
        this.logMessage('System: DDoS swarm scrubbed. Silicon bounty recovered.');
    }

    private logMessage(message: string, isAlert: boolean = false): void {
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', { message, isAlert });
    }

    getEnemiesInRange(x: number, y: number, range: number): BaseEnemy[] {
        this.scene.performanceStats?.increment('enemyRangeQueries');
        this.ensureEnemySpatialIndex();

        const inRange: BaseEnemy[] = [];
        const maxDist = range * CONFIG.GRID_SIZE;
        const maxDistSq = maxDist * maxDist;
        const bucketRadius = Math.ceil(maxDist / ENEMY_SPATIAL_BUCKET_SIZE);
        const centerBucketX = Math.floor(x / ENEMY_SPATIAL_BUCKET_SIZE);
        const centerBucketY = Math.floor(y / ENEMY_SPATIAL_BUCKET_SIZE);

        for (let bx = centerBucketX - bucketRadius; bx <= centerBucketX + bucketRadius; bx++) {
            for (let by = centerBucketY - bucketRadius; by <= centerBucketY + bucketRadius; by++) {
                const bucket = this.enemySpatialBuckets.get(`${bx},${by}`);
                if (!bucket) continue;

                for (const enemy of bucket) {
                    if (!enemy.active) continue;
                    const dx = x - enemy.x;
                    const dy = y - enemy.y;
                    if (dx * dx + dy * dy <= maxDistSq) {
                        inRange.push(enemy);
                    }
                }
            }
        }
        return inRange;
    }

    private ensureEnemySpatialIndex(): void {
        if (!this.enemySpatialDirty) return;

        this.enemySpatialBuckets.clear();
        this.enemies.forEach(enemy => {
            if (!enemy.active) return;
            const key = this.getEnemySpatialBucketKey(enemy.x, enemy.y);
            const bucket = this.enemySpatialBuckets.get(key);
            if (bucket) {
                bucket.push(enemy);
            } else {
                this.enemySpatialBuckets.set(key, [enemy]);
            }
        });
        this.enemySpatialDirty = false;
    }

    private getEnemySpatialBucketKey(x: number, y: number): string {
        return `${Math.floor(x / ENEMY_SPATIAL_BUCKET_SIZE)},${Math.floor(y / ENEMY_SPATIAL_BUCKET_SIZE)}`;
    }
}
