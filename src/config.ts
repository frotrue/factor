import { GameConfig } from './types';

export const CONFIG: GameConfig = {
    GRID_SIZE: 32,
    TICK_RATE: 500,

    TIMING: {
        TICK_RATE_MULTIPLIER: 0.5,
        AUTO_SAVE_INTERVAL_MS: 60000,
        INITIAL_WAVE_DELAY_MS: 30000,
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
        GRID_REDRAW_THRESHOLD: 0.1
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
            COLOR: 0xef4444,
            TEXTURE: 'building-miner',
            PRODUCTION_RATE: 2,
            DESCRIPTION: 'Silicon 자원 위에서 Silicon을 채굴합니다.',
            POWER: { CONSUMPTION: 5, PRODUCTION: 0 },
            CATEGORY: 'EXTRACTION'
        },
        DATA_DOWNLOADER: {
            ID: 'DATA_DOWNLOADER',
            NAME: '데이터 다운로더 (Data Downloader)',
            COLOR: 0x00ffff,
            PRODUCTION_RATE: 2,
            DESCRIPTION: '전력만 공급되면 어디서든 Signal Packet을 다운로드합니다.',
            POWER: { CONSUMPTION: 6, PRODUCTION: 0 },
            CATEGORY: 'EXTRACTION',
            COST: [{ resource: 'SILICON', amount: 5 }]
        },
        CONVEYOR: {
            ID: 'CONVEYOR',
            NAME: '컨베이어 벨트 (Conveyor)',
            COLOR: 0x3b82f6,
            TEXTURE: 'building-conveyor',
            DESCRIPTION: 'Silicon 같은 물리 자원을 한 방향으로 운반합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 1 }]
        },
        CORE: {
            ID: 'CORE',
            NAME: '메인 서버 (Neural Core)',
            COLOR: 0x10b981,
            TEXTURE: 'building-core',
            WIDTH: 4,
            HEIGHT: 4,
            HP: 1000,
            POWER: { CONSUMPTION: 0, PRODUCTION: 50, RANGE: 3 },
            CATEGORY: 'NONE'
        },
        PROCESSOR: {
            ID: 'PROCESSOR',
            NAME: '데이터 가공소 (Data Processor)',
            COLOR: 0xa855f7,
            TEXTURE: 'building-processor',
            DESCRIPTION: 'Signal Packet을 라벨링된 데이터로 가공합니다.',
            POWER: { CONSUMPTION: 10, PRODUCTION: 0 },
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 5 }]
        },
        WEIGHT_TRAINER: {
            ID: 'WEIGHT_TRAINER',
            NAME: '가중치 학습기 (Weight Trainer)',
            COLOR: 0x9370db,
            DESCRIPTION: '라벨링된 데이터로 가중치를 업데이트합니다.',
            POWER: { CONSUMPTION: 15, PRODUCTION: 0 },
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 10 }]
        },
        RECYCLER: {
            ID: 'RECYCLER',
            NAME: 'Recycler',
            COLOR: 0x78716c,
            DESCRIPTION: 'Converts any two data items into one Silicon.',
            POWER: { CONSUMPTION: 8, PRODUCTION: 0 },
            UNLOCK_REQUIRED: 'TECH_RECYCLING',
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 8 }]
        },
        POWER_NODE: {
            ID: 'POWER_NODE',
            NAME: '전력 송신탑 (Power Node)',
            COLOR: 0xf59e0b,
            TEXTURE: 'building-power-node',
            DESCRIPTION: '전력을 주변 건물로 중계합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 0, RANGE: 5 },
            CATEGORY: 'POWER',
            COST: [{ resource: 'SILICON', amount: 3 }]
        },
        POWER_PLANT: {
            ID: 'POWER_PLANT',
            NAME: '에너지 발전소 (Power Plant)',
            COLOR: 0xfacc15,
            TEXTURE: 'building-power-plant',
            DESCRIPTION: 'Energy Cell 매립지에서 전력을 생산합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 50, RANGE: 3 },
            CATEGORY: 'POWER',
            COST: [{ resource: 'SILICON', amount: 15 }]
        },
        STORAGE: {
            ID: 'STORAGE',
            NAME: '자원 창고 (Storage)',
            COLOR: 0x6b7280,
            TEXTURE: 'building-storage',
            DESCRIPTION: '대량의 물리 자원 또는 데이터를 보관합니다. (2x2)',
            WIDTH: 2,
            HEIGHT: 2,
            MAX_BUFFER: 50,
            POWER: { CONSUMPTION: 2, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS'
        },
        DATA_CACHE: {
            ID: 'DATA_CACHE',
            NAME: 'Data Cache',
            COLOR: 0x38bdf8,
            DESCRIPTION: 'Stores up to 20 data items as a cable-friendly buffer.',
            MAX_BUFFER: 20,
            POWER: { CONSUMPTION: 3, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 6 }]
        },
        UNLOADER: {
            ID: 'UNLOADER',
            NAME: '하역기 (Unloader)',
            COLOR: 0xf97316,
            DESCRIPTION: '인접한 창고에서 자원을 빼냅니다.',
            POWER: { CONSUMPTION: 5, PRODUCTION: 0 },
            CATEGORY: 'EXTRACTION'
        },
        CLASSIFIER: {
            ID: 'CLASSIFIER',
            NAME: '분류 모델 (Classifier)',
            COLOR: 0xd946ef,
            TEXTURE: 'building-classifier',
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
            COLOR: 0x8b5cf6,
            TEXTURE: 'building-filter',
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
            COLOR: 0xe11d48,
            TEXTURE: 'building-firewall',
            DESCRIPTION: '적의 이동을 막고 접촉 시 피해를 줍니다.',
            POWER: { CONSUMPTION: 5, PRODUCTION: 0 },
            HP: 500,
            DEFENSE: { DAMAGE: 5, RANGE: 1, FIRE_RATE: 1, AMMO_CONSUMPTION: 0 },
            CATEGORY: 'DEFENSE',
            COST: [{ resource: 'SILICON', amount: 20 }]
        },
        FAST_LINK: {
            ID: 'FAST_LINK',
            NAME: '고속 컨베이어 (Fast Link)',
            COLOR: 0x2563eb,
            TEXTURE: 'building-fast-link',
            DESCRIPTION: 'Silicon을 일반 컨베이어보다 빠르게 운반합니다.',
            POWER: { CONSUMPTION: 1, PRODUCTION: 0 },
            UNLOCK_REQUIRED: 'TECH_FAST_CONVEYOR',
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 5 }]
        },
        /*
        Legacy conveyor-family config kept for future splitter/merger mechanics.
        SPLITTER: {
            ID: 'SPLITTER',
            NAME: '분배기 (Splitter)',
            COLOR: 0x22d3ee,
            DESCRIPTION: '입력된 물리 자원을 여러 방향으로 분배합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 0 },
            UNLOCK_REQUIRED: 'TECH_SPLITTER',
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 3 }]
        },
        MERGER: {
            ID: 'MERGER',
            NAME: '합류기 (Merger)',
            COLOR: 0x0ea5e9,
            DESCRIPTION: '여러 방향에서 들어오는 물리 자원을 한 방향으로 합칩니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 3 }]
        },
        */
        SOLAR_PANEL: {
            ID: 'SOLAR_PANEL',
            NAME: '태양광 패널 (Solar Panel)',
            COLOR: 0xfde047,
            DESCRIPTION: '독립 전력 전용. 자기 자신에게만 전력을 공급하며 전력망을 확장하거나 주변 건물에 전력을 공유하지 않습니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 10, RANGE: 0 },
            UNLOCK_REQUIRED: 'TECH_SOLAR_POWER',
            CATEGORY: 'POWER',
            COST: [{ resource: 'SILICON', amount: 10 }]
        },
        NEURAL_TRAINER: {
            ID: 'NEURAL_TRAINER',
            NAME: '신경망 학습기 (Neural Trainer)',
            COLOR: 0x6366f1,
            DESCRIPTION: '고급 데이터 아이템을 생산하는 2x2 가공소입니다.',
            WIDTH: 2,
            HEIGHT: 2,
            POWER: { CONSUMPTION: 20, PRODUCTION: 0 },
            UNLOCK_REQUIRED: 'TECH_ADVANCED_PROCESSING',
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 30 }]
        },
        MODEL_TRAINING_LAB: {
            ID: 'MODEL_TRAINING_LAB',
            NAME: 'Model Training Lab',
            COLOR: 0x14b8a6,
            DESCRIPTION: 'Consumes Weight Updates and trained AI artifacts to improve a selected defense model.',
            WIDTH: 2,
            HEIGHT: 2,
            MAX_BUFFER: 12,
            POWER: { CONSUMPTION: 18, PRODUCTION: 0 },
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 24 }]
        },
        ACCESS_POINT: {
            ID: 'ACCESS_POINT',
            NAME: 'AP (Access Point)',
            COLOR: 0x22d3ee,
            DESCRIPTION: 'Relays data sessions between nearby producers and receivers without Ethernet cables.',
            POWER: { CONSUMPTION: 10, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 15 }]
        }
    },

    CABLES: {
        BASIC: {
            ID: 'BASIC',
            NAME: '이더넷 케이블 (Ethernet)',
            COLOR: 0x3b82f6,
            BANDWIDTH: 3,
            COST_PER_TILE: 1,
            MAX_QUEUE: 10
        },
        FIBER: {
            ID: 'FIBER',
            NAME: '광섬유 케이블 (Fiber Optic)',
            COLOR: 0x06b6d4,
            BANDWIDTH: 8,
            COST_PER_TILE: 3,
            MAX_QUEUE: 20,
            UNLOCK_REQUIRED: 'TECH_FIBER_OPTIC'
        }
    },

    ACCESS_POINT: {
        ID: 'ACCESS_POINT',
        NAME: 'AP (Access Point)',
        COLOR: 0x22d3ee,
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
        MODEL_TRAINING: {
            INPUTS: [{ type: 'WEIGHT_UPDATE', amount: 1 }, { type: 'SILICON', amount: 1 }],
            OUTPUT: 'TRAINED_MODEL',
            TIME: 8
        },
        INFERENCE_UNIT_PRODUCTION: {
            INPUTS: [{ type: 'TRAINED_MODEL', amount: 1 }, { type: 'ENERGY', amount: 1 }],
            OUTPUT: 'INFERENCE_UNIT',
            TIME: 5
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
            COLOR: 0x00ffff,
            RADIUS: 6
        },
        LABELED_DATA: {
            ID: 'LABELED_DATA',
            NAME: 'Labeled Data',
            COLOR: 0x38bdf8,
            RADIUS: 7
        },
        WEIGHT_UPDATE: {
            ID: 'WEIGHT_UPDATE',
            NAME: 'Weight Update',
            COLOR: 0xf472b6,
            RADIUS: 8
        },
        SILICON: {
            ID: 'SILICON',
            NAME: 'Silicon',
            COLOR: 0x94a3b8,
            RADIUS: 6
        },
        ENERGY: {
            ID: 'ENERGY',
            NAME: 'Energy Cell',
            COLOR: 0xfde047,
            RADIUS: 6
        },
        PROJECTILE: {
            ID: 'PROJECTILE',
            NAME: 'Projectile',
            COLOR: 0xffffff,
            RADIUS: 3
        },
        TRAINED_MODEL: {
            ID: 'TRAINED_MODEL',
            NAME: 'Trained Model',
            COLOR: 0xa855f7,
            RADIUS: 8
        },
        INFERENCE_UNIT: {
            ID: 'INFERENCE_UNIT',
            NAME: 'Inference Unit',
            COLOR: 0xec4899,
            RADIUS: 8
        }
    },

    RESOURCE_PATCHES: {
        SILICON: 0x94a3b8,
        ENERGY: 0xfde047
    },

    ENEMIES: {
        NOISE: {
            ID: 'NOISE',
            NAME: 'Noise',
            COLOR: 0xff4444,
            BASE_HP: 50,
            SPEED: 30,
            DAMAGE: 10,
            RADIUS: 8,
            REWARD_SILICON: 1
        },
        MALWARE: {
            ID: 'MALWARE',
            NAME: 'Malware',
            COLOR: 0xff0044,
            BASE_HP: 150,
            SPEED: 25,
            DAMAGE: 30,
            RADIUS: 10,
            REWARD_SILICON: 3
        },
        ADVERSARIAL: {
            ID: 'ADVERSARIAL',
            NAME: 'Adversarial',
            COLOR: 0x8800ff,
            BASE_HP: 80,
            SPEED: 50,
            DAMAGE: 20,
            RADIUS: 6,
            REWARD_SILICON: 2
        },
        OVERFITTED_MODEL: {
            ID: 'OVERFITTED_MODEL',
            NAME: 'Overfitted Model',
            COLOR: 0x4c1d95,
            BASE_HP: 1500,
            SPEED: 15,
            DAMAGE: 100,
            RADIUS: 16,
            REWARD_SILICON: 20
        },
        DDOS_BOT: {
            ID: 'DDOS_BOT',
            NAME: 'DDoS Packet',
            COLOR: 0x00ff88,
            BASE_HP: 15,
            SPEED: 55,
            DAMAGE: 4,
            RADIUS: 5,
            REWARD_SILICON: 0
        }
    },

    RESEARCH: {
        TECH_RECYCLING: {
            ID: 'TECH_RECYCLING',
            NAME: 'Recycling Loop',
            COST: 80,
            DESCRIPTION: 'Unlocks the Recycler, which converts excess data items back into Silicon.',
            UNLOCKS: { BUILDINGS: ['RECYCLER'] }
        },
        TECH_EFFICIENT_MINING: {
            ID: 'TECH_EFFICIENT_MINING',
            NAME: '효율적 채굴',
            COST: 75,
            DESCRIPTION: '자원 추출기의 생산 주기를 25% 단축합니다.',
            UNLOCKS: {},
            EFFECTS: { MINING_RATE_MULTIPLIER: 0.75 }
        },
        TECH_STREAMLINED_PROCESSING: {
            ID: 'TECH_STREAMLINED_PROCESSING',
            NAME: '처리 파이프라인 최적화',
            COST: 120,
            DESCRIPTION: '가공 건물의 처리 시간을 20% 단축합니다.',
            REQUIREMENTS: ['TECH_EFFICIENT_MINING'],
            UNLOCKS: {},
            EFFECTS: { PROCESSING_SPEED_MULTIPLIER: 0.8 }
        },
        TECH_PRECISION_INFERENCE: {
            ID: 'TECH_PRECISION_INFERENCE',
            NAME: '정밀 추론',
            COST: 140,
            DESCRIPTION: '분류 모델과 이상 탐지 엔진의 피해량을 30% 증가시킵니다.',
            UNLOCKS: {},
            EFFECTS: { TOWER_DAMAGE_MULTIPLIER: 1.3 }
        },
        TECH_DEFENSE_RANGE: {
            ID: 'TECH_DEFENSE_RANGE',
            NAME: '방어 범위 확장',
            COST: 160,
            DESCRIPTION: '방어 타워의 사거리를 1칸 늘립니다.',
            REQUIREMENTS: ['TECH_PRECISION_INFERENCE'],
            UNLOCKS: {},
            EFFECTS: { TOWER_RANGE_BONUS: 1 }
        },
        TECH_RAPID_RESPONSE: {
            ID: 'TECH_RAPID_RESPONSE',
            NAME: '고속 대응 루프',
            COST: 220,
            DESCRIPTION: '방어 타워의 발사 주기를 20% 단축합니다.',
            REQUIREMENTS: ['TECH_DEFENSE_RANGE'],
            UNLOCKS: {},
            EFFECTS: { TOWER_FIRE_RATE_MULTIPLIER: 0.8 }
        },
        TECH_DISTRIBUTED_AP: {
            ID: 'TECH_DISTRIBUTED_AP',
            NAME: '분산 AP 처리',
            COST: 150,
            DESCRIPTION: 'AP 범위를 2칸 늘리고 케이블 처리량을 1 증가시킵니다.',
            UNLOCKS: {},
            EFFECTS: { AP_RANGE_BONUS: 2, CABLE_BANDWIDTH_BONUS: 1 }
        },
        TECH_FIBER_OPTIC: {
            ID: 'TECH_FIBER_OPTIC',
            NAME: 'Fiber Optic Cable',
            COST: 150,
            DESCRIPTION: 'Unlocks fiber optic cable with bandwidth 8 and queue capacity 20.',
            REQUIREMENTS: ['TECH_DISTRIBUTED_AP'],
            UNLOCKS: { CABLES: ['FIBER'] },
            EFFECTS: {}
        },
        TECH_FIREWALL_HARDENING: {
            ID: 'TECH_FIREWALL_HARDENING',
            NAME: '방화벽 경화',
            COST: 180,
            DESCRIPTION: '방화벽 체력을 50% 증가시킵니다.',
            UNLOCKS: {},
            EFFECTS: { FIREWALL_HP_MULTIPLIER: 1.5 }
        },
        TECH_FAST_CONVEYOR: {
            ID: 'TECH_FAST_CONVEYOR',
            NAME: '고속 컨베이어',
            COST: 50,
            DESCRIPTION: '물리 자원을 더 빠르게 운반하는 고속 컨베이어를 해금합니다.',
            UNLOCKS: { BUILDINGS: ['FAST_LINK'] }
        },
        TECH_SPLITTER: {
            ID: 'TECH_SPLITTER',
            NAME: '데이터 분산 처리',
            COST: 50,
            DESCRIPTION: '미래 분배기 물류 확장을 위한 레거시 연구입니다. 현재 빌드 UI에는 노출되지 않습니다.',
            UNLOCKS: {}
        },
        TECH_SOLAR_POWER: {
            ID: 'TECH_SOLAR_POWER',
            NAME: '태양광 발전',
            COST: 100,
            DESCRIPTION: '자기 자신에게만 전력을 공급하는 독립형 태양광 패널을 해금합니다.',
            UNLOCKS: { BUILDINGS: ['SOLAR_PANEL'] }
        },
        TECH_ADVANCED_PROCESSING: {
            ID: 'TECH_ADVANCED_PROCESSING',
            NAME: '고급 모델 학습',
            COST: 200,
            DESCRIPTION: '고급 아이템을 생산할 수 있는 신경망 학습기와 모델 학습 레시피를 해금합니다.',
            UNLOCKS: { BUILDINGS: ['NEURAL_TRAINER', 'MODEL_TRAINING_LAB'], RECIPES: ['MODEL_TRAINING'] }
        },
        TECH_AUTOMATED_DEFENSE: {
            ID: 'TECH_AUTOMATED_DEFENSE',
            NAME: '자동 방어 AI',
            COST: 300,
            DESCRIPTION: '최종 방어 타워의 탄약이 되는 추론 유닛 생산 레시피를 해금합니다.',
            REQUIREMENTS: ['TECH_ADVANCED_PROCESSING'],
            UNLOCKS: { RECIPES: ['INFERENCE_UNIT_PRODUCTION'] }
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
