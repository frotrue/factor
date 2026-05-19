export interface CoverageOffset {
    dx: number;
    dy: number;
}

export function getSquareCoverageOffsets(range: number): CoverageOffset[] {
    const effectiveRange = Math.max(0, Math.floor(range));
    const offsets: CoverageOffset[] = [];

    for (let dx = -effectiveRange; dx <= effectiveRange; dx++) {
        for (let dy = -effectiveRange; dy <= effectiveRange; dy++) {
            offsets.push({ dx, dy });
        }
    }

    return offsets;
}
