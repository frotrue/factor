import Phaser from 'phaser';
import { CONFIG } from '../config';
import EventBus from './EventBus';
export default class CableManager {
    constructor(scene) {
        this.scene = scene;
        this.cables = new Map();
        this.apConnections = new Map();
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(15);
        this.pulseTweens = [];
        EventBus.on('BUILDING_REMOVED', ({ key }) => {
            this.handleBuildingRemoved(key);
        });
    }
    connect(fromKey, toKey, type = 'BASIC') {
        // Do not allow connecting to self
        if (fromKey === toKey)
            return false;
        const id = `cable_${fromKey}_${toKey}`;
        // Do not allow duplicate cables
        if (this.cables.has(id))
            return false;
        const config = CONFIG.CABLES[type];
        this.cables.set(id, {
            id,
            fromKey,
            toKey,
            bandwidth: config.BANDWIDTH,
            queue: [],
            cableType: type
        });
        return true;
    }
    disconnect(id) {
        this.cables.delete(id);
    }
    handleBuildingRemoved(key) {
        const toRemove = [];
        for (const [id, cable] of this.cables.entries()) {
            if (cable.fromKey === key || cable.toKey === key) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => this.disconnect(id));
        const apToRemove = [];
        for (const [id, cable] of this.apConnections.entries()) {
            if (cable.fromKey === key || cable.toKey === key) {
                apToRemove.push(id);
            }
        }
        apToRemove.forEach(id => this.apConnections.delete(id));
    }
    getConnectionsFrom(key) {
        return Array.from(this.cables.values()).filter(c => c.fromKey === key);
    }
    getConnectionsTo(key) {
        return Array.from(this.cables.values()).filter(c => c.toKey === key);
    }
    updateAPConnections(buildingManager) {
        this.apConnections.clear();
        const aps = [];
        const others = [];
        buildingManager.forEach(b => {
            if (b.type === 'ACCESS_POINT') {
                if (b.hasPower)
                    aps.push(b);
            }
            else {
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
                    if (source === dest)
                        continue;
                    const fromKey = `${source.x},${source.y}`;
                    const toKey = `${dest.x},${dest.y}`;
                    const id = `ap_${fromKey}_${toKey}`;
                    // Already connected by AP or wired cable?
                    if (this.apConnections.has(id))
                        continue;
                    if (this.cables.has(`cable_${fromKey}_${toKey}`))
                        continue;
                    this.apConnections.set(id, {
                        id,
                        fromKey,
                        toKey,
                        bandwidth: ap.bandwidth,
                        queue: [],
                        cableType: 'BASIC' // Used for type fallback
                    });
                }
            }
        }
    }
    transferData(buildingManager, itemManager) {
        // 1. 유선 케이블 처리
        for (const cable of this.cables.values()) {
            const source = buildingManager.get(cable.fromKey);
            const dest = buildingManager.get(cable.toKey);
            if (!source || !dest)
                continue;
            if (!source.hasPower || !dest.hasPower)
                continue;
            const maxQueue = CONFIG.CABLES[cable.cableType]?.MAX_QUEUE || 10;
            // 목적지가 받을 수 있는 아이템만 큐에 넣음 (불필요한 스톨 방지)
            // 하지만 케이블은 일종의 파이프이므로 일단 큐에 넣고 보는 것이 맞을 수 있음.
            // 여기서는 단순화를 위해 일단 큐에 넣습니다.
            while (source.outputBuffer.length > 0 && cable.queue.length < maxQueue) {
                const item = source.outputBuffer[0]; // peek
                if (dest.canAcceptItem(item) || cable.queue.length > 0) {
                    // 목적지가 받을 수 있거나, 이미 큐에 무언가 있다면 밀어넣음
                    cable.queue.push(source.popOutput());
                }
                else {
                    break;
                }
            }
            let transferred = 0;
            while (cable.queue.length > 0 && transferred < cable.bandwidth) {
                const packet = cable.queue.shift();
                if (packet) {
                    if (dest.canAcceptItem(packet)) {
                        dest.acceptItem(packet);
                        transferred++;
                        this.createPulseAnimation(cable.fromKey, cable.toKey, packet, itemManager);
                    }
                    else {
                        cable.queue.unshift(packet);
                        break;
                    }
                }
            }
        }
        // 2. 무선 AP 처리 (큐 없이 즉시 전송)
        for (const cable of this.apConnections.values()) {
            const source = buildingManager.get(cable.fromKey);
            const dest = buildingManager.get(cable.toKey);
            if (!source || !dest)
                continue;
            if (!source.hasPower || !dest.hasPower)
                continue;
            let transferred = 0;
            while (source.outputBuffer.length > 0 && transferred < cable.bandwidth) {
                const item = source.outputBuffer[0];
                if (dest.canAcceptItem(item)) {
                    dest.acceptItem(source.popOutput());
                    transferred++;
                    this.createPulseAnimation(cable.fromKey, cable.toKey, item, itemManager);
                }
                else {
                    break;
                }
            }
        }
    }
    createPulseAnimation(fromKey, toKey, itemType, itemManager) {
        const [fx, fy] = fromKey.split(',').map(Number);
        const [tx, ty] = toKey.split(',').map(Number);
        const cx1 = fx + CONFIG.GRID_SIZE / 2;
        const cy1 = fy + CONFIG.GRID_SIZE / 2;
        const cx2 = tx + CONFIG.GRID_SIZE / 2;
        const cy2 = ty + CONFIG.GRID_SIZE / 2;
        const itemConfig = CONFIG.ITEMS[itemType] || CONFIG.ITEMS.RAW_DATA;
        // 시각 효과용 작은 원 생성
        const pulse = this.scene.add.circle(cx1, cy1, 4, itemConfig.COLOR);
        pulse.setDepth(16);
        const duration = CONFIG.TICK_RATE;
        this.scene.tweens.add({
            targets: pulse,
            x: cx2,
            y: cy2,
            duration: duration,
            ease: 'Linear',
            onComplete: () => {
                pulse.destroy();
            }
        });
    }
    drawCables() {
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
            // 스로틀링 징후: 큐가 반 이상 찼을 때
            const maxQueue = config ? config.MAX_QUEUE : 10;
            const isThrottling = cable.queue.length > maxQueue * 0.5;
            this.graphics.lineStyle(isThrottling ? 4 : 2, isThrottling ? 0xfacc15 : color, 0.8);
            this.graphics.strokeLineShape(new Phaser.Geom.Line(cx1, cy1, cx2, cy2));
        }
        // AP 연결 렌더링 (점선 효과 등을 원하면 여기서 구현)
        for (const cable of this.apConnections.values()) {
            const [fx, fy] = cable.fromKey.split(',').map(Number);
            const [tx, ty] = cable.toKey.split(',').map(Number);
            const cx1 = fx + CONFIG.GRID_SIZE / 2;
            const cy1 = fy + CONFIG.GRID_SIZE / 2;
            const cx2 = tx + CONFIG.GRID_SIZE / 2;
            const cy2 = ty + CONFIG.GRID_SIZE / 2;
            this.graphics.lineStyle(1, 0x22d3ee, 0.5);
            // 단순화를 위해 실선으로 그리고 투명도를 낮춤
            this.graphics.strokeLineShape(new Phaser.Geom.Line(cx1, cy1, cx2, cy2));
        }
    }
}
//# sourceMappingURL=CableManager.js.map