import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { CURRENT_SAVE_VERSION, migrateSaveData } from './saveMigration';

describe('migrateSaveData', () => {
    it('fills required save sections for empty input', () => {
        const migrated = migrateSaveData({}, 'HARD');

        expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
        expect(migrated.wave.currentWave).toBe(0);
        expect(migrated.wave.waveTimer).toBe(CONFIG.TIMING.INITIAL_WAVE_DELAY_MS);
        expect(migrated.core.hp).toBe(CONFIG.BUILDINGS.CORE.HP);
        expect(migrated.buildings).toEqual([]);
        expect(migrated.items).toEqual([]);
        expect(migrated.cables).toEqual([]);
        expect(migrated.resourceMap).toEqual([]);
        expect(migrated.terrainMap).toEqual([]);
        expect(migrated.research).toEqual([]);
        expect(migrated.settings.difficulty).toBe('HARD');
        expect(migrated.settings.language).toBe('ko');
    });

    it('normalizes building buffers and rotations', () => {
        const migrated = migrateSaveData({
            buildings: [
                { x: 32, y: 64, type: 'PROCESSOR' },
                { x: 96, y: 64, type: 'STORAGE', rotation: 2, inputBuffer: ['SILICON'], hp: 123 }
            ]
        });

        expect(migrated.buildings[0]).toMatchObject({
            x: 32,
            y: 64,
            type: 'PROCESSOR',
            rotation: 0,
            inputBuffer: [],
            outputBuffer: []
        });
        expect(migrated.buildings[1]).toMatchObject({
            rotation: 2,
            inputBuffer: ['SILICON'],
            outputBuffer: [],
            hp: 123
        });
    });

    it('preserves existing settings while filling missing settings defaults', () => {
        const migrated = migrateSaveData({
            version: CURRENT_SAVE_VERSION,
            settings: {
                gameSpeed: 3,
                showPowerGrid: true,
                difficulty: 'EASY',
                language: 'en',
                muted: true
            }
        });

        expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
        expect(migrated.settings.gameSpeed).toBe(3);
        expect(migrated.settings.showPowerGrid).toBe(true);
        expect(migrated.settings.showDefenseRange).toBe(false);
        expect(migrated.settings.difficulty).toBe('EASY');
        expect(migrated.settings.language).toBe('en');
        expect(migrated.settings.masterVolume).toBe(0.6);
        expect(migrated.settings.muted).toBe(true);
    });
});
