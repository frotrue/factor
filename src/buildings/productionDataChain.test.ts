import { describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../config';
import DataCenter from './DataCenter';
import DataDownloader from './DataDownloader';
import NeuralTrainer from './NeuralTrainer';
import Processor from './Processor';
import ResearchLab from './ResearchLab';
import WeightTrainer from './WeightTrainer';

function createGraphics() {
    const graphics: any = {
        clear: vi.fn(() => graphics),
        lineStyle: vi.fn(() => graphics),
        lineBetween: vi.fn(() => graphics),
        strokeCircle: vi.fn(() => graphics),
        strokeRoundedRect: vi.fn(() => graphics),
        strokeRect: vi.fn(() => graphics),
        strokeTriangle: vi.fn(() => graphics),
        fillStyle: vi.fn(() => graphics),
        fillCircle: vi.fn(() => graphics),
        fillRect: vi.fn(() => graphics),
        fillRoundedRect: vi.fn(() => graphics),
        fillTriangle: vi.fn(() => graphics),
        beginPath: vi.fn(() => graphics),
        arc: vi.fn(() => graphics),
        strokePath: vi.fn(() => graphics),
        setDepth: vi.fn(() => graphics),
        destroy: vi.fn()
    };
    return graphics;
}

function createContainer() {
    const container: any = {
        add: vi.fn(() => container),
        destroy: vi.fn()
    };
    return container;
}

function createRectangle() {
    const rectangle: any = {
        width: 0,
        setOrigin: vi.fn(() => rectangle),
        setVisible: vi.fn(() => rectangle)
    };
    return rectangle;
}

function createScene(options: {
    getEffectValue?: (effect: string, defaultValue: number) => number;
    poweredBuildings?: Array<{ type: string; getPowerEfficiency: () => number }>;
    cableCount?: number;
    accessPointCount?: number;
} = {}) {
    const depositData = vi.fn();
    const addInsight = vi.fn();
    const getEffectValue = vi.fn(options.getEffectValue ?? ((_effect, defaultValue) => defaultValue));
    const poweredBuildings = options.poweredBuildings ?? [];
    const accessPoints = Array.from({ length: options.accessPointCount ?? 0 }, () => ({}));
    const cables = new Map(
        Array.from({ length: options.cableCount ?? 0 }, (_, index) => [String(index), {}])
    );

    const scene = {
        add: {
            container: vi.fn(() => createContainer()),
            graphics: vi.fn(() => createGraphics()),
            rectangle: vi.fn(() => createRectangle())
        },
        tweens: {
            add: vi.fn(() => ({ remove: vi.fn() }))
        },
        time: { now: 0 },
        researchManager: {
            depositData,
            addInsight,
            getEffectValue
        },
        buildingManager: {
            getUniqueBuildings: vi.fn(() => poweredBuildings),
            getByType: vi.fn((type: string) => type === 'ACCESS_POINT' ? accessPoints : [])
        },
        cableManager: { cables }
    } as any;

    return { scene, depositData, addInsight, getEffectValue };
}

describe('production data chain buildings', () => {
    it('deposits material data from ResearchLab without the legacy insight shim', () => {
        const { scene, depositData, addInsight } = createScene();
        const lab = new ResearchLab(scene, 0, 0);

        lab.inputBuffer.push('MATERIAL_SAMPLE');
        lab.onTick(1);

        expect(depositData).toHaveBeenCalledWith('material', CONFIG.RESEARCH_SETTINGS.DATA_OUTPUT.material);
        expect(addInsight).not.toHaveBeenCalled();
        expect(lab.inputBuffer).toEqual([]);
    });

    it('deposits system data from DataCenter without the legacy insight shim', () => {
        const poweredBuildings = Array.from({ length: 13 }, () => ({
            type: 'PROCESSOR',
            getPowerEfficiency: () => 1
        }));
        const { scene, depositData, addInsight } = createScene({ poweredBuildings });
        const dataCenter = new DataCenter(scene, 0, 0);

        dataCenter.onTick(1);

        expect(depositData).toHaveBeenCalledWith('system', CONFIG.RESEARCH_SETTINGS.DATA_OUTPUT.system);
        expect(addInsight).not.toHaveBeenCalled();
    });

    it('keeps DataDownloader output limited to raw data', () => {
        const { scene } = createScene();
        const downloader = new DataDownloader(scene, 0, 0);

        for (let tick = 1; tick <= 20; tick++) {
            downloader.onTick(tick);
        }

        expect(downloader.outputBuffer.length).toBeGreaterThan(0);
        expect(downloader.outputBuffer.every(item => item === 'RAW_DATA')).toBe(true);
        expect(downloader.outputBuffer).not.toContain('TACTICAL_DATA');
    });

    it('deposits NeuralTrainer tactical output instead of buffering it', () => {
        const { scene, depositData } = createScene();
        const trainer = new NeuralTrainer(scene, 0, 0);

        expect(trainer.recipe).toBe(CONFIG.RECIPES.TACTICAL_DATA_SYNTHESIS);
        trainer.inputBuffer.push('WEIGHT_UPDATE');
        trainer.onTick(1);
        for (let tick = 2; tick <= CONFIG.RECIPES.TACTICAL_DATA_SYNTHESIS.TIME + 1; tick++) {
            trainer.onTick(tick);
        }

        expect(depositData).toHaveBeenCalledWith('tactical', CONFIG.RESEARCH_SETTINGS.DATA_OUTPUT.tactical);
        expect(trainer.outputBuffer).toEqual([]);
    });

    it('applies Tactical Pipeline Optimization only to WeightTrainer and NeuralTrainer', () => {
        const getEffectValue = (effect: string, defaultValue: number) => {
            if (effect === 'TACTICAL_PIPELINE_SPEED_MULTIPLIER') return 0.8;
            return defaultValue;
        };
        const { scene } = createScene({ getEffectValue });
        const processor = new Processor(scene, 0, 0);
        const weightTrainer = new WeightTrainer(scene, 0, 0);
        const neuralTrainer = new NeuralTrainer(scene, 0, 0);

        expect(processor.getRequiredProcessingTime()).toBe(CONFIG.RECIPES.LABELLING.TIME);
        expect(weightTrainer.getRequiredProcessingTime()).toBe(4);
        expect(neuralTrainer.getRequiredProcessingTime()).toBe(6);
    });

    it('keeps the global processing speed multiplier composed with tactical pipeline speed', () => {
        const getEffectValue = (effect: string, defaultValue: number) => {
            if (effect === 'PROCESSING_SPEED_MULTIPLIER') return 0.5;
            if (effect === 'TACTICAL_PIPELINE_SPEED_MULTIPLIER') return 0.8;
            return defaultValue;
        };
        const { scene } = createScene({ getEffectValue });
        const weightTrainer = new WeightTrainer(scene, 0, 0);
        const neuralTrainer = new NeuralTrainer(scene, 0, 0);

        expect(weightTrainer.getRequiredProcessingTime()).toBe(2);
        expect(neuralTrainer.getRequiredProcessingTime()).toBe(3);
    });
});
