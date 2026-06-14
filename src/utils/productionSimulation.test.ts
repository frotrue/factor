import { describe, expect, it } from 'vitest';
import { simulateProductionLoop } from './productionSimulation';

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
        expect(result.researchProgressValue).toBe(result.weightUpdatesProduced * 5);
        expect(result.maxObservedBuffer).toBeLessThanOrEqual(20);
    });

    it('does not stall completely during an extended production run', () => {
        const result = simulateProductionLoop({
            ticks: 10000,
            dataDownloaders: 3,
            processors: 3,
            weightTrainers: 2,
            cableBandwidth: 3,
            maxBuffer: 30
        });

        expect(result.totalDeliveredToCore).toBeGreaterThan(250);
        expect(result.researchProgressValue).toBeGreaterThan(1250);
        expect(result.stalledTicks / result.ticks).toBeLessThan(0.95);
    });
});
