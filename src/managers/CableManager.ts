import Phaser from 'phaser';
import { CONFIG } from '../config';
import { CableConnection, CablePacket, IMainScene } from '../types';
import BuildingManager from './BuildingManager';
import ItemManager from './ItemManager';
import EventBus from './EventBus';
import AccessPoint from '../buildings/AccessPoint';
import BaseBuilding from '../buildings/BaseBuilding';
import { getAvailableInputSpace, isAPAutoRelaySource, selectAPRelayTarget } from '../utils/apRelay';
import { getItemColor, VISUAL_THEME } from '../visuals/visualTheme';
import { getCableDistanceTiles, getTouchedCableTiles, isPointInsideFootprint } from '../utils/cablePath';

const DATA_ITEMS = new Set(['RAW_DATA', 'LABELED_DATA', 'WEIGHT_UPDATE', 'TRAINED_MODEL', 'INFERENCE_UNIT', 'SILICON']);
const DEFAULT_CABLE_TRAVEL_TICKS = 2;

export type CableBlockReason = 'same-endpoint' | 'duplicate' | 'too-far' | 'blocked' | 'missing-endpoint' | 'out-of-bounds';

export interface CableValidationResult {
    ok: boolean;
    reason?: CableBlockReason;
    distanceTiles: number;
    maxLengthTiles: number;
    cost: number;
    blockedTile?: { x: number; y: number };
}

interface CableConnectOptions {
    skipValidation?: boolean;
    costPaid?: number;
}

export default class CableManager {
    scene: IMainScene;
    cables: Map<string, CableConnection>;
    apConnections: Map<string, CableConnection>;
    graphics: Phaser.GameObjects.Graphics;
    dirty: boolean;
    apDirty: boolean;
    _lastThrottleState: boolean;
    _wirelessBuildingsCache: BaseBuilding[] | null;
    _wirelessCacheDirty: boolean;

