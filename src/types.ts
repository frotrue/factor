import Phaser from 'phaser';

// ── 방향 (Direction) ──
export interface Direction {
    x: number;
    y: number;
    angle: number;
}

// ── 전력 설정 ──
export interface PowerConfig {
    CONSUMPTION: number;
    PRODUCTION: number;
    RANGE?: number;
}

// ── 건물 설정 ──
export interface BuildingConfig {
    ID: string;
    NAME: string;
    COLOR: number;
    DESCRIPTION?: string;
    POWER: PowerConfig;
    PRODUCTION_RATE?: number;
    HP?: number;
    WIDTH?: number;
    HEIGHT?: number;
    MAX_BUFFER?: number;
}

// ── 레시피 ──
export interface RecipeInput {
    type: string;
    amount: number;
}

export interface Recipe {
    INPUTS: RecipeInput[];
    OUTPUT: string;
    TIME: number;
}

// ── 아이템 ──
export interface ItemConfig {
    ID: string;
    NAME: string;
    COLOR: number;
    RADIUS: number;
}

// ── 게임 전역 설정 ──
export interface GameConfig {
    GRID_SIZE: number;
    TICK_RATE: number;
    CAMERA: {
        DEFAULT_ZOOM: number;
        MIN_ZOOM: number;
        MAX_ZOOM: number;
        LERP: number;
    };
    OPTIMIZATION: {
        GRID_REDRAW_THRESHOLD: number;
    };
    DIRECTIONS: Direction[];
    BUILDINGS: Record<string, BuildingConfig>;
    RECIPES: Record<string, Recipe>;
    ITEMS: Record<string, ItemConfig>;
    RESOURCE_PATCHES: Record<string, number>;
}

// ── 건물 타입 키 (타입 안전성 강화) ──
export type BuildingType = 
    | 'MINER' | 'CONVEYOR' | 'CORE' | 'PROCESSOR'
    | 'POWER_NODE' | 'POWER_PLANT' | 'STORAGE' | 'UNLOADER';

// ── 아이템 런타임 객체 ──
export interface GameItem {
    gridX: number;
    gridY: number;
    sprite: Phaser.GameObjects.Arc;
    type: string;
}

// ── 이동 계획 ──
export interface MoveTarget {
    x: number;
    y: number;
}

// ── 전력 업데이트 이벤트 데이터 ──
export interface PowerUpdateData {
    production: number;
    consumption: number;
    net: number;
    isBlackout: boolean;
}

// ── 코어 데이터 수신 이벤트 ──
export interface CoreDataEvent {
    type: string;
    score: number;
    total: number;
}

// ── 전력망 노드 ──
export interface PowerNodeInfo {
    x: number;
    y: number;
    range: number;
}

// ── 건물 생성 옵션 ──
export interface BuildingOptions {
    rotation?: number;
    color?: number;
    maxBufferSize?: number;
}
