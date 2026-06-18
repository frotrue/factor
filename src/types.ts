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
import type PerformanceStats from './managers/PerformanceStats';
import type TutorialManager from './managers/TutorialManager';
import type UIManager from './ui/UIManager';
import type WaveManager from './managers/WaveManager';
import type { Language } from './i18n';
import type { ThreatLevel } from './utils/waveSimulation';

export type GameMode = 'tutorial' | 'campaign';
export type RenderResolutionPreset = 'auto' | '1920x1080' | '2560x1440' | '3840x2160';

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

export interface TerrainConfig {
    ID: string;
    NAME: string;
    COLOR: number;
    BLOCKS_BUILDING: boolean;
    BLOCKS_ENEMY: boolean;
}

export type MapPresetId = 'tutorial' | 'standard';
export type MapType = 'tutorial' | 'random';

export interface TileArea {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface MapBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface ResourcePatchConfig {
    type: string;
    x: number;
    y: number;
    size: number;
}

export interface StarterResourceZoneConfig {
    type: string;
    area: TileArea;
    patchSize: number;
    minTiles: number;
}

export interface RandomResourceConfig {
    types: string[];
    patchCount: { min: number; max: number };
    patchSize: { min: number; max: number };
    range: TileArea;
    exclusionZones: TileArea[];
}

export interface ResourceRingConfig {
    minDistance: number;
    maxDistance: number;
    patchCount: { min: number; max: number };
    patchSize: { min: number; max: number };
    directionalBias?: boolean;
}

export interface StarterValidationConfig {
    center: { x: number; y: number };
    radius: number;
    maxRepairAttempts: number;
}

export interface MapPresetConfig {
    ID: MapPresetId;
    MAP_TYPE: MapType;
    WORLD_BOUNDS?: MapBounds;
    BUILD_BOUNDS?: MapBounds;
    RESOURCE_BOUNDS?: MapBounds;
    CAMERA_PADDING_TILES?: number;
    STARTER_SAFE_AREA?: MapBounds;
    FIXED_RESOURCES?: ResourcePatchConfig[];
    STARTER_ZONES?: StarterResourceZoneConfig[];
    RANDOM_RESOURCES?: RandomResourceConfig;
    RESOURCE_RINGS?: ResourceRingConfig[];
    STARTER_VALIDATION?: StarterValidationConfig;
    TERRAIN_LAYOUTS?: Array<'earlyLaneBlockers' | 'tutorialArenaWalls'>;
}

// ── 전역 설정용 추가 인터페이스 ──
export interface CableConfig {
    ID: string;
    NAME: string;
    COLOR: number;
    BANDWIDTH: number;
    COST_PER_TILE: number;
    MAX_LENGTH_TILES: number;
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
        CAMPAIGN_INITIAL_WAVE_DELAY_MS: number;
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
        GRID_CHUNK_TILES: number;
    };
    DIRECTIONS: Direction[];
    BUILDINGS: Record<string, BuildingConfig>;
    CABLES: Record<string, CableConfig>;
    ACCESS_POINT: APConfig;
    RECIPES: Record<string, Recipe>;
    ITEMS: Record<string, ItemConfig>;
    RESOURCE_PATCHES: Record<string, number>;
    TERRAIN: Record<string, TerrainConfig>;
    MAP_PRESETS: Record<MapPresetId, MapPresetConfig>;
    ENEMIES: Record<string, EnemyConfig>;
    RESEARCH_AXES: ResearchAxis[];
    RESEARCH_SETTINGS: ResearchSettings;
    RESEARCH: Record<string, ResearchNode>;
    CORE_ORIGIN: { TILE_X: number; TILE_Y: number };
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
    TACTICAL_PIPELINE_SPEED_MULTIPLIER?: number;
    TOWER_ACCURACY_BONUS?: number;
    TOWER_DAMAGE_MULTIPLIER?: number;
    TOWER_RANGE_BONUS?: number;
    TOWER_FIRE_RATE_MULTIPLIER?: number;
    AP_RANGE_BONUS?: number;
    CABLE_BANDWIDTH_BONUS?: number;
    CABLE_LENGTH_BONUS?: number;
    FIREWALL_HP_MULTIPLIER?: number;
}

