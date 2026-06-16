import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { simulateProductionLoop } from './productionSimulation';

const RESEARCH_TICKS_PER_MINUTE = 60000 / (CONFIG.TICK_RATE * CONFIG.TIMING.TICK_RATE_MULTIPLIER * 2);
const ticksForMinutes = (minutes: number) => Math.round(minutes * RESEARCH_TICKS_PER_MINUTE);

describe('production loop simulation', () => {
    it('produces lab progress value over a long data-processing run', () => {
        const result = simulateProductionLoop({
            ticks: 2000,
            dataDownloaders: 2,
            processors: 2,
            weightTrainers: 1,
            cableBandwidth: 3,
            maxBuffer: 20
        });

        expect(result.rawProduced).toBeGreaterThan(100);
        expect(result.labeledProduced).toBeGreaterThan(100);
        expect(result.weightUpdatesProduced).toBeGreaterThan(40);
        expect(result.tacticalDataDeposited).toBeGreaterThan(100);
        expect(result.researchProgressValue).toBe(result.tacticalDataDeposited);
        expect(result.maxObservedBuffer).toBeLessThanOrEqual(20);
    });

    it('calibrates first tactical research entry around the desktop target window', () => {
        const firstTacticalCost = Math.min(
            CONFIG.RESEARCH.TECH_PRECISION_INFERENCE.DATA_COSTS.tactical ?? Number.POSITIVE_INFINITY,
            CONFIG.RESEARCH.TECH_DATASET_ENCODING.DATA_COSTS.tactical ?? Number.POSITIVE_INFINITY
        );
        const chain = {
            dataDownloaders: 1,
            processors: 1,
            weightTrainers: 1,
            neuralTrainers: 1,
            cableBandwidth: 3,
            maxBuffer: 20
        };

        const beforeWindow = simulateProductionLoop({
            ...chain,
            ticks: ticksForMinutes(7)
        });
        const insideWindow = simulateProductionLoop({
            ...chain,
            ticks: ticksForMinutes(10)
        });

        expect(beforeWindow.tacticalDataDeposited).toBeLessThan(firstTacticalCost);
        expect(insideWindow.tacticalDataDeposited).toBeGreaterThanOrEqual(firstTacticalCost);
    });

    it('does not stall completely during an extended production run', () => {
        const result = simulateProductionLoop({
            ticks: 10000,
            dataDownloaders: 3,
            processors: 3,
            weightTrainers: 2,
            neuralTrainers: 2,
            cableBandwidth: 3,
            maxBuffer: 30
        });

        expect(result.totalDeliveredToCore).toBeGreaterThan(250);
        expect(result.tacticalDataDeposited).toBeGreaterThan(1000);
        expect(result.researchProgressValue).toBe(result.tacticalDataDeposited);
        expect(result.stalledTicks / result.ticks).toBeLessThan(0.95);
    });
});
