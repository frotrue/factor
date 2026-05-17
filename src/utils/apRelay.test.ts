import { describe, expect, it } from 'vitest';
import { APRelayBuildingLike, getAvailableInputSpace, isAPAutoRelaySource, selectAPRelayTarget } from './apRelay';

function building(overrides: Partial<APRelayBuildingLike> = {}): APRelayBuildingLike {
    return {
        type: 'PROCESSOR',
        inputBuffer: [],
        outputBuffer: [],
        maxBufferSize: 5,
        canAcceptItem: () => true,
        ...overrides
    };
}

const isDataItem = (itemType: string | undefined) => Boolean(itemType && itemType !== 'SILICON');

describe('AP relay helpers', () => {
    it('excludes storage buildings from automatic AP relay sources', () => {
        expect(isAPAutoRelaySource(building({ type: 'STORAGE', outputBuffer: ['RAW_DATA'] }), isDataItem)).toBe(false);
        expect(isAPAutoRelaySource(building({ type: 'DATA_CACHE', outputBuffer: ['RAW_DATA'] }), isDataItem)).toBe(false);
        expect(isAPAutoRelaySource(building({ type: 'PROCESSOR', outputBuffer: ['RAW_DATA'] }), isDataItem)).toBe(true);
    });

    it('requires a data item in output to be an AP relay source', () => {
        expect(isAPAutoRelaySource(building({ outputBuffer: [] }), isDataItem)).toBe(false);
        expect(isAPAutoRelaySource(building({ outputBuffer: ['SILICON'] }), isDataItem)).toBe(false);
    });

    it('selects the receiver with the most free input buffer space', () => {
        const source = building({ outputBuffer: ['RAW_DATA'] });
        const nearlyFull = building({ inputBuffer: ['RAW_DATA', 'RAW_DATA', 'RAW_DATA', 'RAW_DATA'], maxBufferSize: 5 });
        const roomy = building({ inputBuffer: ['RAW_DATA'], maxBufferSize: 8 });
        const blocked = building({ inputBuffer: [], maxBufferSize: 20, canAcceptItem: () => false });

        expect(selectAPRelayTarget([source, nearlyFull, roomy, blocked], source, 'RAW_DATA')).toBe(roomy);
    });

    it('reports zero free space for overfilled buffers', () => {
        expect(getAvailableInputSpace(building({ inputBuffer: ['A', 'B', 'C'], maxBufferSize: 2 }))).toBe(0);
    });
});