export type ResearchDataCurrency = 'material' | 'tactical' | 'system';
export type InsightGroup = ResearchDataCurrency;
export type ResearchTag = 'unlock' | 'stat' | 'rule-change' | 'queue' | 'slot' | 'throughput';
export type ResearchNodeStatus = 'locked' | 'available' | 'active' | 'queued' | 'waiting_resource' | 'completed' | 'gated';

export interface ResearchAxis {
    id: string;
    label: string;
    angle: number;
    color: string;
    dataCurrency: ResearchDataCurrency;
}

export interface ResearchSettings {
    BASE_THROUGHPUT: number;
    GPU_THROUGHPUT_BONUS: number;
    DEFAULT_QUEUE_LIMIT: number;
    DATA_CAPACITY: Record<ResearchDataCurrency, number>;
    DATA_OUTPUT: Record<ResearchDataCurrency, number>;
}

export interface ResearchProgressState {
    progress: number;
}

export interface ResearchState {
    completed: string[];
    activeResearch: string | null;
    researchQueue: string[];
    progressById: Record<string, ResearchProgressState>;
    dataStore: Record<ResearchDataCurrency, number>;
    queueLimit: number;
}

// ── 연구 노드 (Research) ──
export interface ResearchNode {
    ID: string;
    NAME: string;
    COST: number; // Legacy total cost facade.
    DESCRIPTION: string;
    AXIS: string;
    RING: number;
    POSITION: number;
    DATA_COSTS: Partial<Record<ResearchDataCurrency, number>>;
    TAGS: ResearchTag[];
    UNLOCKS: {
        BUILDINGS?: string[];
        RECIPES?: string[];
        CABLES?: string[];
    };
    REQUIREMENTS?: string[]; // IDs of required research nodes
    EFFECTS?: ResearchEffects;
    QUEUE_LIMIT_BONUS?: number;
    THROUGHPUT_BONUS?: number;
}

export interface ResearchNodeSnapshot {
    id: string;
    name: string;
    description: string;
    axis: string;
    ring: number;
    position: number;
    status: ResearchNodeStatus;
    progressPercent: number;
    costText: string;
    tagLabels: string[];
    effectsText: string[];
}

export interface ResearchDataShortfall {
    id: ResearchDataCurrency;
    label: string;
    required: number;
    available: number;
    missing: number;
}

export interface ResearchQueueSnapshot {
    id: string;
    name: string;
    progressPercent: number;
    status: ResearchNodeStatus;
}

export interface ActiveResearchSnapshot extends ResearchQueueSnapshot {
    blocked: boolean;
    missingData: ResearchDataShortfall[];
}

export interface ResearchPanelSnapshot {
    open: boolean;
    title: string;
    closeLabel: string;
    throughputText: string;
    queueText: string;
    dataBalances: Array<{
        id: ResearchDataCurrency;
        label: string;
        value: number;
        capacity: number;
        percent: number;
    }>;
    activeResearch: ActiveResearchSnapshot | null;
    researchQueue: ResearchQueueSnapshot[];
    blockedData: {
        blocked: boolean;
        researchId: string | null;
        missing: ResearchDataShortfall[];
        message: string;
    };
    axes: ResearchAxis[];
    nodes: ResearchNodeSnapshot[];
    selectedId: string | null;
}

// ── 건물 타입 키 (타입 안전성 강화) ──
export type BuildingType =
    | 'MINER' | 'DATA_DOWNLOADER' | 'CORE' | 'PROCESSOR'
    | 'POWER_NODE' | 'POWER_PLANT' | 'STORAGE'
    | 'CLASSIFIER' | 'FILTER' | 'FIREWALL'
    | 'ACCESS_POINT' | 'SOLAR_PANEL' | 'NEURAL_TRAINER' | 'WEIGHT_TRAINER'
    | 'RESEARCH_OPERATIONS_CENTER' | 'RESEARCH_LAB' | 'DATA_CENTER' | 'GPU_CLUSTER'
    | 'RECYCLER' | 'DATA_CACHE' | 'REPEATER';

