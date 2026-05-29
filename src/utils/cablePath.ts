import { CONFIG } from '../config';

export interface CablePathPoint {
    x: number;
    y: number;
}

export function getCableDistanceTiles(from: CablePathPoint, to: CablePathPoint): number {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    return Math.max(1, Math.ceil(distance / CONFIG.GRID_SIZE));
}

export function getTouchedCableTiles(from: CablePathPoint, to: CablePathPoint): CablePathPoint[] {
    const grid = CONFIG.GRID_SIZE;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (grid / 4)));
    const tiles = new Map<string, CablePathPoint>();

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = from.x + dx * t;
        const y = from.y + dy * t;
        const tileX = Math.floor(x / grid) * grid;
        const tileY = Math.floor(y / grid) * grid;
        tiles.set(`${tileX},${tileY}`, { x: tileX, y: tileY });
    }

    return Array.from(tiles.values());
}

export function isPointInsideFootprint(point: CablePathPoint, origin: CablePathPoint, widthTiles: number, heightTiles: number): boolean {
    return point.x >= origin.x
        && point.x < origin.x + widthTiles * CONFIG.GRID_SIZE
        && point.y >= origin.y
        && point.y < origin.y + heightTiles * CONFIG.GRID_SIZE;
}
