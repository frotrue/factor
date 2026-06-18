import { GameConfig } from './types';

export const CONFIG: GameConfig = {
    GRID_SIZE: 32,
    CORE_ORIGIN: { TILE_X: -2, TILE_Y: -2 },
    TICK_RATE: 500,

    TIMING: {
        TICK_RATE_MULTIPLIER: 0.5,
        AUTO_SAVE_INTERVAL_MS: 60000,
        INITIAL_WAVE_DELAY_MS: 30000,
        CAMPAIGN_INITIAL_WAVE_DELAY_MS: 45000,
        WAVE_COOLDOWN_MS: 20000,
        ENEMY_SPAWN_INTERVAL_MS: 1000,
        DATA_PULSE_DURATION_MS: 500
    },

    CAMERA: {
        DEFAULT_ZOOM: 1.5,
        MIN_ZOOM: 0.5,
        MAX_ZOOM: 3.0,
        LERP: 0.1
    },

    OPTIMIZATION: {
        GRID_REDRAW_THRESHOLD: 2.0,
        GRID_CHUNK_TILES: 16
    },

    DIRECTIONS: [
        { x: 1, y: 0, angle: 0 },
        { x: 0, y: 1, angle: 90 },
        { x: -1, y: 0, angle: 180 },
        { x: 0, y: -1, angle: 270 }
    ],

    BUILDINGS: {
        MINER: {
            ID: 'MINER',
            NAME: '자원 추출기 (Extractor)',
            COLOR: 0x59e0ff,
            PRODUCTION_RATE: 2,
            HP: 140,
            DESCRIPTION: 'Silicon 자원 위에서 Silicon을 채굴합니다.',
            POWER: { CONSUMPTION: 5, PRODUCTION: 0 },
            CATEGORY: 'EXTRACTION'
        },
        DATA_DOWNLOADER: {
            ID: 'DATA_DOWNLOADER',
            NAME: '데이터 다운로더 (Data Downloader)',
            COLOR: 0x52f7ff,
            PRODUCTION_RATE: 2,
            HP: 120,
            DESCRIPTION: '전력만 공급되면 어디서든 Signal Packet을 다운로드합니다.',
            POWER: { CONSUMPTION: 6, PRODUCTION: 0 },
            CATEGORY: 'EXTRACTION',
            COST: [{ resource: 'SILICON', amount: 5 }]
        },
        CORE: {
            ID: 'CORE',
            NAME: '메인 서버 (Neural Core)',
            COLOR: 0x63ffb1,
            WIDTH: 4,
            HEIGHT: 4,
            HP: 1000,
            POWER: { CONSUMPTION: 0, PRODUCTION: 50, RANGE: 5 },
            CATEGORY: 'NONE'
        },
        PROCESSOR: {
            ID: 'PROCESSOR',
            NAME: '데이터 가공소 (Data Processor)',
            COLOR: 0xb789ff,
            HP: 160,
            DESCRIPTION: 'Signal Packet을 라벨링된 데이터로 가공합니다.',
            POWER: { CONSUMPTION: 10, PRODUCTION: 0 },
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 5 }]
        },
        WEIGHT_TRAINER: {
            ID: 'WEIGHT_TRAINER',
            NAME: '가중치 학습기 (Weight Trainer)',
            COLOR: 0xa970ff,
            HP: 170,
            DESCRIPTION: '라벨링된 데이터로 가중치를 업데이트합니다.',
            POWER: { CONSUMPTION: 15, PRODUCTION: 0 },
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 10 }]
        },
        RECYCLER: {
            ID: 'RECYCLER',
            NAME: 'Recycler',
            COLOR: 0x7dd3fc,
            HP: 150,
            DESCRIPTION: 'Converts any two data items into one Silicon.',
            POWER: { CONSUMPTION: 8, PRODUCTION: 0 },
            UNLOCK_REQUIRED: 'TECH_RECYCLING',
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 8 }]
        },
        POWER_NODE: {
            ID: 'POWER_NODE',
            NAME: '전력 송신탑 (Power Node)',
            COLOR: 0xffdf6e,
            HP: 140,
            DESCRIPTION: '전력을 주변 건물로 중계합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 0, RANGE: 5 },
            CATEGORY: 'POWER',
            COST: [{ resource: 'SILICON', amount: 3 }]
        },
        POWER_PLANT: {
            ID: 'POWER_PLANT',
            NAME: '에너지 발전소 (Power Plant)',
            COLOR: 0xffe873,
            HP: 190,
            DESCRIPTION: 'Energy Cell 매립지에서 전력을 생산합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 50, RANGE: 3 },
            CATEGORY: 'POWER',
            COST: [{ resource: 'SILICON', amount: 15 }]
        },
        STORAGE: {
            ID: 'STORAGE',
            NAME: '자원 창고 (Storage)',
            COLOR: 0x8fa4bd,
            HP: 220,
            DESCRIPTION: '대량의 물리 자원 또는 데이터를 보관합니다. (2x2)',
            WIDTH: 2,
            HEIGHT: 2,
            MAX_BUFFER: 500,
            POWER: { CONSUMPTION: 2, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS'
        },
        DATA_CACHE: {
            ID: 'DATA_CACHE',
            NAME: 'Data Cache',
            COLOR: 0x74a7ff,
            HP: 130,
            DESCRIPTION: 'Stores up to 20 data items as a cable-friendly buffer.',
            MAX_BUFFER: 20,
            POWER: { CONSUMPTION: 3, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 6 }]
        },
        CLASSIFIER: {
            ID: 'CLASSIFIER',
            NAME: '분류 모델 (Classifier)',
            COLOR: 0xff6888,
            HP: 260,
            DESCRIPTION: '단일 대상에게 높은 피해를 주는 방어 타워입니다.',
            POWER: { CONSUMPTION: 10, PRODUCTION: 0 },
            MAX_BUFFER: 20,
            DEFENSE: { DAMAGE: 25, RANGE: 4, FIRE_RATE: 2, AMMO_CONSUMPTION: 0 },
            CATEGORY: 'DEFENSE',
            COST: [{ resource: 'SILICON', amount: 10 }]
        },
        FILTER: {
            ID: 'FILTER',
            NAME: '이상 탐지 엔진 (Anomaly Detection Engine)',
            COLOR: 0xb789ff,
            HP: 240,
            DESCRIPTION: 'Weight Update로 학습된 이상 탐지 모델이 주변의 비정상 트래픽 패턴을 분석하고 범위 피해를 적용합니다.',
            POWER: { CONSUMPTION: 15, PRODUCTION: 0 },
            MAX_BUFFER: 30,
            DEFENSE: { DAMAGE: 10, RANGE: 3, FIRE_RATE: 4, AMMO_CONSUMPTION: 0, IS_AOE: true },
            CATEGORY: 'DEFENSE',
            COST: [{ resource: 'SILICON', amount: 15 }]
        },
        FIREWALL: {
            ID: 'FIREWALL',
            NAME: '방화벽 (Firewall)',
            COLOR: 0xff4d6d,
            DESCRIPTION: '적의 이동을 막고 접촉 시 피해를 줍니다.',
            POWER: { CONSUMPTION: 5, PRODUCTION: 0 },
            HP: 500,
            DEFENSE: { DAMAGE: 5, RANGE: 1, FIRE_RATE: 1, AMMO_CONSUMPTION: 0 },
            CATEGORY: 'DEFENSE',
            COST: [{ resource: 'SILICON', amount: 20 }]
        },
        SOLAR_PANEL: {
            ID: 'SOLAR_PANEL',
            NAME: '태양광 패널 (Solar Panel)',
            COLOR: 0xffdf6e,
            HP: 90,
            DESCRIPTION: '독립형 전력 패널. 자신의 주변 1x1(본인을 중심으로 8칸)의 전력 공급 범위를 가집니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 10, RANGE: 1 },
            UNLOCK_REQUIRED: 'TECH_SOLAR_POWER',
            CATEGORY: 'POWER',
            COST: [{ resource: 'SILICON', amount: 10 }]
        },
        NEURAL_TRAINER: {
            ID: 'NEURAL_TRAINER',
            NAME: '신경망 학습기 (Neural Trainer)',
            COLOR: 0x8fb3ff,
            HP: 260,
            DESCRIPTION: 'Weight Update를 Tactical Data 연구 자원으로 변환하는 2x2 가공소입니다.',
            WIDTH: 2,
            HEIGHT: 2,
            POWER: { CONSUMPTION: 20, PRODUCTION: 0 },
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 30 }]
        },
        RESEARCH_OPERATIONS_CENTER: {
            ID: 'RESEARCH_OPERATIONS_CENTER',
            NAME: 'Research Operations Center',
            COLOR: 0x64ffcf,
            HP: 280,
            DESCRIPTION: 'Boosts global research speed. Powered adjacent GPU Clusters increase this center contribution.',
            WIDTH: 2,
            HEIGHT: 2,
            MAX_BUFFER: 12,
            POWER: { CONSUMPTION: 18, PRODUCTION: 0 },
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 24 }]
        },
        RESEARCH_LAB: {
            ID: 'RESEARCH_LAB',
            NAME: 'Research Lab',
            COLOR: 0x5eead4,
            HP: 220,
            DESCRIPTION: 'Analyzes Material Samples into Material Data for production and energy research.',
            WIDTH: 2,
            HEIGHT: 2,
            MAX_BUFFER: 16,
            POWER: { CONSUMPTION: 16, PRODUCTION: 0 },
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 20 }]
        },
        DATA_CENTER: {
            ID: 'DATA_CENTER',
            NAME: 'Data Center',
            COLOR: 0x60a5fa,
            HP: 260,
            DESCRIPTION: 'Collects system operation logs into System Data for automation and network research.',
            WIDTH: 2,
            HEIGHT: 2,
            POWER: { CONSUMPTION: 24, PRODUCTION: 0 },
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 45 }]
        },
        GPU_CLUSTER: {
            ID: 'GPU_CLUSTER',
            NAME: 'GPU Cluster',
            COLOR: 0x7cf7ff,
            HP: 180,
            DESCRIPTION: 'High-power accelerator. Place next to a Research Operations Center to boost global research speed.',
            POWER: { CONSUMPTION: 35, PRODUCTION: 0 },
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 80 }]
        },
        ACCESS_POINT: {
            ID: 'ACCESS_POINT',
            NAME: 'AP (Access Point)',
            COLOR: 0x50f4ff,
            HP: 130,
            DESCRIPTION: 'Relays data sessions between nearby producers and receivers without Ethernet cables.',
            POWER: { CONSUMPTION: 10, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 15 }]
        },
        REPEATER: {
            ID: 'REPEATER',
            NAME: '케이블 중계기 (Repeater)',
            COLOR: 0x75f0c8,
            HP: 120,
            DESCRIPTION: 'Powered wired relay node for extending cable networks around blocked or long routes.',
            POWER: { CONSUMPTION: 4, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 8 }]
        }
    },

    CABLES: {
        BASIC: {
            ID: 'BASIC',
            NAME: '이더넷 케이블 (Ethernet)',
            COLOR: 0x5aa9ff,
            BANDWIDTH: 3,
            COST_PER_TILE: 1,
            MAX_LENGTH_TILES: 8,
            MAX_QUEUE: 10
        },
        FIBER: {
            ID: 'FIBER',
            NAME: '광섬유 케이블 (Fiber Optic)',
            COLOR: 0x50f4ff,
            BANDWIDTH: 8,
            COST_PER_TILE: 3,
            MAX_LENGTH_TILES: 16,
            MAX_QUEUE: 20,
            UNLOCK_REQUIRED: 'TECH_FIBER_OPTIC'
        }
    },

    ACCESS_POINT: {
        ID: 'ACCESS_POINT',
        NAME: 'AP (Access Point)',
        COLOR: 0x50f4ff,
        RANGE: 5,
        BANDWIDTH: 2,
        POWER: { CONSUMPTION: 10, PRODUCTION: 0 },
        COST: [{ resource: 'SILICON', amount: 15 }],
        CATEGORY: 'LOGISTICS'
    },

    RECIPES: {
        LABELLING: {
            INPUTS: [{ type: 'RAW_DATA', amount: 1 }],
            OUTPUT: 'LABELED_DATA',
            TIME: 3
        },
        WEIGHT_TRAINING: {
            INPUTS: [{ type: 'LABELED_DATA', amount: 2 }],
            OUTPUT: 'WEIGHT_UPDATE',
            TIME: 5
        },
        TACTICAL_DATA_SYNTHESIS: {
            INPUTS: [{ type: 'WEIGHT_UPDATE', amount: 1 }],
            OUTPUT: 'TACTICAL_DATA',
            TIME: 8
        },
        RECYCLING: {
            INPUTS: [{ type: 'ANY_DATA', amount: 2 }],
            OUTPUT: 'SILICON',
            TIME: 4
        }
    },

    ITEMS: {
        RAW_DATA: {
            ID: 'RAW_DATA',
            NAME: 'Signal Packet',
            COLOR: 0x52f7ff,
            RADIUS: 6
        },
        LABELED_DATA: {
            ID: 'LABELED_DATA',
            NAME: 'Labeled Data',
            COLOR: 0x6fb8ff,
            RADIUS: 7
        },
        WEIGHT_UPDATE: {
            ID: 'WEIGHT_UPDATE',
            NAME: 'Weight Update',
            COLOR: 0xff78cb,
            RADIUS: 8
        },
        SILICON: {
            ID: 'SILICON',
            NAME: 'Silicon',
            COLOR: 0xb9c7d8,
            RADIUS: 6
        },
        ENERGY: {
            ID: 'ENERGY',
            NAME: 'Energy Cell',
            COLOR: 0xffe873,
            RADIUS: 6
        },
        MATERIAL_SAMPLE: {
            ID: 'MATERIAL_SAMPLE',
            NAME: 'Material Sample',
            COLOR: 0x7dd3fc,
            RADIUS: 6
        },
        TACTICAL_DATA: {
            ID: 'TACTICAL_DATA',
            NAME: 'Tactical Data',
            COLOR: 0xf0abfc,
            RADIUS: 7
        },
        PROJECTILE: {
            ID: 'PROJECTILE',
            NAME: 'Projectile',
            COLOR: 0xffffff,
            RADIUS: 3
        }
    },

    RESOURCE_PATCHES: {
        SILICON: 0x93c5fd,
        ENERGY: 0xf8e27d,
        MATERIAL_SAMPLE: 0x7dd3fc
    },

    TERRAIN: {
        BLOCKER: {
            ID: 'BLOCKER',
            NAME: 'Data Debris',
            COLOR: 0x162235,
            BLOCKS_BUILDING: true,
            BLOCKS_ENEMY: true
        }
    },

    MAP_PRESETS: {
        tutorial: {
            ID: 'tutorial',
            MAP_TYPE: 'tutorial',
            WORLD_BOUNDS: { minX: -9, maxX: 8, minY: -9, maxY: 8 },
            BUILD_BOUNDS: { minX: -8, maxX: 7, minY: -8, maxY: 7 },
            CAMERA_PADDING_TILES: 3,
            FIXED_RESOURCES: [
                { type: 'SILICON', x: -5, y: -3, size: 3 },
                { type: 'ENERGY', x: 2, y: 2, size: 3 },
                { type: 'SILICON', x: -2, y: -6, size: 2 }
            ],
            TERRAIN_LAYOUTS: ['tutorialArenaWalls']
        },
        standard: {
            ID: 'standard',
            MAP_TYPE: 'random',
            WORLD_BOUNDS: { minX: -64, maxX: 64, minY: -64, maxY: 64 },
            BUILD_BOUNDS: { minX: -64, maxX: 64, minY: -64, maxY: 64 },
            RESOURCE_BOUNDS: { minX: -60, maxX: 60, minY: -60, maxY: 60 },
            CAMERA_PADDING_TILES: 4,
            STARTER_SAFE_AREA: { minX: -20, maxX: 20, minY: -20, maxY: 20 },
            FIXED_RESOURCES: [
                // North quadrant
                { type: 'SILICON', x: -10, y: -46, size: 5 },
                { type: 'ENERGY', x: 8, y: -42, size: 4 },
                { type: 'MATERIAL_SAMPLE', x: -1, y: -48, size: 3 },
                // East quadrant
                { type: 'SILICON', x: 40, y: -8, size: 5 },
                { type: 'ENERGY', x: 44, y: 10, size: 4 },
                { type: 'MATERIAL_SAMPLE', x: 51, y: 0, size: 3 },
                // South quadrant
                { type: 'SILICON', x: 6, y: 42, size: 5 },
                { type: 'ENERGY', x: -12, y: 46, size: 4 },
                { type: 'MATERIAL_SAMPLE', x: 0, y: 52, size: 3 },
                // West quadrant
                { type: 'SILICON', x: -46, y: 6, size: 5 },
                { type: 'ENERGY', x: -42, y: -10, size: 4 },
                { type: 'MATERIAL_SAMPLE', x: -52, y: -2, size: 3 }
            ],
            STARTER_ZONES: [
                {
                    type: 'SILICON',
                    area: { minX: -8, maxX: -4, minY: -6, maxY: -1 },
                    patchSize: 3,
                    minTiles: 9
                },
                {
                    type: 'ENERGY',
                    area: { minX: 3, maxX: 7, minY: 3, maxY: 7 },
                    patchSize: 3,
                    minTiles: 9
                },
                {
                    type: 'MATERIAL_SAMPLE',
                    area: { minX: 4, maxX: 8, minY: -8, maxY: -4 },
                    patchSize: 3,
                    minTiles: 9
                }
            ],
            RANDOM_RESOURCES: {
                types: ['SILICON', 'ENERGY', 'MATERIAL_SAMPLE'],
                patchCount: { min: 24, max: 36 },
                patchSize: { min: 2, max: 5 },
                range: { minX: -60, maxX: 60, minY: -60, maxY: 60 },
                exclusionZones: []
            },
            RESOURCE_RINGS: [
                {
                    minDistance: 17,
                    maxDistance: 23,
                    patchCount: { min: 4, max: 6 },
                    patchSize: { min: 2, max: 3 }
                },
                {
                    minDistance: 24,
                    maxDistance: 44,
                    patchCount: { min: 18, max: 26 },
                    patchSize: { min: 3, max: 5 },
                    directionalBias: true
                },
                {
                    minDistance: 45,
                    maxDistance: 60,
                    patchCount: { min: 4, max: 8 },
                    patchSize: { min: 4, max: 6 }
                }
            ],
            STARTER_VALIDATION: {
                center: { x: 0, y: 0 },
                radius: 16,
                maxRepairAttempts: 5
            },
            TERRAIN_LAYOUTS: ['earlyLaneBlockers']
        }
    },

    ENEMIES: {
        NOISE: {
            ID: 'NOISE',
            NAME: 'Noise',
            COLOR: 0xff5d68,
            BASE_HP: 50,
            SPEED: 30,
            DAMAGE: 10,
            RADIUS: 8,
            REWARD_SILICON: 1
        },
        MALWARE: {
            ID: 'MALWARE',
            NAME: 'Malware',
            COLOR: 0xff2a8b,
            BASE_HP: 150,
            SPEED: 25,
            DAMAGE: 30,
            RADIUS: 10,
            REWARD_SILICON: 3
        },
        ADVERSARIAL: {
            ID: 'ADVERSARIAL',
            NAME: 'Adversarial',
            COLOR: 0xa970ff,
            BASE_HP: 80,
            SPEED: 50,
            DAMAGE: 20,
            RADIUS: 6,
            REWARD_SILICON: 2
        },
        OVERFITTED_MODEL: {
            ID: 'OVERFITTED_MODEL',
            NAME: 'Overfitted Model',
            COLOR: 0x6d35ff,
            BASE_HP: 1500,
            SPEED: 15,
            DAMAGE: 100,
            RADIUS: 16,
            REWARD_SILICON: 20
        },
        DDOS_BOT: {
            ID: 'DDOS_BOT',
            NAME: 'DDoS Packet',
            COLOR: 0x46ff9a,
            BASE_HP: 15,
            SPEED: 55,
            DAMAGE: 4,
            RADIUS: 5,
            REWARD_SILICON: 0
        }
    },

    RESEARCH_AXES: [
        { id: 'production', label: 'Production', angle: 180, color: '#7dd3fc', dataCurrency: 'material' },
        { id: 'energy', label: 'Energy', angle: 120, color: '#fde047', dataCurrency: 'material' },
        { id: 'defense', label: 'Defense', angle: 270, color: '#fb7185', dataCurrency: 'tactical' },
        { id: 'model', label: 'Model', angle: 60, color: '#f0abfc', dataCurrency: 'tactical' },
        { id: 'automation', label: 'Automation', angle: 0, color: '#a78bfa', dataCurrency: 'system' },
        { id: 'network', label: 'Network', angle: 330, color: '#50f4ff', dataCurrency: 'system' }
    ],

    RESEARCH_SETTINGS: {
        BASE_THROUGHPUT: 6,
        GPU_THROUGHPUT_BONUS: 1.5,
        DEFAULT_QUEUE_LIMIT: 3,
        DATA_CAPACITY: {
            material: 300,
            tactical: 300,
            system: 300
        },
        DATA_OUTPUT: {
            material: 1,
            tactical: 1,
            system: 1
        }
    },

    RESEARCH: {
        CORE_BASIC_RESEARCH: {
            ID: 'CORE_BASIC_RESEARCH',
            NAME: 'Basic Research',
            COST: 300,
            DESCRIPTION: 'Establishes the shared research framework and opens the first ring.',
            AXIS: 'core',
            RING: 0,
            POSITION: 0,
            DATA_COSTS: { material: 300 },
            TAGS: ['unlock'],
            UNLOCKS: {}
        },
        CORE_RESEARCH_SLOT_I: {
            ID: 'CORE_RESEARCH_SLOT_I',
            NAME: 'Parallel Research I',
            COST: 120,
            DESCRIPTION: 'Increases the global research queue limit.',
            AXIS: 'core',
            RING: 1,
            POSITION: 0,
            DATA_COSTS: { material: 50, tactical: 20, system: 50 },
            TAGS: ['queue', 'rule-change'],
            REQUIREMENTS: ['CORE_BASIC_RESEARCH'],
            UNLOCKS: {},
            QUEUE_LIMIT_BONUS: 1
        },
        CORE_THROUGHPUT_I: {
            ID: 'CORE_THROUGHPUT_I',
            NAME: 'Research Throughput I',
            COST: 150,
            DESCRIPTION: 'Improves the amount of research data the queue can consume each tick.',
            AXIS: 'core',
            RING: 1,
            POSITION: 1,
            DATA_COSTS: { material: 40, tactical: 40, system: 70 },
            TAGS: ['throughput', 'rule-change'],
            REQUIREMENTS: ['CORE_BASIC_RESEARCH'],
            UNLOCKS: {},
            THROUGHPUT_BONUS: 2
        },
        CORE_TIER_2_GATE: {
            ID: 'CORE_TIER_2_GATE',
            NAME: 'Applied Research Gate',
            COST: 240,
            DESCRIPTION: 'Unifies material, tactical, and system research into the second ring.',
            AXIS: 'core',
            RING: 2,
            POSITION: 0,
            DATA_COSTS: { material: 80, tactical: 80, system: 80 },
            TAGS: ['unlock', 'rule-change'],
            REQUIREMENTS: ['CORE_RESEARCH_SLOT_I', 'CORE_THROUGHPUT_I'],
            UNLOCKS: {}
        },

        TECH_EFFICIENT_MINING: {
            ID: 'TECH_EFFICIENT_MINING',
            NAME: 'Efficient Mining',
            COST: 80,
            DESCRIPTION: 'Material extraction cycles complete 25% faster.',
            AXIS: 'production',
            RING: 1,
            POSITION: 0,
            DATA_COSTS: { material: 80 },
            TAGS: ['stat'],
            REQUIREMENTS: ['CORE_BASIC_RESEARCH'],
            UNLOCKS: {},
            EFFECTS: { MINING_RATE_MULTIPLIER: 0.75 }
        },
        TECH_RECYCLING: {
            ID: 'TECH_RECYCLING',
            NAME: 'Recycling Loop',
            COST: 90,
            DESCRIPTION: 'Unlocks the Recycler, which converts excess data items back into Silicon.',
            AXIS: 'production',
            RING: 1,
            POSITION: 1,
            DATA_COSTS: { material: 90 },
            TAGS: ['unlock'],
            REQUIREMENTS: ['TECH_EFFICIENT_MINING'],
            UNLOCKS: { BUILDINGS: ['RECYCLER'] }
        },
        TECH_STREAMLINED_PROCESSING: {
            ID: 'TECH_STREAMLINED_PROCESSING',
            NAME: 'Streamlined Processing',
            COST: 140,
            DESCRIPTION: 'Processing buildings complete recipes 20% faster.',
            AXIS: 'production',
            RING: 2,
            POSITION: 0,
            DATA_COSTS: { material: 140 },
            TAGS: ['stat'],
            REQUIREMENTS: ['CORE_TIER_2_GATE', 'TECH_RECYCLING'],
            UNLOCKS: {},
            EFFECTS: { PROCESSING_SPEED_MULTIPLIER: 0.8 }
        },

        TECH_SOLAR_POWER: {
            ID: 'TECH_SOLAR_POWER',
            NAME: 'Solar Power',
            COST: 90,
            DESCRIPTION: 'Unlocks an auxiliary power panel with a compact local grid.',
            AXIS: 'energy',
            RING: 1,
            POSITION: 0,
            DATA_COSTS: { material: 90 },
            TAGS: ['unlock'],
            REQUIREMENTS: ['CORE_BASIC_RESEARCH'],
            UNLOCKS: { BUILDINGS: ['SOLAR_PANEL'] }
        },
        TECH_POWER_STABILITY: {
            ID: 'TECH_POWER_STABILITY',
            NAME: 'Power Stability',
            COST: 120,
            DESCRIPTION: 'Raises tolerance for low-power operations through better power smoothing.',
            AXIS: 'energy',
            RING: 1,
            POSITION: 1,
            DATA_COSTS: { material: 120 },
            TAGS: ['rule-change'],
            REQUIREMENTS: ['TECH_SOLAR_POWER'],
            UNLOCKS: {}
        },
        TECH_GRID_OPTIMIZATION: {
            ID: 'TECH_GRID_OPTIMIZATION',
            NAME: 'Grid Optimization',
            COST: 150,
            DESCRIPTION: 'Improves research throughput by stabilizing high-draw compute hardware.',
            AXIS: 'energy',
            RING: 2,
            POSITION: 0,
            DATA_COSTS: { material: 100, system: 50 },
            TAGS: ['throughput'],
            REQUIREMENTS: ['CORE_TIER_2_GATE', 'TECH_POWER_STABILITY'],
            UNLOCKS: {},
            THROUGHPUT_BONUS: 1
        },

        TECH_PRECISION_INFERENCE: {
            ID: 'TECH_PRECISION_INFERENCE',
            NAME: 'Defense Payload I',
            COST: 100,
            DESCRIPTION: 'Defense tower payload damage increases by 25%.',
            AXIS: 'defense',
            RING: 1,
            POSITION: 0,
            DATA_COSTS: { tactical: 100 },
            TAGS: ['stat'],
            REQUIREMENTS: ['CORE_BASIC_RESEARCH'],
            UNLOCKS: {},
            EFFECTS: { TOWER_DAMAGE_MULTIPLIER: 1.25 }
        },
        TECH_DEFENSE_RANGE: {
            ID: 'TECH_DEFENSE_RANGE',
            NAME: 'Defense Range',
            COST: 130,
            DESCRIPTION: 'Defense tower range increases by 1 tile.',
            AXIS: 'defense',
            RING: 1,
            POSITION: 1,
            DATA_COSTS: { tactical: 130 },
            TAGS: ['stat'],
            REQUIREMENTS: ['TECH_PRECISION_INFERENCE'],
            UNLOCKS: {},
            EFFECTS: { TOWER_RANGE_BONUS: 1 }
        },
        TECH_RAPID_RESPONSE: {
            ID: 'TECH_RAPID_RESPONSE',
            NAME: 'Rapid Response',
            COST: 180,
            DESCRIPTION: 'Defense tower firing cycles complete 20% faster.',
            AXIS: 'defense',
            RING: 2,
            POSITION: 0,
            DATA_COSTS: { tactical: 180 },
            TAGS: ['stat'],
            REQUIREMENTS: ['CORE_TIER_2_GATE', 'TECH_DEFENSE_RANGE'],
            UNLOCKS: {},
            EFFECTS: { TOWER_FIRE_RATE_MULTIPLIER: 0.8 }
        },

        TECH_DATASET_ENCODING: {
            ID: 'TECH_DATASET_ENCODING',
            NAME: 'Adaptive Targeting I',
            COST: 100,
            DESCRIPTION: 'Defense tower hit chance increases by 10 percentage points.',
            AXIS: 'model',
            RING: 1,
            POSITION: 0,
            DATA_COSTS: { tactical: 100 },
            TAGS: ['stat'],
            REQUIREMENTS: ['CORE_BASIC_RESEARCH'],
            UNLOCKS: {},
            EFFECTS: { TOWER_ACCURACY_BONUS: 0.1 }
        },
        TECH_ADVANCED_PROCESSING: {
            ID: 'TECH_ADVANCED_PROCESSING',
            NAME: 'Tactical Pipeline Optimization',
            COST: 150,
            DESCRIPTION: 'Optimizes Weight Trainer and Neural Trainer cycle time for tactical data production.',
            AXIS: 'model',
            RING: 1,
            POSITION: 1,
            DATA_COSTS: { tactical: 150 },
            TAGS: ['stat'],
            REQUIREMENTS: ['TECH_DATASET_ENCODING'],
            UNLOCKS: {},
            EFFECTS: { TACTICAL_PIPELINE_SPEED_MULTIPLIER: 0.8 }
        },
        TECH_AUTOMATED_DEFENSE: {
            ID: 'TECH_AUTOMATED_DEFENSE',
            NAME: 'Automated Defense AI',
            COST: 220,
            DESCRIPTION: 'Reserved for future automated defense operations.',
            AXIS: 'model',
            RING: 2,
            POSITION: 0,
            DATA_COSTS: { tactical: 160, system: 60 },
            TAGS: ['rule-change'],
            REQUIREMENTS: ['CORE_TIER_2_GATE', 'TECH_ADVANCED_PROCESSING'],
            UNLOCKS: {}
        },

        TECH_AUTO_QUEUE: {
            ID: 'TECH_AUTO_QUEUE',
            NAME: 'Queue Discipline',
            COST: 1440,
            DESCRIPTION: 'Improves global research scheduling discipline for future automation.',
            AXIS: 'automation',
            RING: 1,
            POSITION: 0,
            DATA_COSTS: { system: 1440 },
            TAGS: ['rule-change'],
            REQUIREMENTS: ['CORE_BASIC_RESEARCH'],
            UNLOCKS: {}
        },
        TECH_AUTOMATION_PRIORITY: {
            ID: 'TECH_AUTOMATION_PRIORITY',
            NAME: 'Automation Priority',
            COST: 1920,
            DESCRIPTION: 'Increases the global research queue limit for broader planned work.',
            AXIS: 'automation',
            RING: 2,
            POSITION: 0,
            DATA_COSTS: { system: 1920 },
            TAGS: ['queue'],
            REQUIREMENTS: ['CORE_TIER_2_GATE', 'TECH_AUTO_QUEUE'],
            UNLOCKS: {},
            QUEUE_LIMIT_BONUS: 1
        },

        TECH_DISTRIBUTED_AP: {
            ID: 'TECH_DISTRIBUTED_AP',
            NAME: 'Distributed AP',
            COST: 1440,
            DESCRIPTION: 'AP range increases by 2 tiles and cable throughput/length improve.',
            AXIS: 'network',
            RING: 1,
            POSITION: 0,
            DATA_COSTS: { system: 1440 },
            TAGS: ['stat'],
            REQUIREMENTS: ['CORE_BASIC_RESEARCH'],
            UNLOCKS: {},
            EFFECTS: { AP_RANGE_BONUS: 2, CABLE_BANDWIDTH_BONUS: 1, CABLE_LENGTH_BONUS: 4 }
        },
        TECH_FIBER_OPTIC: {
            ID: 'TECH_FIBER_OPTIC',
            NAME: 'Fiber Optic Cable',
            COST: 1680,
            DESCRIPTION: 'Unlocks fiber optic cable with higher bandwidth and queue capacity.',
            AXIS: 'network',
            RING: 1,
            POSITION: 1,
            DATA_COSTS: { system: 1680 },
            TAGS: ['unlock'],
            REQUIREMENTS: ['TECH_DISTRIBUTED_AP'],
            UNLOCKS: { CABLES: ['FIBER'] }
        },
        TECH_FIREWALL_HARDENING: {
            ID: 'TECH_FIREWALL_HARDENING',
            NAME: 'Firewall Hardening',
            COST: 1800,
            DESCRIPTION: 'Firewall maximum HP increases by 50%.',
            AXIS: 'network',
            RING: 2,
            POSITION: 0,
            DATA_COSTS: { system: 1500, tactical: 300 },
            TAGS: ['stat'],
            REQUIREMENTS: ['CORE_TIER_2_GATE', 'TECH_FIBER_OPTIC'],
            UNLOCKS: {},
            EFFECTS: { FIREWALL_HP_MULTIPLIER: 1.5 }
        }
    },

    DIFFICULTY: {
        EASY: {
            ID: 'EASY',
            NAME: 'Easy',
            ENEMY_HP_MULTIPLIER: 0.7,
            ENEMY_SPAWN_MULTIPLIER: 0.8,
            REWARD_MULTIPLIER: 1.2,
            WAVE_COOLDOWN_MS: 25000
        },
        NORMAL: {
            ID: 'NORMAL',
            NAME: 'Normal',
            ENEMY_HP_MULTIPLIER: 1,
            ENEMY_SPAWN_MULTIPLIER: 1,
            REWARD_MULTIPLIER: 1,
            WAVE_COOLDOWN_MS: 20000
        },
        HARD: {
            ID: 'HARD',
            NAME: 'Hard',
            ENEMY_HP_MULTIPLIER: 1.5,
            ENEMY_SPAWN_MULTIPLIER: 1.3,
            REWARD_MULTIPLIER: 0.8,
            WAVE_COOLDOWN_MS: 15000
        },
        NIGHTMARE: {
            ID: 'NIGHTMARE',
            NAME: 'Nightmare',
            ENEMY_HP_MULTIPLIER: 2,
            ENEMY_SPAWN_MULTIPLIER: 1.5,
            REWARD_MULTIPLIER: 0.6,
            WAVE_COOLDOWN_MS: 12000
        }
    }
};

/** Core placement in pixel coordinates, derived from CONFIG.CORE_ORIGIN. */
export const CORE_PIXEL_X = CONFIG.CORE_ORIGIN.TILE_X * CONFIG.GRID_SIZE;
export const CORE_PIXEL_Y = CONFIG.CORE_ORIGIN.TILE_Y * CONFIG.GRID_SIZE;
/** BuildingManager key for the core building. */
export const CORE_KEY = `${CORE_PIXEL_X},${CORE_PIXEL_Y}`;