// ── 케이블 연결 ──
export interface CableConnection {
    id: string;
    fromKey: string;
    toKey: string;
    bandwidth: number;
    queue: CablePacket[];
    cableType: 'BASIC' | 'FIBER';
    costPaid?: number;
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
    averageSatisfaction?: number;
    lowPowerNetworks?: number;
    networks?: PowerNetwork[];
    blackoutNetworks?: number;
}

// ── 코어 데이터 수신 이벤트 ──
export interface CoreDataEvent {
    type: string;
    score: number;
    total: number;
}

export interface TopHudLabels {
    aria: string;
    runtimeStats: string;
    shortcuts: string;
    settings: string;
    research: string;
    stats: {
        dataReceived: string;
        power: string;
        silicon: string;
        packets: string;
        wave: string;
        nextWave: string;
    };
}

export interface HudSnapshot {
    labels?: TopHudLabels;
    score?: number;
    power?: PowerUpdateData;
    silicon?: number;
    packets?: number;
    wave?: number;
    waveTimer?: string;
}

export interface TacticalPanelSnapshot {
    labels: {
        aria: string;
        expand: string;
        collapse: string;
        panelNames: Record<'objective' | 'threat' | 'systems', string>;
        objective: string;
        threat: string;
        systems: string;
        powerLoad: string;
    };
    objective: {
        title: string;
        detail: string;
    };
    threat: {
        title: string;
        detail: string;
        recommendation: string;
        threatLevel: ThreatLevel;
        routeNames: string[];
        special: string | null;
    };
    defense: {
        title: string;
        detail: string;
    };
    powerStatus: {
        text: string;
        tone: 'default' | 'warning' | 'danger';
    };
}

export interface BuildConsoleItemSnapshot {
    key: string;
    label: string;
    cost: string;
    color: string;
    iconSrc?: string;
    description?: string;
    stats?: Array<{
        label: string;
        value: string;
        tone?: 'default' | 'good' | 'warning';
    }>;
    hotkey?: string;
    selected: boolean;
}

export interface BuildConsoleSnapshot {
    activeCategory: string;
    labels: {
        aria: string;
        categories: string;
        tools: string;
        toolInfo: string;
        selectedTool: string;
        more: string;
        commandSelect: string;
        commandRotate: string;
        commandRemove: string;
    };
    categories: Array<{
        id: string;
        label: string;
        active: boolean;
    }>;
    items: BuildConsoleItemSnapshot[];
    selectedTool: {
        type: string;
        name: string;
        cost: string;
        hint: string;
    };
}

export interface SettingsModalSnapshot {
    open: boolean;
    speed: number;
    fps: number;
    renderResolutionPreset: RenderResolutionPreset;
    volume: number;
    muted: boolean;
    bloomEnabled: boolean;
    language: Language;
    labels: {
        aria: string;
        kicker: string;
        title: string;
        close: string;
        tabs: Record<'game' | 'audio' | 'graphics' | 'system', string>;
        speed: string;
        language: string;
        languageKo: string;
        languageEn: string;
        masterVolume: string;
        muted: string;
        graphics: string;
        fps: string;
        renderResolution: string;
        renderResolutionOptions: Record<RenderResolutionPreset, string>;
        saveData: string;
        save: string;
        load: string;
        tutorial: string;
        restartTutorial: string;
        note: string;
        bloomOn: string;
        bloomOff: string;
    };
}

export interface GameOverSnapshot {
    open: boolean;
    kicker: string;
    title: string;
    failureCode: string;
    integrityLabel: string;
    restartLabel: string;
    mainMenuLabel: string;
    stats: Array<{
        id: 'wave' | 'core' | 'data' | 'research';
        label: string;
        value: string;
        tone: 'warn' | 'danger' | 'cyan' | 'green';
    }>;
    wave: number;
    coreHpPercent: number;
    totalDataReceived: number;
    unlockedResearchCount: number;
}

