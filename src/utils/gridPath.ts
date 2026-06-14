export interface GridPoint {
    x: number;
    y: number;
}

interface GridCoord {
    x: number;
    y: number;
    cost?: number;
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
    preventDiagonalCornerCutting?: boolean;
}

class MinHeap<T> {
    private data: T[] = [];
    constructor(private score: (item: T) => number) {}
    get size() { return this.data.length; }
    push(item: T) {
        this.data.push(item);
        this.bubbleUp(this.data.length - 1);
    }
    pop(): T | undefined {
        const top = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0 && last !== undefined) {
            this.data[0] = last;
            this.bubbleDown(0);
        }
        return top;
    }
    private bubbleUp(i: number) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.score(this.data[i]) >= this.score(this.data[parent])) break;
            [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
            i = parent;
        }
    }
    private bubbleDown(i: number) {
        const n = this.data.length;
        while (true) {
            let smallest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            if (left < n && this.score(this.data[left]) < this.score(this.data[smallest])) smallest = left;
            if (right < n && this.score(this.data[right]) < this.score(this.data[smallest])) smallest = right;
            if (smallest === i) break;
            [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
            i = smallest;
        }
    }
}

export function findGridPath(options: GridPathOptions): GridPoint[] {
    const {
        startWorld,
        targetWorld,
        gridSize,
        directions,
        isBlocked,
        maxVisited = 12000,
        maxDistanceFromStart = 80,
        maxReturnedSteps = 8,
        preventDiagonalCornerCutting = false
    } = options;
    const start = { x: Math.floor(startWorld.x / gridSize), y: Math.floor(startWorld.y / gridSize) };
    const target = { x: Math.floor(targetWorld.x / gridSize), y: Math.floor(targetWorld.y / gridSize) };
    const startKey = `${start.x},${start.y}`;
    const targetKey = `${target.x},${target.y}`;
    const closed = new Set<string>();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[startKey, 0]]);

    const hasDiagonalMovement = directions.some(direction => direction.x !== 0 && direction.y !== 0);
    const heuristic = (point: { x: number; y: number }) => {
        const dx = Math.abs(target.x - point.x);
        const dy = Math.abs(target.y - point.y);
        if (!hasDiagonalMovement) return dx + dy;
        return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };

    const open = new MinHeap<{ x: number; y: number }>(
        (node) => (gScore.get(`${node.x},${node.y}`) ?? Infinity) + heuristic(node)
    );
    open.push(start);

    while (open.size > 0 && closed.size < maxVisited) {
        const current = open.pop()!;
        const currentKey = `${current.x},${current.y}`;
        if (currentKey === targetKey) break;
        if (closed.has(currentKey)) continue;
        closed.add(currentKey);

        for (const dir of directions) {
            const next = { x: current.x + dir.x, y: current.y + dir.y };
            const key = `${next.x},${next.y}`;
            if (closed.has(key)) continue;
            if (Math.abs(next.x - start.x) > maxDistanceFromStart || Math.abs(next.y - start.y) > maxDistanceFromStart) continue;

            const worldX = next.x * gridSize;
            const worldY = next.y * gridSize;
            const isTarget = key === targetKey;
            if (isBlocked(worldX, worldY, isTarget)) continue;
            if (
                preventDiagonalCornerCutting
                && dir.x !== 0
                && dir.y !== 0
                && (
                    isBlocked((current.x + dir.x) * gridSize, current.y * gridSize, false)
                    || isBlocked(current.x * gridSize, (current.y + dir.y) * gridSize, false)
                )
            ) {
                continue;
            }

            const moveCost = dir.cost ?? (dir.x !== 0 && dir.y !== 0 ? Math.SQRT2 : 1);
            const tentativeG = (gScore.get(currentKey) ?? Infinity) + moveCost;
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
