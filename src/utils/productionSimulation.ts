import { CONFIG } from '../config';

interface ProcessorState {
    input: string[];
    output: string[];
    timer: number;
    isProcessing: boolean;
    recipeKey: string;
    maxBuffer: number;
}

export interface ProductionSimulationOptions {
    ticks: number;
    dataDownloaders?: number;
    processors?: number;
    weightTrainers?: number;
    cableBandwidth?: number;
    maxBuffer?: number;
}

export interface ProductionSimulationResult {
    ticks: number;
    rawProduced: number;
    labeledProduced: number;
    weightUpdatesProduced: number;
    confidenceScore: number;
    totalDeliveredToCore: number;
    maxObservedBuffer: number;
    stalledTicks: number;
}

function createProcessor(recipeKey: string, maxBuffer: number): ProcessorState {
    return {
        input: [],
        output: [],
        timer: 0,
        isProcessing: false,
        recipeKey,
        maxBuffer
    };
}

function moveItems(source: string[], target: string[], itemType: string, amount: number, maxBuffer: number): number {
    let moved = 0;
    for (let i = source.length - 1; i >= 0 && moved < amount && target.length < maxBuffer; i--) {
        if (source[i] !== itemType) continue;
        source.splice(i, 1);
        target.push(itemType);
        moved++;
    }
    return moved;
}

function runProcessor(processor: ProcessorState): string | null {
    const recipe = CONFIG.RECIPES[processor.recipeKey];
    if (!recipe) throw new Error(`Unknown recipe: ${processor.recipeKey}`);

    if (processor.isProcessing) {
        processor.timer++;
        if (processor.timer >= recipe.TIME) {
            processor.isProcessing = false;
            processor.timer = 0;
            if (processor.output.length < processor.maxBuffer) {
                processor.output.push(recipe.OUTPUT);
                return recipe.OUTPUT;
            }
        }
        return null;
    }

    if (processor.output.length >= processor.maxBuffer) return null;

    const hasInputs = recipe.INPUTS.every(input => (
        processor.input.filter(item => item === input.type).length >= input.amount
    ));
    if (!hasInputs) return null;

    recipe.INPUTS.forEach(input => {
        for (let count = 0; count < input.amount; count++) {
            const index = processor.input.indexOf(input.type);
            if (index >= 0) processor.input.splice(index, 1);
        }
    });

    processor.isProcessing = true;
    processor.timer = 0;
    return null;
}

export function simulateProductionLoop(options: ProductionSimulationOptions): ProductionSimulationResult {
    const ticks = Math.max(0, Math.floor(options.ticks));
    const dataDownloaders = Math.max(1, Math.floor(options.dataDownloaders ?? 1));
    const processorCount = Math.max(1, Math.floor(options.processors ?? 1));
    const trainerCount = Math.max(1, Math.floor(options.weightTrainers ?? 1));
    const cableBandwidth = Math.max(1, Math.floor(options.cableBandwidth ?? CONFIG.CABLES.BASIC.BANDWIDTH));
    const maxBuffer = Math.max(1, Math.floor(options.maxBuffer ?? 20));

    const downloaderOutput: string[] = [];
    const processors = Array.from({ length: processorCount }, () => createProcessor('LABELLING', maxBuffer));
    const trainers = Array.from({ length: trainerCount }, () => createProcessor('WEIGHT_TRAINING', maxBuffer));

    let rawProduced = 0;
    let labeledProduced = 0;
    let weightUpdatesProduced = 0;
    let confidenceScore = 0;
    let totalDeliveredToCore = 0;
    let maxObservedBuffer = 0;
    let stalledTicks = 0;

    for (let tick = 1; tick <= ticks; tick++) {
        const beforeDelivered = totalDeliveredToCore;
        const productionRate = CONFIG.BUILDINGS.DATA_DOWNLOADER.PRODUCTION_RATE || 2;

        if (tick % productionRate === 0) {
            for (let i = 0; i < dataDownloaders && downloaderOutput.length < maxBuffer; i++) {
                downloaderOutput.push('RAW_DATA');
                rawProduced++;
            }
        }

        processors.forEach(processor => {
            moveItems(downloaderOutput, processor.input, 'RAW_DATA', cableBandwidth, maxBuffer);
            if (runProcessor(processor) === 'LABELED_DATA') labeledProduced++;
        });

        trainers.forEach(trainer => {
            processors.forEach(processor => {
                moveItems(processor.output, trainer.input, 'LABELED_DATA', cableBandwidth, maxBuffer);
            });
            if (runProcessor(trainer) === 'WEIGHT_UPDATE') weightUpdatesProduced++;
        });

        trainers.forEach(trainer => {
            while (trainer.output.length > 0) {
                trainer.output.shift();
                confidenceScore += 10;
                totalDeliveredToCore++;
            }
        });

        const observedBuffers = [
            downloaderOutput.length,
            ...processors.flatMap(processor => [processor.input.length, processor.output.length]),
            ...trainers.flatMap(trainer => [trainer.input.length, trainer.output.length])
        ];
        maxObservedBuffer = Math.max(maxObservedBuffer, ...observedBuffers);

        if (totalDeliveredToCore === beforeDelivered && tick > 100) {
            stalledTicks++;
        }
    }

    return {
        ticks,
        rawProduced,
        labeledProduced,
        weightUpdatesProduced,
        confidenceScore,
        totalDeliveredToCore,
        maxObservedBuffer,
        stalledTicks
    };
}

