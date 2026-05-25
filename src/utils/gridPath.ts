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
        maxVisited = 900,
        maxDistanceFromStart = 35,
        maxReturnedSteps = 8
    } = options;
    const start = { x: Math.floor(startWorld.x / gridSize), y: Math.floor(startWorld.y / gridSize) };
    const target = { x: Math.floor(targetWorld.x / gridSize), y: Math.floor(targetWorld.y / gridSize) };
    const startKey = `${start.x},${start.y}`;
    const targetKey = `${target.x},${target.y}`;
    const queue = [start];
    const visited = new Set<string>([startKey]);
    const cameFrom = new Map<string, string>();

    while (queue.length > 0 && visited.size < maxVisited) {
        const current = queue.shift()!;
        if (`${current.x},${current.y}` === targetKey) break;

        const sortedDirs = directions.slice().sort((a, b) => {
            const da = Math.abs(target.x - (current.x + a.x)) + Math.abs(target.y - (current.y + a.y));
            const db = Math.abs(target.x - (current.x + b.x)) + Math.abs(target.y - (current.y + b.y));
            return da - db;
        });

        for (const dir of sortedDirs) {
            const next = { x: current.x + dir.x, y: current.y + dir.y };
            const key = `${next.x},${next.y}`;
            if (visited.has(key)) continue;
            if (Math.abs(next.x - start.x) > maxDistanceFromStart || Math.abs(next.y - start.y) > maxDistanceFromStart) continue;

            const worldX = next.x * gridSize;
            const worldY = next.y * gridSize;
            const isTarget = key === targetKey;
            if (isBlocked(worldX, worldY, isTarget)) continue;

            visited.add(key);
            cameFrom.set(key, `${current.x},${current.y}`);
            queue.push(next);
        }
    }

    if (!cameFrom.has(targetKey)) return [];

    const path: GridPoint[] = [];
    let currentKey = targetKey;
    while (currentKey !== startKey) {
        const [gx, gy] = currentKey.split(',').map(Number);
        path.unshift({ x: gx * gridSize + gridSize / 2, y: gy * gridSize + gridSize / 2 });
        currentKey = cameFrom.get(currentKey)!;
    }
    return path.slice(0, maxReturnedSteps);
}
