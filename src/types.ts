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

// ── 건물 건설 비용 ──
export interface BuildingCost {
    resource: string;
    amount: number;
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
    DEFENSE?: DefenseTowerConfig;
    UNLOCK_REQUIRED?: string;
    CATEGORY?: string;
    COST?: BuildingCost[];
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
    ENEMIES: Record<string, EnemyConfig>;
    RESEARCH: Record<string, ResearchNode>;
}

// ── 연구 노드 (Research) ──
export interface ResearchNode {
    ID: string;
    NAME: string;
    COST: number; // Confidence score
    DESCRIPTION: string;
    UNLOCKS: {
        BUILDINGS?: string[];
        RECIPES?: string[];
    };
    REQUIREMENTS?: string[]; // IDs of required research nodes
}

// ── 건물 타입 키 (타입 안전성 강화) ──
export type BuildingType = 
    | 'MINER' | 'CONVEYOR' | 'CORE' | 'PROCESSOR'
    | 'POWER_NODE' | 'POWER_PLANT' | 'STORAGE' | 'UNLOADER'
    | 'CLASSIFIER' | 'FILTER' | 'FIREWALL'
    | 'SPLITTER' | 'MERGER' | 'FAST_LINK' | 'SOLAR_PANEL' | 'NEURAL_TRAINER' | 'WEIGHT_TRAINER';

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
    customState?: any;
}

// ── 방어 타워 설정 ──
export interface DefenseTowerConfig {
    DAMAGE: number;
    RANGE: number;
    FIRE_RATE: number; // ticks
    AMMO_TYPE?: string;
    AMMO_CONSUMPTION: number;
    IS_AOE?: boolean;
}

// ── 적 (Enemy) ──
export interface EnemyConfig {
    ID: string;
    NAME: string;
    COLOR: number;
    BASE_HP: number;
    SPEED: number; // pixels per second or per frame
    DAMAGE: number;
    RADIUS: number;
}

// ── 세이브/로드 (Phase 2) ──
export interface SavedBuilding {
    x: number;
    y: number;
    type: string;
    rotation: number;
    inputBuffer: string[];
    outputBuffer: string[];
    customState?: any;
}

export interface SavedItem {
    x: number;
    y: number;
    type: string;
}

export interface SavedEnemy {
    id: string;
    type: string;
    x: number;
    y: number;
    hp: number;
}

export interface SaveData {
    version: string;
    timestamp: number;
    wave: {
        currentWave: number;
        waveTimer: number;
        enemiesSpawned: number;
        enemiesToSpawn: number;
        enemies: SavedEnemy[];
        hpMultiplier: number;
        enemyIdCounter: number;
    };
    core: {
        hp: number;
        totalDataReceived: number;
        confidenceScore: number;
    };
    buildings: SavedBuilding[];
    items: SavedItem[];
    settings: {
        gameSpeed: number;
        showPowerGrid: boolean;
        showDefenseRange: boolean;
        masterVolume: number;
    };
    resourceMap: { key: string; type: string }[];
    research: string[];
}
