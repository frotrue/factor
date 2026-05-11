export const CONFIG = {
    GRID_SIZE: 32,
    TICK_RATE: 500,
    // 카메라 설정
    CAMERA: {
        DEFAULT_ZOOM: 1.5,
        MIN_ZOOM: 0.5,
        MAX_ZOOM: 3.0,
        LERP: 0.1
    },
    // 렌더링 최적화 설정
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
            NAME: '데이터 추출기 (Data Node)',
            COLOR: 0xef4444,
            PRODUCTION_RATE: 2,
            DESCRIPTION: '메모리 영역에서 원시 데이터를 추출합니다.',
            POWER: { CONSUMPTION: 5, PRODUCTION: 0 },
            CATEGORY: 'EXTRACTION'
        },
        /*
        CONVEYOR: {
            ID: 'CONVEYOR',
            NAME: '시냅스 경로 (Synaptic Link)',
            COLOR: 0x3b82f6,
            DESCRIPTION: '데이터 패킷을 다음 노드로 운반합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS'
        },
        */
        CORE: {
            ID: 'CORE',
            NAME: '메인 서버 (Neural Core)',
            COLOR: 0x10b981,
            HP: 1000,
            POWER: { CONSUMPTION: 0, PRODUCTION: 20, RANGE: 3 },
            CATEGORY: 'NONE'
        },
        PROCESSOR: {
            ID: 'PROCESSOR',
            NAME: '데이터 가공소 (Data Processor)',
            COLOR: 0xa855f7,
            DESCRIPTION: '원시 데이터를 라벨링된 데이터로 가공합니다.',
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
        POWER_NODE: {
            ID: 'POWER_NODE',
            NAME: '전력 송신탑 (Power Node)',
            COLOR: 0xf59e0b,
            DESCRIPTION: '메인 서버로부터 전력을 중계합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 0, RANGE: 5 },
            CATEGORY: 'POWER',
            COST: [{ resource: 'SILICON', amount: 3 }]
        },
        POWER_PLANT: {
            ID: 'POWER_PLANT',
            NAME: '에너지 발전소 (Power Plant)',
            COLOR: 0xfacc15,
            DESCRIPTION: '에너지 셀 매립지에서 전력을 생산합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 50, RANGE: 0 },
            CATEGORY: 'POWER',
            COST: [{ resource: 'SILICON', amount: 15 }]
        },
        STORAGE: {
            ID: 'STORAGE',
            NAME: '데이터 창고 (Storage)',
            COLOR: 0x6b7280,
            DESCRIPTION: '대량의 데이터를 보관합니다. (2x2)',
            WIDTH: 2,
            HEIGHT: 2,
            MAX_BUFFER: 50,
            POWER: { CONSUMPTION: 2, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS'
        },
        UNLOADER: {
            ID: 'UNLOADER',
            NAME: '하역기 (Unloader)',
            COLOR: 0xf97316,
            DESCRIPTION: '인접한 창고에서 데이터를 빼냅니다.',
            POWER: { CONSUMPTION: 5, PRODUCTION: 0 },
            CATEGORY: 'EXTRACTION'
        },
        CLASSIFIER: {
            ID: 'CLASSIFIER',
            NAME: '분류 모델 (Classifier)',
            COLOR: 0xd946ef,
            DESCRIPTION: '단일 대상에게 높은 데미지를 주는 방어 타워.',
            POWER: { CONSUMPTION: 10, PRODUCTION: 0 },
            MAX_BUFFER: 20,
            DEFENSE: { DAMAGE: 25, RANGE: 4, FIRE_RATE: 2, AMMO_TYPE: 'WEIGHT_UPDATE', AMMO_CONSUMPTION: 1 },
            CATEGORY: 'DEFENSE',
            COST: [{ resource: 'SILICON', amount: 10 }]
        },
        FILTER: {
            ID: 'FILTER',
            NAME: '노이즈 필터 (Filter)',
            COLOR: 0x8b5cf6,
            DESCRIPTION: '범위 내의 적들에게 지속적인 광역 피해를 주는 방어 타워.',
            POWER: { CONSUMPTION: 15, PRODUCTION: 0 },
            MAX_BUFFER: 30,
            DEFENSE: { DAMAGE: 10, RANGE: 3, FIRE_RATE: 4, AMMO_TYPE: 'WEIGHT_UPDATE', AMMO_CONSUMPTION: 2, IS_AOE: true },
            CATEGORY: 'DEFENSE',
            COST: [{ resource: 'SILICON', amount: 15 }]
        },
        FIREWALL: {
            ID: 'FIREWALL',
            NAME: '방화벽 (Firewall)',
            COLOR: 0xe11d48,
            DESCRIPTION: '적의 이동을 막고 접촉 시 데미지를 줍니다.',
            POWER: { CONSUMPTION: 5, PRODUCTION: 0 },
            HP: 500,
            DEFENSE: { DAMAGE: 5, RANGE: 1, FIRE_RATE: 1, AMMO_CONSUMPTION: 0 },
            CATEGORY: 'DEFENSE',
            COST: [{ resource: 'SILICON', amount: 20 }]
        },
        /*
        SPLITTER: {
            ID: 'SPLITTER',
            NAME: '분배기 (Splitter)',
            COLOR: 0x22d3ee,
            DESCRIPTION: '입력된 데이터를 좌/우 또는 직진/우측으로 번갈아 보냅니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 0 },
            UNLOCK_REQUIRED: 'TECH_SPLITTER',
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 3 }]
        },
        MERGER: {
            ID: 'MERGER',
            NAME: '합류기 (Merger)',
            COLOR: 0x0ea5e9,
            DESCRIPTION: '여러 방향에서 들어오는 데이터를 한 방향으로 합칩니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 0 },
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 3 }]
        },
        FAST_LINK: {
            ID: 'FAST_LINK',
            NAME: '고속 시냅스 (Fast Link)',
            COLOR: 0x2563eb,
            DESCRIPTION: '데이터 패킷을 2배 빠르게 운반합니다.',
            POWER: { CONSUMPTION: 1, PRODUCTION: 0 },
            UNLOCK_REQUIRED: 'TECH_FAST_CONVEYOR',
            CATEGORY: 'LOGISTICS',
            COST: [{ resource: 'SILICON', amount: 5 }]
        },
        */
        SOLAR_PANEL: {
            ID: 'SOLAR_PANEL',
            NAME: '태양광 패널 (Solar Panel)',
            COLOR: 0xfde047,
            DESCRIPTION: '자원 소비 없이 10W의 전력을 소량 생산합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 10, RANGE: 0 },
            UNLOCK_REQUIRED: 'TECH_SOLAR_POWER',
            CATEGORY: 'POWER',
            COST: [{ resource: 'SILICON', amount: 10 }]
        },
        NEURAL_TRAINER: {
            ID: 'NEURAL_TRAINER',
            NAME: '신경망 학습기 (Neural Trainer)',
            COLOR: 0x6366f1,
            DESCRIPTION: '고급 아이템을 생산하는 2x2 사이즈의 가공소입니다.',
            WIDTH: 2,
            HEIGHT: 2,
            POWER: { CONSUMPTION: 20, PRODUCTION: 0 },
            UNLOCK_REQUIRED: 'TECH_ADVANCED_PROCESSING',
            CATEGORY: 'PRODUCTION',
            COST: [{ resource: 'SILICON', amount: 30 }]
        },
        ACCESS_POINT: {
            ID: 'ACCESS_POINT',
            NAME: 'AP (Access Point)',
            COLOR: 0x22d3ee,
            DESCRIPTION: '반경 5칸 이내의 건물들과 무선으로 데이터를 주고받습니다.',
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
            BANDWIDTH: 3, // 틱당 3개 전송
            COST_PER_TILE: 1, // 거리당 실리콘 비용
            MAX_QUEUE: 10
        },
        FIBER: {
            ID: 'FIBER',
            NAME: '광섬유 케이블 (Fiber Optic)',
            COLOR: 0x06b6d4,
            BANDWIDTH: 8, // 틱당 8개 전송
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
        BANDWIDTH: 2, // 무선은 대역폭 낮음
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
        }
    },
    ITEMS: {
        RAW_DATA: {
            ID: 'RAW_DATA',
            NAME: 'Raw Data',
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
        RAW_DATA: 0x00ffff,
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
            RADIUS: 8
        },
        MALWARE: {
            ID: 'MALWARE',
            NAME: 'Malware',
            COLOR: 0xff0044,
            BASE_HP: 150,
            SPEED: 25,
            DAMAGE: 30,
            RADIUS: 10
        },
        ADVERSARIAL: {
            ID: 'ADVERSARIAL',
            NAME: 'Adversarial',
            COLOR: 0x8800ff,
            BASE_HP: 80,
            SPEED: 50,
            DAMAGE: 20,
            RADIUS: 6
        },
        OVERFITTED_MODEL: {
            ID: 'OVERFITTED_MODEL',
            NAME: 'Overfitted Model',
            COLOR: 0x4c1d95,
            BASE_HP: 1500,
            SPEED: 15,
            DAMAGE: 100,
            RADIUS: 16
        }
    },
    RESEARCH: {
        TECH_FAST_CONVEYOR: {
            ID: 'TECH_FAST_CONVEYOR',
            NAME: '고속 시냅스 연결',
            COST: 50,
            DESCRIPTION: '데이터 이동 속도를 2배로 증가시키는 고속 컨베이어를 해금합니다.',
            UNLOCKS: { BUILDINGS: ['FAST_LINK'] }
        },
        TECH_SPLITTER: {
            ID: 'TECH_SPLITTER',
            NAME: '데이터 분산 처리',
            COST: 50,
            DESCRIPTION: '데이터의 흐름을 양갈래로 나눌 수 있는 분배기를 해금합니다.',
            UNLOCKS: { BUILDINGS: ['SPLITTER'] }
        },
        TECH_SOLAR_POWER: {
            ID: 'TECH_SOLAR_POWER',
            NAME: '태양광 발전',
            COST: 100,
            DESCRIPTION: '자원 없이 소량의 전력을 생산하는 태양광 패널을 해금합니다.',
            UNLOCKS: { BUILDINGS: ['SOLAR_PANEL'] }
        },
        TECH_ADVANCED_PROCESSING: {
            ID: 'TECH_ADVANCED_PROCESSING',
            NAME: '고급 모델 학습',
            COST: 200,
            DESCRIPTION: '고급 아이템을 생산할 수 있는 신경망 학습기와 모델 학습 레시피를 해금합니다.',
            REQUIREMENTS: ['TECH_FAST_CONVEYOR'],
            UNLOCKS: { BUILDINGS: ['NEURAL_TRAINER'], RECIPES: ['MODEL_TRAINING'] }
        },
        TECH_AUTOMATED_DEFENSE: {
            ID: 'TECH_AUTOMATED_DEFENSE',
            NAME: '자동 방어 AI',
            COST: 300,
            DESCRIPTION: '최종 방어 타워의 탄약이 되는 추론 유닛(Inference Unit) 생산 레시피를 해금합니다.',
            REQUIREMENTS: ['TECH_ADVANCED_PROCESSING'],
            UNLOCKS: { RECIPES: ['INFERENCE_UNIT_PRODUCTION'] }
        }
    }
};
//# sourceMappingURL=config.js.map