    constructor(scene: IMainScene) {
        this.scene = scene;
        this.cables = new Map();
        this.apConnections = new Map();
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(15);
        this.dirty = true;
        this.apDirty = true;
        this._lastThrottleState = false;
        this._wirelessBuildingsCache = null;
        this._wirelessCacheDirty = true;

        EventBus.on('BUILDING_REMOVED', ({ key }: { key: string }) => {
            this.handleBuildingRemoved(key);
        }, 'CableManager');

        EventBus.on('BUILDING_PLACED', () => {
            this.apDirty = true;
            this._wirelessCacheDirty = true;
        }, 'CableManager');

        EventBus.on('BUILDING_DESTROYED', () => {
            this._wirelessCacheDirty = true;
        }, 'CableManager');

        EventBus.on('RESEARCH_UNLOCKED', () => {
            const bandwidthBonus = this.scene.researchManager?.getEffectValue('CABLE_BANDWIDTH_BONUS', 0) ?? 0;
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

    getBuildingCenter(key: string): { x: number; y: number } {
        const [bx, by] = key.split(',').map(Number);
        const building = this.scene.buildingManager.get(key);
        if (building) {
            const bConfig = CONFIG.BUILDINGS[building.type];
            const w = bConfig?.WIDTH || 1;
            const h = bConfig?.HEIGHT || 1;
            return {
                x: building.x + (w * CONFIG.GRID_SIZE) / 2,
                y: building.y + (h * CONFIG.GRID_SIZE) / 2
            };
        }
        return {
            x: bx + CONFIG.GRID_SIZE / 2,
            y: by + CONFIG.GRID_SIZE / 2
        };
    }

    makeCableId(keyA: string, keyB: string): string {
        const sorted = [keyA, keyB].sort();
        return `cable_${sorted[0]}_${sorted[1]}`;
    }

    getCableLengthBonus(): number {
        return this.scene.researchManager?.getEffectValue('CABLE_LENGTH_BONUS', 0) ?? 0;
    }

    getCableMaxLength(type: 'BASIC' | 'FIBER'): number {
        return CONFIG.CABLES[type].MAX_LENGTH_TILES + this.getCableLengthBonus();
    }

    getCableCost(fromKey: string, toKey: string, type: 'BASIC' | 'FIBER'): number {
        const from = this.getBuildingCenter(fromKey);
        const to = this.getBuildingCenter(toKey);
        return getCableDistanceTiles(from, to) * (CONFIG.CABLES[type].COST_PER_TILE || 0);
    }

    canConnect(fromKey: string, toKey: string, type: 'BASIC' | 'FIBER' = 'BASIC', ignoreDuplicate = false): CableValidationResult {
        const config = CONFIG.CABLES[type];
        const maxLengthTiles = this.getCableMaxLength(type);
        const fallback: CableValidationResult = {
            ok: false,
            distanceTiles: 0,
            maxLengthTiles,
            cost: 0
        };

        if (fromKey === toKey) return { ...fallback, reason: 'same-endpoint' };

        const buildingA = this.scene.buildingManager.get(fromKey);
        const buildingB = this.scene.buildingManager.get(toKey);
        if (!buildingA || !buildingB) return { ...fallback, reason: 'missing-endpoint' };

        const id = this.makeCableId(fromKey, toKey);
        const centerA = this.getBuildingCenter(fromKey);
        const centerB = this.getBuildingCenter(toKey);
        const distanceTiles = getCableDistanceTiles(centerA, centerB);
        const cost = distanceTiles * (config.COST_PER_TILE || 0);
        const resultBase = { distanceTiles, maxLengthTiles, cost };

        if (!ignoreDuplicate && this.cables.has(id)) {
            return { ok: false, reason: 'duplicate', ...resultBase };
        }
        if (distanceTiles > maxLengthTiles) {
            return { ok: false, reason: 'too-far', ...resultBase };
        }
        if (!this.scene.mapManager.isAreaWithinBuildBounds(buildingA.x, buildingA.y, CONFIG.BUILDINGS[buildingA.type]?.WIDTH || 1, CONFIG.BUILDINGS[buildingA.type]?.HEIGHT || 1)
            || !this.scene.mapManager.isAreaWithinBuildBounds(buildingB.x, buildingB.y, CONFIG.BUILDINGS[buildingB.type]?.WIDTH || 1, CONFIG.BUILDINGS[buildingB.type]?.HEIGHT || 1)) {
            return { ok: false, reason: 'out-of-bounds', ...resultBase };
        }

        const blockedTile = this.findCableBlockedTile(fromKey, toKey);
        if (blockedTile) {
            return { ok: false, reason: 'blocked', blockedTile, ...resultBase };
        }

        return { ok: true, ...resultBase };
    }

    findCableBlockedTile(fromKey: string, toKey: string): { x: number; y: number } | undefined {
        const buildingA = this.scene.buildingManager.get(fromKey);
        const buildingB = this.scene.buildingManager.get(toKey);
        if (!buildingA || !buildingB) return undefined;

        const centerA = this.getBuildingCenter(fromKey);
        const centerB = this.getBuildingCenter(toKey);
        const tiles = getTouchedCableTiles(centerA, centerB);
        const configA = CONFIG.BUILDINGS[buildingA.type];
        const configB = CONFIG.BUILDINGS[buildingB.type];

        return tiles.find(tile => {
            if (isPointInsideFootprint(tile, buildingA, configA?.WIDTH || 1, configA?.HEIGHT || 1)) return false;
            if (isPointInsideFootprint(tile, buildingB, configB?.WIDTH || 1, configB?.HEIGHT || 1)) return false;
            return this.scene.mapManager.getTerrainAt(tile.x, tile.y) === 'BLOCKER';
        });
    }

    connect(fromKey: string, toKey: string, type: 'BASIC' | 'FIBER' = 'BASIC', options: CableConnectOptions = {}): boolean {
        if (fromKey === toKey) return false;

        const id = this.makeCableId(fromKey, toKey);
        if (this.cables.has(id)) return false;

        const validation = this.canConnect(fromKey, toKey, type);
        if (!options.skipValidation && !validation.ok) return false;

        const config = CONFIG.CABLES[type];
        const bandwidthBonus = this.scene.researchManager?.getEffectValue('CABLE_BANDWIDTH_BONUS', 0) ?? 0;
        this.cables.set(id, {
            id,
            fromKey,
            toKey,
            bandwidth: config.BANDWIDTH + bandwidthBonus,
            queue: [],
            cableType: type,
            costPaid: options.costPaid ?? validation.cost
        });
        this.dirty = true;
        this.apDirty = true;
        EventBus.emit('CABLE_CONNECTED', { fromKey, toKey, cableType: type });
        return true;
    }

    disconnect(id: string, refund: boolean = false): void {
        const cable = this.cables.get(id);
        if (refund && cable?.costPaid) {
            const refundAmount = Math.floor(cable.costPaid * 0.5);
            if (refundAmount > 0) {
                this.scene.inventoryManager.addResource('SILICON', refundAmount);
                this.scene.uiManager?.logMessage(`System: Cable removed. Refunded ${refundAmount} Silicon.`);
            }
        }
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
        this._wirelessCacheDirty = true;
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
        const gameSpeed = Math.max(0.1, this.scene.gameSpeed || 1);
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
            if (dest.type === 'REPEATER') {
                const repeaterKey = `${dest.x},${dest.y}`;
                if (dest.hasPower && this.relayPacketFromRepeater(repeaterKey, cable.id, packet)) {
                    delivered++;
                } else {
                    pending.push({ ...packet, ticksRemaining: 0 });
                }
                continue;
            }

            if (delivered < cable.bandwidth && this.isDataItem(packet.itemType) && dest.canAcceptItem(packet.itemType)) {
                dest.acceptItem(packet.itemType);
                delivered++;
            } else {
                pending.push({ ...packet, ticksRemaining: 0 });
            }
        }
        cable.queue = pending;
    }

    private relayPacketFromRepeater(repeaterKey: string, incomingCableId: string, packet: CablePacket): boolean {
        for (const cable of this.cables.values()) {
            if (cable.id === incomingCableId) continue;
            if (cable.fromKey !== repeaterKey && cable.toKey !== repeaterKey) continue;

            const nextKey = cable.fromKey === repeaterKey ? cable.toKey : cable.fromKey;
            const nextBuilding = this.scene.buildingManager.get(nextKey);
            if (!nextBuilding?.hasPower) continue;
            if (nextBuilding.type !== 'REPEATER' && !nextBuilding.canAcceptItem(packet.itemType)) continue;

            const maxQueue = CONFIG.CABLES[cable.cableType]?.MAX_QUEUE || 10;
            if (cable.queue.length >= maxQueue) continue;

            cable.flowDirection = cable.fromKey === repeaterKey ? 'FORWARD' : 'BACKWARD';
            cable.queue.push({
                itemType: packet.itemType,
                flowDirection: cable.flowDirection,
                ticksRemaining: this.getCableTravelTicks()
            });
            this.createPulseAnimation(repeaterKey, nextKey, packet.itemType);
            return true;
        }
        return false;
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

                if (this.isDataItem(aOut[0]) && (buildingB.type === 'REPEATER' || buildingB.canAcceptItem(aOut[0]))) {
                    flowDir = 'FORWARD';
                } else if (this.isDataItem(bOut[0]) && (buildingA.type === 'REPEATER' || buildingA.canAcceptItem(bOut[0]))) {
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
                if (currentDest.type === 'REPEATER' || currentDest.canAcceptItem(item) || cable.queue.length > 0) {
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

        if (this._wirelessCacheDirty || !this._wirelessBuildingsCache) {
            const buildings: BaseBuilding[] = [];
            buildingManager.forEach(building => {
                buildings.push(building);
            });
            this._wirelessBuildingsCache = buildings;
            this._wirelessCacheDirty = false;
        }

        const buildings = this._wirelessBuildingsCache;

        for (const building of buildings) {
            if (building instanceof AccessPoint && building.hasPower) {
                accessPoints.push(building);
            }
        }

        if (accessPoints.length === 0) return;

        const rangeBonus = this.scene.researchManager?.getEffectValue('AP_RANGE_BONUS', 0) ?? 0;

        for (const ap of accessPoints) {
            ap.relaysThisTick = 0;
            const apRange = ap.range + rangeBonus;
            const inRange = buildings.filter(building =>
                building !== ap
                && !(building instanceof AccessPoint)
                && building.hasPower
                && Math.abs(building.x - ap.x) / CONFIG.GRID_SIZE <= apRange
                && Math.abs(building.y - ap.y) / CONFIG.GRID_SIZE <= apRange
            );
            const senders = inRange.filter(building => isAPAutoRelaySource(building, itemType => this.isDataItem(itemType)));
            let relayed = 0;

            for (const source of senders) {
                if (relayed >= ap.bandwidth) break;

                const item = source.outputBuffer[0];
                const target = selectAPRelayTarget(inRange, source, item) as BaseBuilding | undefined;
                if (!target) continue;

                source.outputBuffer.shift();
                target.acceptItem(item);
                relayed++;
                ap.relaysThisTick = relayed;
                this.createPulseAnimation(`${source.x},${source.y}`, `${ap.x},${ap.y}`, item);
                this.createPulseAnimation(`${ap.x},${ap.y}`, `${target.x},${target.y}`, item);

                // Spawn expanding wireless sonar radar wave
                this.createAPWirelessWave(ap.x + CONFIG.GRID_SIZE, ap.y + CONFIG.GRID_SIZE, item);
            }
        }
    }

    getAvailableInputSpace(building: BaseBuilding): number {
        return getAvailableInputSpace(building);
    }

    isBuildingInAPRange(building: BaseBuilding, ap: AccessPoint): boolean {
        const rangeBonus = this.scene.researchManager?.getEffectValue('AP_RANGE_BONUS', 0) ?? 0;
        const apRange = ap.range + rangeBonus;
        const dx = Math.abs(building.x - ap.x) / CONFIG.GRID_SIZE;
        const dy = Math.abs(building.y - ap.y) / CONFIG.GRID_SIZE;
        return dx <= apRange && dy <= apRange;
    }

    createPulseAnimation(fromKey: string, toKey: string, itemType: string): void {
        const center1 = this.getBuildingCenter(fromKey);
        const center2 = this.getBuildingCenter(toKey);
        const cx1 = center1.x;
        const cy1 = center1.y;
        const cx2 = center2.x;
        const cy2 = center2.y;

        const color = getItemColor(itemType);

        const pulse = this.scene.add.circle(cx1, cy1, 4, color);
        pulse.setDepth(16);
        pulse.setStrokeStyle(1, 0xffffff, 0.55);
        const trail = this.scene.add.graphics();
        trail.setDepth(15);
        trail.lineStyle(5, color, 0.1);
        trail.strokeLineShape(new Phaser.Geom.Line(cx1, cy1, cx2, cy2));
        trail.lineStyle(1, color, 0.45);
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

        // Multi-delayed trailing circles to simulate packet motion trail (Bloom-only)
        if (this.scene.bloomEnabled) {
            for (let i = 1; i <= 2; i++) {
                const delay = i * 40;
                const trailCircle = this.scene.add.circle(cx1, cy1, 4 - i, color, 0.5 / i);
                trailCircle.setDepth(15);
                this.scene.tweens.add({
                    targets: trailCircle,
                    x: cx2,
                    y: cy2,
                    duration: CONFIG.TIMING.DATA_PULSE_DURATION_MS,
                    delay: delay,
                    ease: 'Linear',
                    onComplete: () => trailCircle.destroy()
                });
            }
        }

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

        const bloomEnabled = this.scene.bloomEnabled;
        const isFlashActive = Math.floor(this.scene.time.now / 150) % 2 === 0;

        for (const cable of this.cables.values()) {
            const center1 = this.getBuildingCenter(cable.fromKey);
            const center2 = this.getBuildingCenter(cable.toKey);
            const cx1 = center1.x;
            const cy1 = center1.y;
            const cx2 = center2.x;
            const cy2 = center2.y;

            const color = cable.cableType === 'FIBER' ? VISUAL_THEME.cables.fiber : VISUAL_THEME.cables.basic;
            const isThrottling = this.checkIsThrottling(cable);

            // Fading glitch alpha logic for throttled cables
            let throttleAlpha = isFlashActive ? 0.95 : 0.22;
            let standardAlpha = 0.72;

            if (bloomEnabled) {
                // Glow Outer Line (Bloom effect)
                this.graphics.lineStyle(
                    isThrottling ? 8 : 5,
                    isThrottling ? VISUAL_THEME.cables.throttled : color,
                    isThrottling ? throttleAlpha * 0.2 : 0.12
                );
                this.graphics.strokeLineShape(new Phaser.Geom.Line(cx1, cy1, cx2, cy2));
            }

            // Core Line
            this.graphics.lineStyle(
                isThrottling ? 3 : 2,
                isThrottling ? VISUAL_THEME.cables.throttled : color,
                isThrottling ? throttleAlpha : (bloomEnabled ? standardAlpha : 1.0)
            );
            this.graphics.strokeLineShape(new Phaser.Geom.Line(cx1, cy1, cx2, cy2));

            // Endpoint Nodes
            this.graphics.fillStyle(color, isThrottling ? throttleAlpha : 0.55);
            this.graphics.fillCircle(cx1, cy1, 3);
            this.graphics.fillCircle(cx2, cy2, 3);
        }
    }

    markDirtyIfThrottlingChanged(): void {
        let anyThrottling = false;
        for (const cable of this.cables.values()) {
            if (this.checkIsThrottling(cable)) {
                anyThrottling = true;
                break;
            }
        }
        if (anyThrottling !== this._lastThrottleState) {
            this._lastThrottleState = anyThrottling;
            this.dirty = true;
        }
    }

    checkIsThrottling(cable: CableConnection): boolean {
        const config = CONFIG.CABLES[cable.cableType];
        const maxQueue = config ? config.MAX_QUEUE : 10;
        if (cable.queue.length <= maxQueue * 0.5) return false;

        const buildingA = this.scene.buildingManager.get(cable.fromKey);
        const buildingB = this.scene.buildingManager.get(cable.toKey);
        if (!buildingA || !buildingB) return false;

        const flowDir = cable.flowDirection || 'FORWARD';
        const dest = flowDir === 'FORWARD' ? buildingB : buildingA;

        if (dest && cable.queue.length > 0) {
            const nextItem = cable.queue[0].itemType;
            if (!dest.canAcceptItem(nextItem)) {
                return false; // Receiver is full, not a cable bottleneck, so don't mark throttled (red)
            }
        }

        return true;
    }

    createAPWirelessWave(x: number, y: number, itemType: string): void {
        if (!this.scene.bloomEnabled) return;
        const color = getItemColor(itemType);
        const range = CONFIG.ACCESS_POINT.RANGE || 5;
        const ring = this.scene.add.circle(x, y, 4);
        ring.setDepth(14);
        ring.setStrokeStyle(2, color, 0.72);

        this.scene.tweens.add({
            targets: ring,
            radius: CONFIG.GRID_SIZE * range,
            alpha: 0,
            duration: CONFIG.TIMING.DATA_PULSE_DURATION_MS * 1.5,
            ease: 'Quad.easeOut',
            onComplete: () => ring.destroy()
        });
    }
}
