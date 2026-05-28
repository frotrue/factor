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
    const startTx = Math.floor(x / gridSize);
    const startTy = Math.floor(y / gridSize);
    const effectiveRange = Math.max(0, Math.floor(range));

    for (let tx = startTx - effectiveRange; tx < startTx + widthTiles + effectiveRange; tx++) {
        for (let ty = startTy - effectiveRange; ty < startTy + heightTiles + effectiveRange; ty++) {
            tiles.add(`${tx * gridSize},${ty * gridSize}`);
        }
    }

    return tiles;
}
