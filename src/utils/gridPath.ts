export interface GridPoint {
    x: number;
    y: number;
}

interface GridCoord {
    x: number;
    y: number;
}

export interface GridPathOptions {
    startWorld: GridPoint;
    targetWorld: GridPoint;
    gridSize: number;
    directions: GridCoord[];
    isBlocked: (worldX: number, worldY: number, isTarget: boolean) => boolean;
    maxVisited?: number;
    maxDistanceFromStart?: number;
    maxReturnedSteps?: number;
}

export function findGridPath(options: GridPathOptions): GridPoint[] {
    const {
        startWorld,
        targetWorld,
        gridSize,
        directions,
        isBlocked,
        maxVisited = 2500,
        maxDistanceFromStart = 35,
        maxReturnedSteps = 8
    } = options;
    const start = { x: Math.floor(startWorld.x / gridSize), y: Math.floor(startWorld.y / gridSize) };
    const target = { x: Math.floor(targetWorld.x / gridSize), y: Math.floor(targetWorld.y / gridSize) };
    const startKey = `${start.x},${start.y}`;
    const targetKey = `${target.x},${target.y}`;
    const open = [start];
    const closed = new Set<string>();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[startKey, 0]]);

    const heuristic = (point: { x: number; y: number }) => Math.abs(target.x - point.x) + Math.abs(target.y - point.y);

    while (open.length > 0 && closed.size < maxVisited) {
        open.sort((a, b) => {
            const aKey = `${a.x},${a.y}`;
            const bKey = `${b.x},${b.y}`;
            const aScore = (gScore.get(aKey) ?? Infinity) + heuristic(a);
            const bScore = (gScore.get(bKey) ?? Infinity) + heuristic(b);
            return aScore - bScore;
        });
        const current = open.shift()!;
        const currentKey = `${current.x},${current.y}`;
        if (currentKey === targetKey) break;
        if (closed.has(currentKey)) continue;
        closed.add(currentKey);

        const sortedDirs = directions.slice().sort((a, b) => {
            const da = Math.abs(target.x - (current.x + a.x)) + Math.abs(target.y - (current.y + a.y));
            const db = Math.abs(target.x - (current.x + b.x)) + Math.abs(target.y - (current.y + b.y));
            return da - db;
        });

        for (const dir of sortedDirs) {
            const next = { x: current.x + dir.x, y: current.y + dir.y };
            const key = `${next.x},${next.y}`;
            if (closed.has(key)) continue;
            if (Math.abs(next.x - start.x) > maxDistanceFromStart || Math.abs(next.y - start.y) > maxDistanceFromStart) continue;

            const worldX = next.x * gridSize;
            const worldY = next.y * gridSize;
            const isTarget = key === targetKey;
            if (isBlocked(worldX, worldY, isTarget)) continue;

            const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;
            if (tentativeG >= (gScore.get(key) ?? Infinity)) continue;

            cameFrom.set(key, currentKey);
            gScore.set(key, tentativeG);
            open.push(next);
        }
    }

    if (!cameFrom.has(targetKey)) return [];

    const path: GridPoint[] = [];
    let currentKey = targetKey;
    while (currentKey !== startKey) {
        const [gx, gy] = currentKey.split(',').map(Number);
        path.unshift(currentKey === targetKey
            ? { x: targetWorld.x, y: targetWorld.y }
            : { x: gx * gridSize + gridSize / 2, y: gy * gridSize + gridSize / 2 });
        currentKey = cameFrom.get(currentKey)!;
    }
    return path.slice(0, maxReturnedSteps);
}