export interface WaveResultSnapshot {
    open: boolean;
    token: number;
    wave: number;
    kicker: string;
    title: string;
    closeLabel: string;
    integrityLabel: string;
    integrityTone: 'good' | 'warning' | 'danger';
    historyLabel: string;
    historyWaveLabel: string;
    historyCoreLabel: string;
    historyKillsLabel: string;
    stats: Array<{
        id: 'destroyed' | 'data' | 'integrity' | 'buildings';
        label: string;
        value: string;
        tone: 'default' | 'good' | 'warning' | 'danger';
    }>;
    outcome: 'survived' | 'failed';
    enemiesDestroyed: number;
    dataProcessed: number;
    coreHpPercent: number;
    coreDamage: number;
    buildingsDamaged: number;
    buildingsDestroyed: number;
}

export interface ActivityLogEntrySnapshot {
    id: number;
    message: string;
    isAlert: boolean;
}

export interface ActivityLogSnapshot {
    ariaLabel: string;
    title: string;
    alertCountLabel: string;
    historyLabel: string;
    lessLabel: string;
    noAlertsLabel: string;
    entries: ActivityLogEntrySnapshot[];
}

export interface TooltipSnapshot {
    open: boolean;
    title: string;
    closeLabel: string;
    lines: string[];
    x: number;
    y: number;
}

export interface TutorialPanelSnapshot {
    open: boolean;
    mode: 'step' | 'complete';
    kicker: string;
    title: string;
    completedTitle: string;
    continueLabel: string;
    labels: {
        skip: string;
        progress: string;
        currentObjective: string;
        steps: string;
        ok: string;
        moreSteps: string;
    };
    detail: string;
    activeStepId: string;
    completeCount: number;
    totalCount: number;
    steps: Array<{
        id: string;
        title: string;
        completed: boolean;
        active: boolean;
    }>;
}

export interface MobileActionSnapshot {
    open: boolean;
    labels: {
        aria: string;
        toolbar: string;
        cableMenu: string;
    };
    summaryTitle: string;
    summaryDetail: string;
    cableMenuOpen: boolean;
    cableOptions: Array<{
        id: string;
        label: string;
        selected: boolean;
    }>;
    actions: Array<{
        id: string;
        label: string;
        active: boolean;
    }>;
}

export interface MainMenuSnapshot {
    open: boolean;
    labels: {
        aria: string;
    };
    title: string;
    subtitle: string;
    difficultyLabel: string;
    startLabel: string;
    continueLabel: string;
    tutorialStatusLabel: string;
    saveStatusLabel: string;
    keyHints: string[];
    selectedDifficulty: string;
    difficulties: Array<{
        id: string;
        label: string;
        description: string;
        selected: boolean;
    }>;
    tutorialCompleted: boolean;
    saveExists: boolean;
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
    lowPower: boolean;
    satisfaction: number;
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
    tutorialManager?: TutorialManager;
    performanceStats: PerformanceStats;
    mode: GameMode;
    gameSpeed: number;
    difficultyId: string;
    isMobileLayout: boolean;
    setGameSpeed(speed: number): void;
    bloomEnabled: boolean;
    setBloomEnabled(enabled: boolean): void;
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
    hp?: number;
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
    costPaid?: number;
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
    };
    buildings: SavedBuilding[];
    researchState?: ResearchState;
    items: SavedItem[];
    cables?: SavedCable[];
    settings: {
        gameSpeed: number;
        showPowerGrid: boolean;
        showDefenseRange: boolean;
        bloomEnabled?: boolean;
        difficulty?: string;
        language?: Language;
        masterVolume: number;
        muted?: boolean;
        tutorialCompleted?: boolean;
        tutorialStep?: number;
        mapType?: MapType;
        mapPresetId?: MapPresetId;
        mapSeed?: number;
    };
    resourceMap: { key: string; type: string }[];
    terrainMap: { key: string; type: string }[];
    research: string[];
}
