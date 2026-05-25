export interface Point {
    x: number;
    y: number;
}

export function getFootprintCenter(x: number, y: number, widthTiles: number, heightTiles: number, gridSize: number): Point {
    return {
        x: x + (Math.max(1, widthTiles) * gridSize) / 2,
        y: y + (Math.max(1, heightTiles) * gridSize) / 2
    };
}

export function getCenteredCoverageTiles(
    x: number,
    y: number,
    widthTiles: number,
    heightTiles: number,
    range: number,
    gridSize: number
): Set<string> {
    const tiles = new Set<string>();
    const center = getFootprintCenter(x, y, widthTiles, heightTiles, gridSize);
    const cx = Math.floor(center.x / gridSize);
    const cy = Math.floor(center.y / gridSize);
    const effectiveRange = Math.max(0, Math.floor(range));

    for (let dx = -effectiveRange; dx <= effectiveRange; dx++) {
        for (let dy = -effectiveRange; dy <= effectiveRange; dy++) {
            tiles.add(`${(cx + dx) * gridSize},${(cy + dy) * gridSize}`);
        }
    }

    return tiles;
}
