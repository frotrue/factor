export const CONFIG = {
    GRID_SIZE: 32,
    TICK_RATE: 500,
    
    // 카메라 설정
    CAMERA: {
        DEFAULT_ZOOM: 1.5,
        MIN_ZOOM: 0.5,
        MAX_ZOOM: 3.0,
        LERP: 0.1 // 부드러운 카메라 이동을 위한 값
    },

    // 렌더링 최적화 설정
    OPTIMIZATION: {
        GRID_REDRAW_THRESHOLD: 0.1 // 카메라 이동량이 이보다 작으면 그리드를 다시 그리지 않음
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
            POWER: { CONSUMPTION: 5, PRODUCTION: 0 }
        },
        CONVEYOR: {
            ID: 'CONVEYOR',
            NAME: '시냅스 경로 (Synaptic Link)',
            COLOR: 0x3b82f6,
            DESCRIPTION: '데이터 패킷을 다음 노드로 운반합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 0 }
        },
        CORE: {
            ID: 'CORE',
            NAME: '메인 서버 (Neural Core)',
            COLOR: 0x10b981,
            HP: 1000,
            POWER: { CONSUMPTION: 0, PRODUCTION: 20, RANGE: 3 } // 기본 전력 제공
        },
        PROCESSOR: {
            ID: 'PROCESSOR',
            NAME: '데이터 가공소 (Data Processor)',
            COLOR: 0xa855f7,
            DESCRIPTION: '원시 데이터를 라벨링된 데이터로 가공합니다.',
            POWER: { CONSUMPTION: 10, PRODUCTION: 0 }
        },
        POWER_NODE: {
            ID: 'POWER_NODE',
            NAME: '전력 송신탑 (Power Node)',
            COLOR: 0xf59e0b, // Amber
            DESCRIPTION: '메인 서버로부터 전력을 중계합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 0, RANGE: 5 } // 5x5 반경 전력 공급
        },
        POWER_PLANT: {
            ID: 'POWER_PLANT',
            NAME: '에너지 발전소 (Power Plant)',
            COLOR: 0xfacc15,
            DESCRIPTION: '에너지 셀 매립지에서 전력을 생산합니다.',
            POWER: { CONSUMPTION: 0, PRODUCTION: 50, RANGE: 0 }
        },
        STORAGE: {
            ID: 'STORAGE',
            NAME: '데이터 창고 (Storage)',
            COLOR: 0x6b7280, // Gray
            DESCRIPTION: '대량의 데이터를 보관합니다. (2x2)',
            WIDTH: 2,
            HEIGHT: 2,
            MAX_BUFFER: 50,
            POWER: { CONSUMPTION: 2, PRODUCTION: 0 }
        },
        UNLOADER: {
            ID: 'UNLOADER',
            NAME: '하역기 (Unloader)',
            COLOR: 0xf97316, // Orange
            DESCRIPTION: '인접한 창고에서 데이터를 빼냅니다.',
            POWER: { CONSUMPTION: 5, PRODUCTION: 0 }
        }
    },

    // 레시피 정의
    RECIPES: {
        LABELLING: {
            INPUTS: [{ type: 'RAW_DATA', amount: 1 }],
            OUTPUT: 'LABELED_DATA',
            TIME: 3 // 3틱 소요
        },
        WEIGHT_TRAINING: {
            INPUTS: [{ type: 'LABELED_DATA', amount: 2 }],
            OUTPUT: 'WEIGHT_UPDATE',
            TIME: 5 // 5틱 소요
        }
    },

    // 아이템 및 자원 설정
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
            COLOR: 0xf472b6, // 핑크
            RADIUS: 8
        },
        SILICON: {
            ID: 'SILICON',
            NAME: 'Silicon',
            COLOR: 0x94a3b8, // 슬레이트 블루/그레이
            RADIUS: 6
        },
        ENERGY: {
            ID: 'ENERGY',
            NAME: 'Energy Cell',
            COLOR: 0xfde047, // 밝은 노란색
            RADIUS: 6
        }
    },

    // 맵 자원 매립지 색상
    RESOURCE_PATCHES: {
        RAW_DATA: 0x00ffff,
        SILICON: 0x94a3b8,
        ENERGY: 0xfde047
    }
};
