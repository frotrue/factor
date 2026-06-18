import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG, CORE_KEY } from '../config';
import { TUTORIAL_STEP_DEFINITIONS } from '../utils/tutorialFlow';
import EventBus from './EventBus';
import WaveManager from './WaveManager';

const enemyInstances = vi.hoisted((): any[] => []);

vi.mock('phaser', () => ({
    default: {
        Math: {
            Between: vi.fn((min: number) => min),
            FloatBetween: vi.fn(() => 0),
            Distance: {
                Between: vi.fn((x1: number, y1: number, x2: number, y2: number) => Math.hypot(x1 - x2, y1 - y2))
            }
        }
    }
}));

vi.mock('../enemies/BaseEnemy', () => ({
    default: class MockBaseEnemy {
        active = true;
        speed = 1;
        auraSpeedMultiplier = 1;
        maxHp = 100;
        hp = 100;

        constructor(
            _scene: any,
            public type: string,
            public x: number,
            public y: number,
            _hpMultiplier: number,
            public id: string
        ) {
            enemyInstances.push(this);
        }

        update(): void {}

        die(): void {
            this.active = false;
        }

        drawHpBar(): void {}
    }
}));

const FIRST_WAVE_INDEX = TUTORIAL_STEP_DEFINITIONS.findIndex(step => step.id === 'FIRST_WAVE');

function createStorage() {
    let accepted = 0;
    return {
        type: 'STORAGE',
        canAcceptItem: vi.fn(() => accepted < 100),
        acceptItem: vi.fn(() => {
            accepted++;
        }),
        get accepted() {
            return accepted;
        }
    };
}

function createBuildingManager(options: { defenseCount?: number; storage?: any } = {}) {
    return {
        get: (key: string) => key === CORE_KEY
            ? { type: 'CORE', x: 0, y: 0 }
            : null,
        countByTypes: (types: string[]) => types.some(type => ['CLASSIFIER', 'FIREWALL', 'FILTER'].includes(type))
            ? options.defenseCount ?? 0
            : 0,
        getByType: (type: string) => type === 'STORAGE' && options.storage ? [options.storage] : []
    } as any;
}

function createScene(options: { mode?: 'tutorial' | 'campaign'; tutorialStep?: number; tutorialCompleted?: boolean; defenseCount?: number; storage?: any } = {}) {
    const buildingManager = createBuildingManager(options);
    return {
        buildingManager,
        mode: options.mode ?? 'campaign',
        tutorialManager: typeof options.tutorialStep === 'number'
            ? {
                isCompleted: () => options.tutorialCompleted ?? false,
                getSavedStep: () => options.tutorialStep
            }
            : undefined,
        performanceStats: { increment: vi.fn() }
    } as any;
}

describe('WaveManager', () => {
    beforeEach(() => {
        EventBus.offAll('WaveManager');
        enemyInstances.length = 0;
    });

    afterEach(() => {
        EventBus.offAll('WaveManager');
    });

    it('uses a longer initial wave delay for fresh campaign starts only', () => {
        const campaignScene = createScene({ mode: 'campaign' });
        const tutorialScene = createScene({ mode: 'tutorial' });

        const campaignManager = new WaveManager(campaignScene, campaignScene.buildingManager);
        const tutorialManager = new WaveManager(tutorialScene, tutorialScene.buildingManager);

        expect(campaignManager.waveTimer).toBe(CONFIG.TIMING.CAMPAIGN_INITIAL_WAVE_DELAY_MS);
        expect(tutorialManager.waveTimer).toBe(CONFIG.TIMING.INITIAL_WAVE_DELAY_MS);
    });

    it('freezes the wave timer during early tutorial setup steps', () => {
        const scene = createScene({ mode: 'tutorial', tutorialStep: 0 });
        const manager = new WaveManager(scene, scene.buildingManager);
        manager.waveTimer = 1234;

        manager.update(5000);

        expect(manager.waveTimer).toBe(CONFIG.TIMING.INITIAL_WAVE_DELAY_MS);
        expect(manager.waveActive).toBe(false);
        expect(enemyInstances).toHaveLength(0);
    });

    it('starts the tutorial mock wave when first-wave step has a defense online', () => {
        const scene = createScene({ tutorialStep: FIRST_WAVE_INDEX, defenseCount: 1 });
        const manager = new WaveManager(scene, scene.buildingManager);

        manager.update(1000);

        expect(manager.currentWave).toBe(1);
        expect(manager.waveActive).toBe(true);
        expect(manager.enemiesToSpawn).toBe(1);
        expect(manager.hpMultiplier).toBe(0.5);
        expect(enemyInstances[0]).toMatchObject({ type: 'NOISE', speed: 0.3 });
    });

    it('spawns the final enemy as a boss on every tenth wave', () => {
        const scene = createScene();
        const manager = new WaveManager(scene, scene.buildingManager);
        manager.currentWave = 10;
        manager.enemiesToSpawn = 3;
        manager.enemiesSpawned = 2;

        manager.spawnEnemy();

        expect(enemyInstances.at(-1)).toMatchObject({ type: 'OVERFITTED_MODEL' });
    });

    it('grants the DDoS swarm reward once after the final DDoS bot is removed', () => {
        const storage = createStorage();
        const scene = createScene({ storage });
        const manager = new WaveManager(scene, scene.buildingManager);
        manager.ddosBotsToSpawn = 2;
        manager.ddosRewardGranted = false;
        manager.enemies.set('bot-1', { active: true, type: 'DDOS_BOT' } as any);
        manager.enemies.set('bot-2', { active: true, type: 'DDOS_BOT' } as any);

        EventBus.emit('ENEMY_KILLED', { id: 'bot-1', type: 'DDOS_BOT', x: 0, y: 0, rewardSilicon: 0 });
        expect(storage.acceptItem).not.toHaveBeenCalled();

        EventBus.emit('ENEMY_KILLED', { id: 'bot-2', type: 'DDOS_BOT', x: 0, y: 0, rewardSilicon: 0 });
        expect(storage.acceptItem).toHaveBeenCalledTimes(5);

        EventBus.emit('ENEMY_KILLED', { id: 'bot-3', type: 'DDOS_BOT', x: 0, y: 0, rewardSilicon: 0 });
        expect(storage.acceptItem).toHaveBeenCalledTimes(5);
    });
});
