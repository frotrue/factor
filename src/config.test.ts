import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';

const RESEARCH_TICKS_PER_MINUTE = 60000 / (CONFIG.TICK_RATE * CONFIG.TIMING.TICK_RATE_MULTIPLIER * 2);

describe('CONFIG integrity', () => {
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

    it('keeps late-game logistics and tactical data production reachable', () => {
        expect(CONFIG.RESEARCH.TECH_FIBER_OPTIC).toBeDefined();
        expect(CONFIG.CABLES.FIBER.UNLOCK_REQUIRED).toBe('TECH_FIBER_OPTIC');
        expect(CONFIG.RESOURCE_PATCHES.ENERGY).toBeDefined();
        expect(CONFIG.RESOURCE_PATCHES.MATERIAL_SAMPLE).toBeDefined();
        expect(CONFIG.RECIPES.TACTICAL_DATA_SYNTHESIS).toMatchObject({
            INPUTS: [{ type: 'WEIGHT_UPDATE', amount: 1 }],
            OUTPUT: 'TACTICAL_DATA'
        });
        expect(CONFIG.BUILDINGS.RESEARCH_OPERATIONS_CENTER.NAME).toBe('Research Operations Center');
        expect(Object.hasOwn(CONFIG, 'MODEL_TRAINING')).toBe(false);
        expect('MODEL_TRAINING' in CONFIG.RECIPES).toBe(false);
        expect('INFERENCE_UNIT_PRODUCTION' in CONFIG.RECIPES).toBe(false);
    });

    it('keeps the Neural Trainer available by default', () => {
        expect(CONFIG.BUILDINGS.NEURAL_TRAINER.UNLOCK_REQUIRED).toBeUndefined();
    });

    it('defines data output amounts without legacy facility output naming', () => {
        expect(CONFIG.RESEARCH_SETTINGS.DATA_OUTPUT).toEqual({
            material: 1,
            tactical: 1,
            system: 1
        });
        expect(Object.hasOwn(CONFIG.RESEARCH_SETTINGS, 'FACILITY_OUTPUT')).toBe(false);
    });

    it('calibrates first core research as material-only early research', () => {
        const node = CONFIG.RESEARCH.CORE_BASIC_RESEARCH;

        expect(node.COST).toBe(300);
        expect(node.DATA_COSTS).toEqual({ material: 300 });

        const sampleRate = CONFIG.BUILDINGS.MINER.PRODUCTION_RATE ?? 2;
        const materialDataPerMinute = (RESEARCH_TICKS_PER_MINUTE / sampleRate)
            * CONFIG.RESEARCH_SETTINGS.DATA_OUTPUT.material;
        const minutesToSupply = (node.DATA_COSTS.material ?? 0) / materialDataPerMinute;

        expect(minutesToSupply).toBeGreaterThanOrEqual(4);
        expect(minutesToSupply).toBeLessThanOrEqual(6);
    });

    it('keeps first tactical branch entries tactical-gated', () => {
        ['TECH_PRECISION_INFERENCE', 'TECH_DATASET_ENCODING'].forEach(id => {
            const node = CONFIG.RESEARCH[id];

            expect(node.COST).toBe(100);
            expect(node.DATA_COSTS).toEqual({ tactical: 100 });
            expect(node.REQUIREMENTS).toEqual(['CORE_BASIC_RESEARCH']);
        });
    });

    it('keeps first system branch entries system-gated at desktop timing', () => {
        ['TECH_AUTO_QUEUE', 'TECH_DISTRIBUTED_AP'].forEach(id => {
            const node = CONFIG.RESEARCH[id];

            expect(node.COST).toBe(1440);
            expect(node.DATA_COSTS).toEqual({ system: 1440 });
            expect(node.REQUIREMENTS).toEqual(['CORE_BASIC_RESEARCH']);

            const systemDataPerMinute = RESEARCH_TICKS_PER_MINUTE
                * CONFIG.RESEARCH_SETTINGS.DATA_OUTPUT.system;
            const minutesToSupply = (node.DATA_COSTS.system ?? 0) / systemDataPerMinute;

            expect(minutesToSupply).toBeGreaterThanOrEqual(10);
            expect(minutesToSupply).toBeLessThanOrEqual(14);
        });
    });

    it('configures Tactical Pipeline Optimization as a speed effect', () => {
        expect(CONFIG.RESEARCH.TECH_ADVANCED_PROCESSING).toMatchObject({
            NAME: 'Tactical Pipeline Optimization',
            UNLOCKS: {},
            EFFECTS: { TACTICAL_PIPELINE_SPEED_MULTIPLIER: 0.8 }
        });
    });

    it('configures early common tower accuracy and damage research nodes', () => {
        expect(CONFIG.RESEARCH.TECH_DATASET_ENCODING).toMatchObject({
            NAME: 'Adaptive Targeting I',
            EFFECTS: { TOWER_ACCURACY_BONUS: 0.1 }
        });
        expect(CONFIG.RESEARCH.TECH_PRECISION_INFERENCE).toMatchObject({
            NAME: 'Defense Payload I',
            EFFECTS: { TOWER_DAMAGE_MULTIPLIER: 1.25 }
        });
    });

    it('keeps building visuals generated from theme graphics instead of texture assets', () => {
        const textured = Object.values(CONFIG.BUILDINGS)
            .filter(building => 'TEXTURE' in building)
            .map(building => building.ID);

        expect(textured).toEqual([]);
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
