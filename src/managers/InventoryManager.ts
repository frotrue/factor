import BuildingManager from './BuildingManager';
import { BuildingCost } from '../types';

/**
 * 자원 재고 관리자.
 * Storage 건물의 inputBuffer를 스캔하여 전역 자원 풀을 제공합니다.
 * 건물 건설 시 비용을 Storage에서 차감합니다.
 */
export default class InventoryManager {
    buildingManager: BuildingManager;

    constructor(buildingManager: BuildingManager) {
        this.buildingManager = buildingManager;
    }

    /** 특정 자원의 보유량을 반환 (모든 Storage 합산) */
    getResourceCount(resourceType: string): number {
        let count = 0;
        this.buildingManager.forEach(b => {
            if (b.type === 'STORAGE') {
                count += b.inputBuffer.filter(t => t === resourceType).length;
            }
        });
        return count;
    }

    /** 모든 자원 보유량을 반환 */
    getAllResources(): Map<string, number> {
        const resources = new Map<string, number>();
        this.buildingManager.forEach(b => {
            if (b.type === 'STORAGE') {
                b.inputBuffer.forEach(type => {
                    resources.set(type, (resources.get(type) || 0) + 1);
                });
            }
        });
        return resources;
    }

    /** 건설 비용을 감당할 수 있는지 확인 */
    canAfford(costs: BuildingCost[]): boolean {
        if (!costs || costs.length === 0) return true;
        const available = this.getAllResources();
        return costs.every(c => (available.get(c.resource) || 0) >= c.amount);
    }

    /** 건설 비용을 Storage에서 차감. 성공 시 true 반환 */
    spend(costs: BuildingCost[]): boolean {
        if (!costs || costs.length === 0) return true;
        if (!this.canAfford(costs)) return false;

        for (const cost of costs) {
            let remaining = cost.amount;
            this.buildingManager.forEach(b => {
                if (b.type !== 'STORAGE' || remaining <= 0) return;
                while (remaining > 0) {
                    const idx = b.inputBuffer.indexOf(cost.resource);
                    if (idx === -1) break;
                    b.inputBuffer.splice(idx, 1);
                    remaining--;
                }
            });
        }
        return true;
    }
}
