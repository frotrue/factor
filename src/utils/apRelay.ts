export interface APRelayBuildingLike {
    type: string;
    inputBuffer: string[];
    outputBuffer: string[];
    maxBufferSize: number;
    canAcceptItem(itemType: string): boolean;
}

const AP_AUTO_SOURCE_EXCLUDED_TYPES = new Set(['STORAGE', 'DATA_CACHE']);

export function isAPAutoRelaySource(building: APRelayBuildingLike, isDataItem: (itemType: string | undefined) => boolean): boolean {
    return !AP_AUTO_SOURCE_EXCLUDED_TYPES.has(building.type) && isDataItem(building.outputBuffer[0]);
}

export function getAvailableInputSpace(building: APRelayBuildingLike): number {
    return Math.max(0, building.maxBufferSize - building.inputBuffer.length);
}

export function selectAPRelayTarget(
    candidates: APRelayBuildingLike[],
    source: APRelayBuildingLike,
    itemType: string
): APRelayBuildingLike | undefined {
    return candidates
        .filter(candidate => candidate !== source && candidate.canAcceptItem(itemType))
        .sort((a, b) => getAvailableInputSpace(b) - getAvailableInputSpace(a))[0];
}
