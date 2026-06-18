import { describe, expect, it } from 'vitest';
import { getBuildingLifecycleEvent } from './buildingLifecycle';

describe('getBuildingLifecycleEvent', () => {
    it('keeps manual removal separate from combat destruction', () => {
        expect(getBuildingLifecycleEvent('removed')).toBe('BUILDING_REMOVED');
        expect(getBuildingLifecycleEvent('destroyed')).toBe('BUILDING_DESTROYED');
    });
});
