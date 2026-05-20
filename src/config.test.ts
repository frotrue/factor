import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';

describe('CONFIG integrity', () => {
    const texturedBuildingIds = [
        'CORE',
        'MINER',
        'CONVEYOR',
        'FAST_LINK',
        'STORAGE',
        'PROCESSOR',
        'POWER_NODE',
        'POWER_PLANT',
        'CLASSIFIER',
        'FILTER',
        'FIREWALL'
    ];

    it('references existing research nodes from unlock requirements', () => {
        const researchIds = new Set(Object.keys(CONFIG.RESEARCH));
        const missing: string[] = [];

        Object.values(CONFIG.BUILDINGS).forEach(building => {
            if (building.UNLOCK_REQUIRED && !researchIds.has(building.UNLOCK_REQUIRED)) {
                missing.push(`building:${building.ID}->${building.UNLOCK_REQUIRED}`);
            }
        });

        Object.values(CONFIG.CABLES).forEach(cable => {
            if (cable.UNLOCK_REQUIRED && !researchIds.has(cable.UNLOCK_REQUIRED)) {
                missing.push(`cable:${cable.ID}->${cable.UNLOCK_REQUIRED}`);
            }
        });

        expect(missing).toEqual([]);
    });

    it('references existing unlock targets from research nodes', () => {
        const buildingIds = new Set(Object.keys(CONFIG.BUILDINGS));
        const recipeIds = new Set(Object.keys(CONFIG.RECIPES));
        const cableIds = new Set(Object.keys(CONFIG.CABLES));
        const missing: string[] = [];

        Object.values(CONFIG.RESEARCH).forEach(research => {
            research.UNLOCKS.BUILDINGS?.forEach(id => {
                if (!buildingIds.has(id)) missing.push(`research:${research.ID}->building:${id}`);
            });
            research.UNLOCKS.RECIPES?.forEach(id => {
                if (!recipeIds.has(id)) missing.push(`research:${research.ID}->recipe:${id}`);
            });
            research.UNLOCKS.CABLES?.forEach(id => {
                if (!cableIds.has(id)) missing.push(`research:${research.ID}->cable:${id}`);
            });
            research.REQUIREMENTS?.forEach(id => {
                if (!CONFIG.RESEARCH[id]) missing.push(`research:${research.ID}->requires:${id}`);
            });
        });

        expect(missing).toEqual([]);
    });

    it('references existing items from recipes', () => {
        const itemIds = new Set(Object.keys(CONFIG.ITEMS));
        const virtualInputs = new Set(['ANY_DATA']);
        const missing: string[] = [];

        Object.values(CONFIG.RECIPES).forEach(recipe => {
            recipe.INPUTS.forEach(input => {
                if (!itemIds.has(input.type) && !virtualInputs.has(input.type)) {
                    missing.push(`recipe:${recipe.OUTPUT}->input:${input.type}`);
                }
            });
            if (!itemIds.has(recipe.OUTPUT)) {
                missing.push(`recipe:${recipe.OUTPUT}->output:${recipe.OUTPUT}`);
            }
        });

        expect(missing).toEqual([]);
    });

    it('keeps late-game logistics and inference loops reachable', () => {
        expect(CONFIG.RESEARCH.TECH_FIBER_OPTIC).toBeDefined();
        expect(CONFIG.CABLES.FIBER.UNLOCK_REQUIRED).toBe('TECH_FIBER_OPTIC');
        expect(CONFIG.RESOURCE_PATCHES.ENERGY).toBeDefined();
        expect(CONFIG.RECIPES.INFERENCE_UNIT_PRODUCTION.OUTPUT).toBe('INFERENCE_UNIT');
    });

    it('assigns neon building textures to the core visual upgrade set', () => {
        const missing = texturedBuildingIds.filter(id => !CONFIG.BUILDINGS[id]?.TEXTURE);

        expect(missing).toEqual([]);
        texturedBuildingIds.forEach(id => {
            expect(CONFIG.BUILDINGS[id].TEXTURE).toBe(`building-${id.toLowerCase().replaceAll('_', '-')}`);
        });
    });

    it('uses a 4x4 footprint for the neural core', () => {
        expect(CONFIG.BUILDINGS.CORE.WIDTH).toBe(4);
        expect(CONFIG.BUILDINGS.CORE.HEIGHT).toBe(4);
    });

    it('assigns positive durability to every building', () => {
        const missingDurability = Object.values(CONFIG.BUILDINGS)
            .filter(building => !building.HP || building.HP <= 0)
            .map(building => building.ID);

        expect(missingDurability).toEqual([]);
    });

    it('defines blocker terrain for lane shaping', () => {
        expect(CONFIG.TERRAIN.BLOCKER).toMatchObject({
            ID: 'BLOCKER',
            BLOCKS_BUILDING: true,
            BLOCKS_ENEMY: true
        });
    });
});
