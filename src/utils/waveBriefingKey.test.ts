import { describe, expect, it } from 'vitest';
import { getWaveBriefingKey } from './waveBriefingKey';

describe('getWaveBriefingKey', () => {
    it('changes only when next wave or difficulty changes', () => {
        expect(getWaveBriefingKey(2, 'NORMAL')).toBe(getWaveBriefingKey(2, 'NORMAL'));
        expect(getWaveBriefingKey(2, 'NORMAL')).not.toBe(getWaveBriefingKey(3, 'NORMAL'));
        expect(getWaveBriefingKey(2, 'NORMAL')).not.toBe(getWaveBriefingKey(2, 'HARD'));
    });
});
