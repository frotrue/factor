import Phaser from 'phaser';
import { CONFIG } from '../config';
import { CableConnection, CablePacket } from '../types';
import BuildingManager from './BuildingManager';
import ItemManager from './ItemManager';
import EventBus from './EventBus';
import AccessPoint from '../buildings/AccessPoint';
import BaseBuilding from '../buildings/BaseBuilding';

const DATA_ITEMS = new Set(['RAW_DATA', 'LABELED_DATA', 'WEIGHT_UPDATE', 'TRAINED_MODEL', 'INFERENCE_UNIT']);
const DEFAULT_CABLE_TRAVEL_TICKS = 2;

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
        }, 'CableManager');

        EventBus.on('BUILDING_PLACED', () => {
            this.apDirty = true;
        }, 'CableManager');

        EventBus.on('RESEARCH_UNLOCKED', () => {
            const bandwidthBonus = (this.scene as any).researchManager?.getEffectValue('CABLE_BANDWIDTH_BONUS', 0) ?? 0;
            this.cables.forEach(cable => {
                cable.bandwidth = CONFIG.CABLES[cable.cableType].BANDWIDTH + bandwidthBonus;
            });
            this.apDirty = true;
            this.dirty = true;
        }, 'CableManager');
    }

    normalizeKey(key: string, buildingManager: BuildingManager): string {
        const building = buildingManager.get(key);
        if (building) {
            return `${building.x},${building.y}`;
        }
        return key;
    }

    makeCableId(keyA: string, keyB: string): string {
        const sorted = [keyA, keyB].sort();
        return `cable_${sorted[0]}_${sorted[1]}`;
    }

    connect(fromKey: string, toKey: string, type: 'BASIC' | 'FIBER' = 'BASIC'): boolean {
        if (fromKey === toKey) return false;

        const id = this.makeCableId(fromKey, toKey);
        if (this.cables.has(id)) return false;

        const config = CONFIG.CABLES[type];
        const bandwidthBonus = (this.scene as any).researchManager?.getEffectValue('CABLE_BANDWIDTH_BONUS', 0) ?? 0;
        this.cables.set(id, {
            id,
            fromKey,
            toKey,
            bandwidth: config.BANDWIDTH + bandwidthBonus,
            queue: [],
            cableType: type
        });
        this.dirty = true;
        this.apDirty = true;
        EventBus.emit('CABLE_CONNECTED', { fromKey, toKey, cableType: type });
        return true;
    }

    disconnect(id: string): void {
        this.cables.delete(id);
        this.dirty = true;
    }

    disconnectBetween(keyA: string, keyB: string): boolean {
        const id = this.makeCableId(keyA, keyB);
        if (this.cables.has(id)) {
            this.cables.delete(id);
            this.dirty = true;
            return true;
        }
        return false;
    }

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

    isDataItem(itemType: string | undefined): boolean {
        return Boolean(itemType && DATA_ITEMS.has(itemType));
    }

    getCableTravelTicks(): number {
        const gameSpeed = Math.max(0.1, (this.scene as any).gameSpeed || 1);
        const tickMs = (CONFIG.TICK_RATE * CONFIG.TIMING.TICK_RATE_MULTIPLIER) / gameSpeed;
        return Math.max(1, Math.ceil(CONFIG.TIMING.DATA_PULSE_DURATION_MS / tickMs) || DEFAULT_CABLE_TRAVEL_TICKS);
    }

    normalizeQueuedPacket(packet: string | CablePacket, flowDirection: 'FORWARD' | 'BACKWARD'): CablePacket {
        if (typeof packet === 'string') {
            return {
                itemType: packet,
                flowDirection,
                ticksRemaining: this.getCableTravelTicks()
            };
        }

        return {
            itemType: packet.itemType,
            flowDirection: packet.flowDirection || flowDirection,
            ticksRemaining: Math.max(0, packet.ticksRemaining ?? this.getCableTravelTicks())
        };
    }

    processCableArrivals(cable: CableConnection, buildingA: BaseBuilding, buildingB: BaseBuilding): void {
        cable.queue = cable.queue.map(packet => this.normalizeQueuedPacket(packet, cable.flowDirection || 'FORWARD'));

        for (const packet of cable.queue) {
            if (packet.ticksRemaining > 0) {
                packet.ticksRemaining--;
            }
        }

        let delivered = 0;
        const pending: CablePacket[] = [];
        for (const packet of cable.queue) {
            if (packet.ticksRemaining > 0) {
                pending.push(packet);
                continue;
            }

            const dest = packet.flowDirection === 'FORWARD' ? buildingB : buildingA;
            if (delivered < cable.bandwidth && this.isDataItem(packet.itemType) && dest.canAcceptItem(packet.itemType)) {
                dest.acceptItem(packet.itemType);
                delivered++;
            } else {
                pending.push({ ...packet, ticksRemaining: 0 });
            }
        }
        cable.queue = pending;
    }

    updateAPConnections(_buildingManager: BuildingManager): void {
        if (!this.apDirty) return;
        this.apDirty = false;
        this.apConnections.clear();
        this.dirty = true;
    }

    transferData(buildingManager: BuildingManager, _itemManager: ItemManager): void {
        for (const cable of this.cables.values()) {
            const buildingA = buildingManager.get(cable.fromKey);
            const buildingB = buildingManager.get(cable.toKey);

            if (!buildingA || !buildingB) continue;
            if (!buildingA.hasPower || !buildingB.hasPower) continue;

            this.processCableArrivals(cable, buildingA, buildingB);

            let flowDir = cable.flowDirection || 'FORWARD';

            if (cable.queue.length === 0) {
                const aOut = buildingA.getOutputSource();
                const bOut = buildingB.getOutputSource();

                if (this.isDataItem(aOut[0]) && buildingB.canAcceptItem(aOut[0])) {
                    flowDir = 'FORWARD';
                } else if (this.isDataItem(bOut[0]) && buildingA.canAcceptItem(bOut[0])) {
                    flowDir = 'BACKWARD';
                }
                cable.flowDirection = flowDir;
            }

            const currentSource = flowDir === 'FORWARD' ? buildingA : buildingB;
            const currentDest = flowDir === 'FORWARD' ? buildingB : buildingA;
            const sourceOutput = currentSource.getOutputSource();
            const maxQueue = CONFIG.CABLES[cable.cableType]?.MAX_QUEUE || 10;
            let launched = 0;

            while (sourceOutput.length > 0 && cable.queue.length < maxQueue && launched < cable.bandwidth) {
                const item = sourceOutput[0];
                if (!this.isDataItem(item)) break;
                if (currentDest.canAcceptItem(item) || cable.queue.length > 0) {
                    cable.queue.push({
                        itemType: currentSource.popOutput()!,
                        flowDirection: flowDir,
                        ticksRemaining: this.getCableTravelTicks()
                    });
                    launched++;
                    const fromAnim = flowDir === 'FORWARD' ? cable.fromKey : cable.toKey;
                    const toAnim = flowDir === 'FORWARD' ? cable.toKey : cable.fromKey;
                    this.createPulseAnimation(fromAnim, toAnim, item);
                } else {
                    break;
                }
            }
        }

        this.transferWirelessData(buildingManager);
    }

    transferWirelessData(buildingManager: BuildingManager): void {
        const accessPoints: AccessPoint[] = [];
        const buildings: BaseBuilding[] = [];

        buildingManager.forEach(building => {
            buildings.push(building);
            if (building instanceof AccessPoint && building.hasPower) {
                accessPoints.push(building);
            }
        });

        if (accessPoints.length === 0) return;

        const rangeBonus = (this.scene as any).researchManager?.getEffectValue('AP_RANGE_BONUS', 0) ?? 0;

        for (const ap of accessPoints) {
            const apRange = ap.range + rangeBonus;
            const inRange = buildings.filter(building =>
                building !== ap
                && !(building instanceof AccessPoint)
                && building.hasPower
                && Math.abs(building.x - ap.x) / CONFIG.GRID_SIZE <= apRange
                && Math.abs(building.y - ap.y) / CONFIG.GRID_SIZE <= apRange
            );
            const senders = inRange.filter(building => this.isDataItem(building.outputBuffer[0]));
            let relayed = 0;

            for (const source of senders) {
                if (relayed >= ap.bandwidth) break;

                const item = source.outputBuffer[0];
                const target = inRange.find(candidate =>
                    candidate !== source
                    && candidate.canAcceptItem(item)
                );
                if (!target) continue;

                source.outputBuffer.shift();
                target.acceptItem(item);
                relayed++;
                this.createPulseAnimation(`${source.x},${source.y}`, `${ap.x},${ap.y}`, item);
                this.createPulseAnimation(`${ap.x},${ap.y}`, `${target.x},${target.y}`, item);
            }
        }
    }

    isBuildingInAPRange(building: BaseBuilding, ap: AccessPoint): boolean {
        const rangeBonus = (this.scene as any).researchManager?.getEffectValue('AP_RANGE_BONUS', 0) ?? 0;
        const apRange = ap.range + rangeBonus;
        const dx = Math.abs(building.x - ap.x) / CONFIG.GRID_SIZE;
        const dy = Math.abs(building.y - ap.y) / CONFIG.GRID_SIZE;
        return dx <= apRange && dy <= apRange;
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
        const trail = this.scene.add.graphics();
        trail.setDepth(15);
        trail.lineStyle(1, itemConfig.COLOR, 0.28);
        trail.strokeLineShape(new Phaser.Geom.Line(cx1, cy1, cx2, cy2));

        this.scene.tweens.add({
            targets: pulse,
            x: cx2,
            y: cy2,
            duration: CONFIG.TIMING.DATA_PULSE_DURATION_MS,
            ease: 'Linear',
            onComplete: () => {
                pulse.destroy();
            }
        });
        this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            duration: CONFIG.TIMING.DATA_PULSE_DURATION_MS,
            onComplete: () => trail.destroy()
        });
    }

    drawCables(): void {
        if (!this.dirty) return;
        this.dirty = false;

        this.graphics.clear();

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
    }

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
