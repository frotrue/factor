import { describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../config';
import DefenseTower from './DefenseTower';

vi.mock('phaser', () => ({
    default: {
        Math: {
            Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
            Distance: {
                Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1)
            }
        }
    }
}));

function createTower(effectValue: number): any {
    return {
        scene: {
            researchManager: {
                getEffectValue: vi.fn((effect: string, defaultValue: number) => {
                    if (effect === 'TOWER_ACCURACY_BONUS') return effectValue;
                    if (effect === 'TOWER_DAMAGE_MULTIPLIER') return 1.25;
                    return defaultValue;
                })
            },
            waveManager: {
                getEnemiesInRange: vi.fn(() => [])
            },
            effectsManager: {
                setInferenceLock: vi.fn(),
                clearInferenceLock: vi.fn()
            }
        },
        type: 'CLASSIFIER',
        x: 0,
        y: 0,
        inputBuffer: [],
        fireTimer: 5,
        lockedTarget: null
    };
}

describe('DefenseTower research effects', () => {
    it('uses baseline accuracy plus additive research bonus with clamps', () => {
        expect(DefenseTower.prototype.getHitChance.call(createTower(0))).toBeCloseTo(0.65);
        expect(DefenseTower.prototype.getHitChance.call(createTower(0.1))).toBeCloseTo(0.75);
        expect(DefenseTower.prototype.getHitChance.call(createTower(1))).toBeCloseTo(0.95);
        expect(DefenseTower.prototype.getHitChance.call(createTower(-1))).toBeCloseTo(0.05);
    });

    it('keeps final hit chance independent of enemy model multipliers', () => {
        const target = {
            getHitChanceMultiplier: vi.fn(() => 0)
        };

        expect(DefenseTower.prototype.getFinalHitChance.call(createTower(0), target as any, 0.75)).toBeCloseTo(0.75);
    });

    it('fires with permanent research damage multiplier and research hit chance', () => {
        const enemy = {
            active: true,
            x: CONFIG.GRID_SIZE,
            y: 0
        };
        const tower = createTower(0.1);
        tower.scene.waveManager.getEnemiesInRange = vi.fn(() => [enemy]);
        tower.getHitChance = DefenseTower.prototype.getHitChance;
        tower.getClassifierTarget = DefenseTower.prototype.getClassifierTarget;
        tower.resolveShot = vi.fn();
        tower.clearLockedTarget = vi.fn();
        tower.getLockKey = vi.fn(() => 'CLASSIFIER:0,0');

        DefenseTower.prototype.tryFire.call(tower, {
            AMMO_CONSUMPTION: 0,
            DAMAGE: 10,
            FIRE_RATE: 5,
            IS_AOE: false,
            RANGE: 4
        });

        expect(tower.resolveShot).toHaveBeenCalledWith(enemy, 12.5, 0.75);
        expect(tower.fireTimer).toBe(0);
    });
});
