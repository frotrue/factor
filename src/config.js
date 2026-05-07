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

    // 데이터 기반 건물 정의 (3.2 전략)
    BUILDINGS: {
        MINER: {
            ID: 'MINER',
            NAME: '데이터 추출기 (Data Node)',
            COLOR: 0xef4444,
            PRODUCTION_RATE: 2, // 틱당 생산 주기
            DESCRIPTION: '메모리 영역에서 원시 데이터를 추출합니다.'
        },
        CONVEYOR: {
            ID: 'CONVEYOR',
            NAME: '시냅스 경로 (Synaptic Link)',
            COLOR: 0x3b82f6,
            DESCRIPTION: '데이터 패킷을 다음 노드로 운반합니다.'
        },
        CORE: {
            ID: 'CORE',
            NAME: '메인 서버 (Neural Core)',
            COLOR: 0x10b981,
            HP: 1000
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
