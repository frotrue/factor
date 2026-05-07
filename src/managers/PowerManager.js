import { CONFIG } from '../config.js';
import EventBus from './EventBus.js';

export default class PowerManager {
    constructor(scene, buildingManager) {
        this.scene = scene;
        this.buildingManager = buildingManager;
        this.gridSize = CONFIG.GRID_SIZE;
        
        this.totalProduction = 0;
        this.totalConsumption = 0;
        this.availablePower = 0;
        
        // key: "x,y", value: boolean (true if powered)
        this.poweredArea = new Set();
        this.nodes = [];
    }

    updatePowerGrid() {
        this.totalProduction = 0;
        this.totalConsumption = 0;
        this.poweredArea.clear();
        this.nodes = [];
        
        let coreBuilding = null;

        // 1. 모든 건물 순회하며 발전량/소비량 및 노드 수집
        this.buildingManager.forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            if (!pConfig) return;

            // 발전소 활성화 체크 (PowerPlant 등)
            let isGenerating = true;
            if (building.type === 'POWER_PLANT' && !building.isActive) {
                isGenerating = false;
            }

            if (isGenerating && pConfig.PRODUCTION > 0) {
                this.totalProduction += pConfig.PRODUCTION;
            }

            // 송신탑 및 코어 위치 수집
            if (pConfig.RANGE > 0) {
                this.nodes.push({
                    x: building.x,
                    y: building.y,
                    range: pConfig.RANGE
                });
            }

            if (building.type === 'CORE') {
                coreBuilding = building;
            }
        });

        // 2. 전력망 (Powered Area) 계산
        // 현재는 BFS 연결을 생략하고 모든 노드의 범위 합집합으로 단순화 (추후 BFS로 확장 가능)
        this.nodes.forEach(node => {
            const rangeTiles = node.range;
            const cx = Math.floor(node.x / this.gridSize);
            const cy = Math.floor(node.y / this.gridSize);

            for (let dx = -rangeTiles; dx <= rangeTiles; dx++) {
                for (let dy = -rangeTiles; dy <= rangeTiles; dy++) {
                    const gridX = (cx + dx) * this.gridSize;
                    const gridY = (cy + dy) * this.gridSize;
                    this.poweredArea.add(`${gridX},${gridY}`);
                }
            }
        });

        // 3. 소비량 계산 및 전력 공급 판정
        this.buildingManager.forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            if (!pConfig) return;

            const key = `${building.x},${building.y}`;
            const inGrid = this.poweredArea.has(key);

            if (pConfig.CONSUMPTION > 0) {
                if (inGrid) {
                    this.totalConsumption += pConfig.CONSUMPTION;
                }
            }
        });

        // 4. 블랙아웃 판정
        this.availablePower = this.totalProduction - this.totalConsumption;
        const isBlackout = this.availablePower < 0;

        // 5. 건물별 최종 전력 상태 적용
        this.buildingManager.forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            if (!pConfig) return;

            const key = `${building.x},${building.y}`;
            const inGrid = this.poweredArea.has(key);

            if (pConfig.CONSUMPTION > 0) {
                // 전력망 내부에 있고, 블랙아웃이 아니면 동작
                building.hasPower = inGrid && !isBlackout;
            } else {
                // 전력을 소비하지 않는 건물 (예: 컨베이어, 노드 자체)
                building.hasPower = true;
            }
        });

        // 6. UI 업데이트
        EventBus.emit('POWER_UPDATED', {
            production: this.totalProduction,
            consumption: this.totalConsumption,
            net: this.availablePower,
            isBlackout
        });
    }

    isPowered(x, y) {
        return this.poweredArea.has(`${x},${y}`);
    }
}
