import Phaser from 'phaser';
import type BuildingManager from './managers/BuildingManager';
import type CableManager from './managers/CableManager';
import type EffectsManager from './managers/EffectsManager';
import type GridRenderer from './managers/GridRenderer';
import type InventoryManager from './managers/InventoryManager';
import type ItemManager from './managers/ItemManager';
import type MapManager from './managers/MapManager';
import type PowerManager from './managers/PowerManager';
import type ResearchManager from './managers/ResearchManager';
import type SaveManager from './managers/SaveManager';
import type SoundManager from './managers/SoundManager';
import type TickSystem from './managers/TickSystem';
import type TutorialManager from './managers/TutorialManager';
import type UIManager from './managers/UIManager';
import type WaveManager from './managers/WaveManager';
import type { Language } from './i18n';

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

// ── 전역 설정용 추가 인터페이스 ──
export interface CableConfig {
    ID: string;
    NAME: string;
    COLOR: number;
    BANDWIDTH: number;
    COST_PER_TILE: number;
    MAX_QUEUE: number;
    UNLOCK_REQUIRED?: string;
}

export interface APConfig {
    ID: string;
    NAME: string;
    COLOR: number;
    RANGE: number;
    BANDWIDTH: number;
    POWER: PowerConfig;
    COST?: BuildingCost[];
    CATEGORY?: string;
}

// ── 게임 전역 설정 ──
export interface GameConfig {
    GRID_SIZE: number;
    TICK_RATE: number;
    TIMING: {
        TICK_RATE_MULTIPLIER: number;
        AUTO_SAVE_INTERVAL_MS: number;
        INITIAL_WAVE_DELAY_MS: number;
        WAVE_COOLDOWN_MS: number;
        ENEMY_SPAWN_INTERVAL_MS: number;
        DATA_PULSE_DURATION_MS: number;
    };
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
    CABLES: Record<string, CableConfig>;
    ACCESS_POINT: APConfig;
    RECIPES: Record<string, Recipe>;
    ITEMS: Record<string, ItemConfig>;
    RESOURCE_PATCHES: Record<string, number>;
    ENEMIES: Record<string, EnemyConfig>;
    RESEARCH: Record<string, ResearchNode>;
    DIFFICULTY: Record<string, DifficultyConfig>;
}

export interface DifficultyConfig {
    ID: string;
    NAME: string;
    ENEMY_HP_MULTIPLIER: number;
    ENEMY_SPAWN_MULTIPLIER: number;
    REWARD_MULTIPLIER: number;
    WAVE_COOLDOWN_MS: number;
}

export interface ResearchEffects {
    MINING_RATE_MULTIPLIER?: number;
    PROCESSING_SPEED_MULTIPLIER?: number;
    TOWER_DAMAGE_MULTIPLIER?: number;
    TOWER_RANGE_BONUS?: number;
    TOWER_FIRE_RATE_MULTIPLIER?: number;
    AP_RANGE_BONUS?: number;
    CABLE_BANDWIDTH_BONUS?: number;
    FIREWALL_HP_MULTIPLIER?: number;
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
        CABLES?: string[];
    };
    REQUIREMENTS?: string[]; // IDs of required research nodes
    EFFECTS?: ResearchEffects;
}

// ── 건물 타입 키 (타입 안전성 강화) ──
export type BuildingType = 
    | 'MINER' | 'DATA_DOWNLOADER' | 'CORE' | 'PROCESSOR'
    | 'POWER_NODE' | 'POWER_PLANT' | 'STORAGE' | 'UNLOADER'
    | 'CLASSIFIER' | 'FILTER' | 'FIREWALL'
    | 'ACCESS_POINT' | 'SOLAR_PANEL' | 'NEURAL_TRAINER' | 'WEIGHT_TRAINER'
    | 'MODEL_TRAINING_LAB'
    | 'CONVEYOR' | 'FAST_LINK' | 'RECYCLER' | 'DATA_CACHE';

// ── 케이블 연결 ──
export interface CableConnection {
    id: string;
    fromKey: string;
    toKey: string;
    bandwidth: number;
    queue: CablePacket[];
    cableType: 'BASIC' | 'FIBER';
    flowDirection?: 'FORWARD' | 'BACKWARD';
}

export interface CablePacket {
    itemType: string;
    flowDirection: 'FORWARD' | 'BACKWARD';
    ticksRemaining: number;
}

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
    networks?: PowerNetwork[];
    blackoutNetworks?: number;
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

export interface PowerNetwork {
    id: number;
    tiles: Set<string>;
    buildings: string[];
    production: number;
    consumption: number;
    net: number;
    isBlackout: boolean;
    color: number;
}

// ── 건물 생성 옵션 ──
export interface BuildingOptions {
    rotation?: number;
    color?: number;
    maxBufferSize?: number;
    customState?: any;
    skipCost?: boolean;
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

export interface DefenseModelState {
    modelConfidence: number;
    modelVersion: number;
    inferenceCharge: number;
}

export interface IMainScene extends Phaser.Scene {
    researchManager: ResearchManager;
    buildingManager: BuildingManager;
    cableManager: CableManager;
    powerManager: PowerManager;
    waveManager: WaveManager;
    uiManager: UIManager;
    effectsManager: EffectsManager;
    mapManager: MapManager;
    itemManager: ItemManager;
    gridRenderer: GridRenderer;
    tickSystem: TickSystem;
    inventoryManager: InventoryManager;
    saveManager: SaveManager;
    soundManager: SoundManager;
    tutorialManager: TutorialManager;
    defenseModelStates: Record<string, DefenseModelState>;
    gameSpeed: number;
    difficultyId: string;
    isMobileLayout: boolean;
    getDefenseModelState(type: string): DefenseModelState;
    trainDefenseModelType(type: string, itemType: string): boolean;
    syncDefenseModelType(type: string): void;
    setGameSpeed(speed: number): void;
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
    REWARD_SILICON?: number;
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

export interface SavedCable {
    fromKey: string;
    toKey: string;
    cableType: string;
    queue: Array<string | CablePacket>;
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
    defenseModelStates?: Record<string, DefenseModelState>;
    items: SavedItem[];
    cables?: SavedCable[];
    settings: {
        gameSpeed: number;
        showPowerGrid: boolean;
        showDefenseRange: boolean;
        difficulty?: string;
        language?: Language;
        masterVolume: number;
        muted?: boolean;
        tutorialCompleted?: boolean;
        tutorialStep?: number;
    };
    resourceMap: { key: string; type: string }[];
    research: string[];
}
