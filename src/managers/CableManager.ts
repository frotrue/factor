import Phaser from 'phaser';
import { CONFIG } from '../config';
import { CableConnection } from '../types';
import BuildingManager from './BuildingManager';
import ItemManager from './ItemManager';
import EventBus from './EventBus';

export default class CableManager {
    scene: Phaser.Scene;
    cables: Map<string, CableConnection>;
    apConnections: Map<string, CableConnection>;
    graphics: Phaser.GameObjects.Graphics;
    dirty: boolean;
    apDirty: boolean;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.cables = new Map();
        this.apConnections = new Map();
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(15);
        this.dirty = true;
        this.apDirty = true;

        EventBus.on('BUILDING_REMOVED', ({ key }: { key: string }) => {
            this.handleBuildingRemoved(key);
        });

        EventBus.on('BUILDING_PLACED', () => {
            this.apDirty = true;
        });
    }

    /** 건물의 원점 키를 정규화 (2x2 건물 대응) */
    normalizeKey(key: string, buildingManager: BuildingManager): string {
        const building = buildingManager.get(key);
        if (building) {
            return `${building.x},${building.y}`;
        }
        return key;
    }

    /** 케이블 ID를 정규화: 항상 사전순으로 정렬하여 A↔B 중복 방지 (P4) */
    makeCableId(keyA: string, keyB: string): string {
        const sorted = [keyA, keyB].sort();
        return `cable_${sorted[0]}_${sorted[1]}`;
    }

    connect(fromKey: string, toKey: string, type: 'BASIC' | 'FIBER' = 'BASIC'): boolean {
        if (fromKey === toKey) return false;

        const id = this.makeCableId(fromKey, toKey);
        if (this.cables.has(id)) return false;

        const config = CONFIG.CABLES[type];
        this.cables.set(id, {
            id,
            fromKey,
            toKey,
            bandwidth: config.BANDWIDTH,
            queue: [],
            cableType: type
        });
        this.dirty = true;
        this.apDirty = true; // AP connections might need recalc to avoid duplicates
        return true;
    }

    disconnect(id: string): void {
        this.cables.delete(id);
        this.dirty = true;
    }

    /** 특정 케이블 ID로 케이블 삭제 (P7) */
    disconnectBetween(keyA: string, keyB: string): boolean {
        const id = this.makeCableId(keyA, keyB);
        if (this.cables.has(id)) {
            this.cables.delete(id);
            this.dirty = true;
            return true;
        }
        return false;
    }

    /** 특정 건물의 모든 케이블 목록 반환 */
    getCablesForBuilding(key: string): CableConnection[] {
        return Array.from(this.cables.values()).filter(
            c => c.fromKey === key || c.toKey === key
        );
    }

    handleBuildingRemoved(key: string): void {
        const toRemove: string[] = [];
        for (const [id, cable] of this.cables.entries()) {
            if (cable.fromKey === key || cable.toKey === key) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => this.disconnect(id));
        this.apDirty = true;
    }

    getConnectionsFrom(key: string): CableConnection[] {
        return Array.from(this.cables.values()).filter(c => c.fromKey === key);
    }

    getConnectionsTo(key: string): CableConnection[] {
        return Array.from(this.cables.values()).filter(c => c.toKey === key);
    }

    updateAPConnections(buildingManager: BuildingManager): void {
        // dirty flag로 불필요한 재계산 방지 (P6)
        if (!this.apDirty) return;
        this.apDirty = false;

        this.apConnections.clear();
        
        const aps: any[] = [];
        const others: any[] = [];
        
        // forEach는 unique buildings만 반환 (BuildingManager.forEach)
        buildingManager.forEach(b => {
            if (b.type === 'ACCESS_POINT') {
                if (b.hasPower) aps.push(b);
            } else {
                others.push(b);
            }
        });

        for (const ap of aps) {
            const inRange = others.filter(b => {
                const dx = Math.abs(b.x - ap.x) / CONFIG.GRID_SIZE;
                const dy = Math.abs(b.y - ap.y) / CONFIG.GRID_SIZE;
                return dx <= ap.range && dy <= ap.range;
            });

            for (const source of inRange) {
                for (const dest of inRange) {
                    if (source === dest) continue;
                    
                    const fromKey = `${source.x},${source.y}`;
                    const toKey = `${dest.x},${dest.y}`;

                    // 정규화된 ID로 중복 방지
                    const sorted = [fromKey, toKey].sort();
                    const id = `ap_${sorted[0]}_${sorted[1]}`;
                    
                    if (this.apConnections.has(id)) continue;
                    // 유선 케이블이 이미 있으면 AP 연결 불필요
                    if (this.cables.has(this.makeCableId(fromKey, toKey))) continue;

                    this.apConnections.set(id, {
                        id,
                        fromKey,
                        toKey,
                        bandwidth: ap.bandwidth,
                        queue: [],
                        cableType: 'BASIC'
                    });
                }
            }
        }
        this.dirty = true; // AP 연결이 변경되었으므로 다시 그려야 함
    }

    transferData(buildingManager: BuildingManager, itemManager: ItemManager): void {
        // 1. 유선 케이블 처리
        for (const cable of this.cables.values()) {
            const buildingA = buildingManager.get(cable.fromKey);
            const buildingB = buildingManager.get(cable.toKey);

            if (!buildingA || !buildingB) continue;
            if (!buildingA.hasPower || !buildingB.hasPower) continue;

            let flowDir = cable.flowDirection || 'FORWARD';

            // 방향 판별: 큐가 비어있다면, 양방향 중 전송 가능한 방향을 탐색
            if (cable.queue.length === 0) {
                const aOut = buildingA.getOutputSource();
                const bOut = buildingB.getOutputSource();

                if (aOut.length > 0 && buildingB.canAcceptItem(aOut[0])) {
                    flowDir = 'FORWARD';
                } else if (bOut.length > 0 && buildingA.canAcceptItem(bOut[0])) {
                    flowDir = 'BACKWARD';
                }
                cable.flowDirection = flowDir;
            }

            const currentSource = flowDir === 'FORWARD' ? buildingA : buildingB;
            const currentDest = flowDir === 'FORWARD' ? buildingB : buildingA;
            const sourceOutput = currentSource.getOutputSource();
            const maxQueue = CONFIG.CABLES[cable.cableType]?.MAX_QUEUE || 10;
            
            while (sourceOutput.length > 0 && cable.queue.length < maxQueue) {
                const item = sourceOutput[0];
                if (currentDest.canAcceptItem(item) || cable.queue.length > 0) {
                    cable.queue.push(currentSource.popOutput()!);
                } else {
                    break;
                }
            }

            let transferred = 0;
            while (cable.queue.length > 0 && transferred < cable.bandwidth) {
                const packet = cable.queue.shift();
                if (packet) {
                    if (currentDest.canAcceptItem(packet)) {
                        currentDest.acceptItem(packet);
                        transferred++;
                        const fromAnim = flowDir === 'FORWARD' ? cable.fromKey : cable.toKey;
                        const toAnim = flowDir === 'FORWARD' ? cable.toKey : cable.fromKey;
                        this.createPulseAnimation(fromAnim, toAnim, packet);
                    } else {
                        cable.queue.unshift(packet);
                        break;
                    }
                }
            }
        }

        // 2. 무선 AP 처리 (큐 없이 즉시 전송)
        for (const cable of this.apConnections.values()) {
            const buildingA = buildingManager.get(cable.fromKey);
            const buildingB = buildingManager.get(cable.toKey);

            if (!buildingA || !buildingB) continue;
            if (!buildingA.hasPower || !buildingB.hasPower) continue;

            const aOut = buildingA.getOutputSource();
            const bOut = buildingB.getOutputSource();

            let currentSource = buildingA;
            let currentDest = buildingB;
            let isBackward = false;

            if (aOut.length > 0 && buildingB.canAcceptItem(aOut[0])) {
                // Forward
            } else if (bOut.length > 0 && buildingA.canAcceptItem(bOut[0])) {
                currentSource = buildingB;
                currentDest = buildingA;
                isBackward = true;
            } else {
                continue;
            }

            const sourceOutput = currentSource.getOutputSource();
            let transferred = 0;
            while (sourceOutput.length > 0 && transferred < cable.bandwidth) {
                const item = sourceOutput[0];
                if (currentDest.canAcceptItem(item)) {
                    currentDest.acceptItem(currentSource.popOutput()!);
                    transferred++;
                    const fromAnim = isBackward ? cable.toKey : cable.fromKey;
                    const toAnim = isBackward ? cable.fromKey : cable.toKey;
                    this.createPulseAnimation(fromAnim, toAnim, item);
                } else {
                    break;
                }
            }
        }
    }

    createPulseAnimation(fromKey: string, toKey: string, itemType: string): void {
        const [fx, fy] = fromKey.split(',').map(Number);
        const [tx, ty] = toKey.split(',').map(Number);
        
        const cx1 = fx + CONFIG.GRID_SIZE / 2;
        const cy1 = fy + CONFIG.GRID_SIZE / 2;
        const cx2 = tx + CONFIG.GRID_SIZE / 2;
        const cy2 = ty + CONFIG.GRID_SIZE / 2;

        const itemConfig = CONFIG.ITEMS[itemType] || CONFIG.ITEMS.RAW_DATA;

        const pulse = this.scene.add.circle(cx1, cy1, 4, itemConfig.COLOR);
        pulse.setDepth(16);

        this.scene.tweens.add({
            targets: pulse,
            x: cx2,
            y: cy2,
            duration: CONFIG.TICK_RATE,
            ease: 'Linear',
            onComplete: () => {
                pulse.destroy();
            }
        });
    }

    drawCables(): void {
        // dirty flag로 불필요한 재렌더링 방지 (P8)
        if (!this.dirty) return;
        this.dirty = false;

        this.graphics.clear();

        // 유선 케이블 렌더링
        for (const cable of this.cables.values()) {
            const [fx, fy] = cable.fromKey.split(',').map(Number);
            const [tx, ty] = cable.toKey.split(',').map(Number);
            
            const cx1 = fx + CONFIG.GRID_SIZE / 2;
            const cy1 = fy + CONFIG.GRID_SIZE / 2;
            const cx2 = tx + CONFIG.GRID_SIZE / 2;
            const cy2 = ty + CONFIG.GRID_SIZE / 2;

            const config = CONFIG.CABLES[cable.cableType];
            const color = config ? config.COLOR : 0xaaaaaa;
            
            const maxQueue = config ? config.MAX_QUEUE : 10;
            const isThrottling = cable.queue.length > maxQueue * 0.5;

            this.graphics.lineStyle(isThrottling ? 4 : 2, isThrottling ? 0xfacc15 : color, 0.8);
            this.graphics.strokeLineShape(new Phaser.Geom.Line(cx1, cy1, cx2, cy2));
        }

        // AP 연결 렌더링
        for (const cable of this.apConnections.values()) {
            const [fx, fy] = cable.fromKey.split(',').map(Number);
            const [tx, ty] = cable.toKey.split(',').map(Number);
            
            const cx1 = fx + CONFIG.GRID_SIZE / 2;
            const cy1 = fy + CONFIG.GRID_SIZE / 2;
            const cx2 = tx + CONFIG.GRID_SIZE / 2;
            const cy2 = ty + CONFIG.GRID_SIZE / 2;

            this.graphics.lineStyle(1, 0x22d3ee, 0.5);
            this.graphics.strokeLineShape(new Phaser.Geom.Line(cx1, cy1, cx2, cy2));
        }
    }

    /** 스로틀링 상태가 바뀌면 다시 그려야 하므로 주기적 호출용 */
    markDirtyIfThrottlingChanged(): void {
        for (const cable of this.cables.values()) {
            const config = CONFIG.CABLES[cable.cableType];
            const maxQueue = config ? config.MAX_QUEUE : 10;
            const isThrottling = cable.queue.length > maxQueue * 0.5;
            if (isThrottling) {
                this.dirty = true;
                return;
            }
        }
    }
}
