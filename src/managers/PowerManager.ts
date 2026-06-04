import Phaser from 'phaser';
import { CONFIG } from '../config';
import EventBus from './EventBus';
import BuildingManager from './BuildingManager';
import BaseBuilding from '../buildings/BaseBuilding';
import { PowerNetwork, PowerNodeInfo } from '../types';
import { getCenteredCoverageTiles } from '../utils/geometry';

interface PowerNode extends PowerNodeInfo {
    key: string;
    building: BaseBuilding;
    tiles: Set<string>;
    production: number;
}

const NETWORK_COLORS = [
    0xfde047,
    0x22d3ee,
    0xa78bfa,
    0x34d399,
    0xfb7185,
    0xf97316
];

const POWER_NODE_TYPES = Object.keys(CONFIG.BUILDINGS).filter(type => {
    const pConfig = CONFIG.BUILDINGS[type]?.POWER;
    return pConfig && ((pConfig.PRODUCTION || 0) > 0 || (pConfig.RANGE || 0) > 0);
});
const POWER_CONSUMER_TYPES = Object.keys(CONFIG.BUILDINGS).filter(type => {
    const pConfig = CONFIG.BUILDINGS[type]?.POWER;
    return pConfig && (pConfig.CONSUMPTION || 0) > 0;
});
const POWER_RELEVANT_TYPES = Object.keys(CONFIG.BUILDINGS).filter(type => Boolean(CONFIG.BUILDINGS[type]?.POWER));

export default class PowerManager {
    scene: Phaser.Scene;
    buildingManager: BuildingManager;
    gridSize: number;
    totalProduction: number;
    totalConsumption: number;
    availablePower: number;
    poweredArea: Set<string>;
    nodes: PowerNodeInfo[];
    networks: PowerNetwork[];
    buildingNetworkMap: Map<string, PowerNetwork>;
    private dirty: boolean;

    constructor(scene: Phaser.Scene, buildingManager: BuildingManager) {
        this.scene = scene;
        this.buildingManager = buildingManager;
        this.gridSize = CONFIG.GRID_SIZE;
        this.totalProduction = 0;
        this.totalConsumption = 0;
        this.availablePower = 0;
        this.poweredArea = new Set();
        this.nodes = [];
        this.networks = [];
        this.buildingNetworkMap = new Map();
        this.dirty = true;

        EventBus.on('BUILDING_PLACED', () => this.markDirty(), 'PowerManager');
        EventBus.on('BUILDING_REMOVED', () => this.markDirty(), 'PowerManager');
        EventBus.on('BUILDING_DESTROYED', () => this.markDirty(), 'PowerManager');
        EventBus.on('RESEARCH_UNLOCKED', () => this.markDirty(), 'PowerManager');
    }

    markDirty(): void {
        this.dirty = true;
    }

    updateIfDirty(): void {
        if (!this.dirty) return;
        this.updatePowerGrid();
    }

    updatePowerGrid(): void {
        (this.scene as any).performanceStats?.increment('powerRebuilds');
        this.dirty = false;
        this.totalProduction = 0;
        this.totalConsumption = 0;
        this.availablePower = 0;
        this.poweredArea.clear();
        this.nodes = [];
        this.networks = [];
        this.buildingNetworkMap.clear();

        const powerNodes = this.collectPowerNodes();
        this.networks = this.buildNetworks(powerNodes);
        this.assignConsumersToNetworks();
        this.applyPowerState();

        this.totalProduction = this.networks.reduce((sum, network) => sum + network.production, 0);
        this.totalConsumption = this.networks.reduce((sum, network) => sum + network.consumption, 0);
        this.availablePower = this.totalProduction - this.totalConsumption;

        const blackoutNetworks = this.networks.filter(network => network.isBlackout).length;
        EventBus.emit('POWER_UPDATED', {
            production: this.totalProduction,
            consumption: this.totalConsumption,
            net: this.availablePower,
            isBlackout: blackoutNetworks > 0,
            networks: this.networks,
            blackoutNetworks
        });
    }

    collectPowerNodes(): PowerNode[] {
        const nodes: PowerNode[] = [];

        this.buildingManager.getByTypes(POWER_NODE_TYPES).forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            if (!pConfig) return;
            if ((pConfig.PRODUCTION || 0) <= 0 && (pConfig.RANGE || 0) <= 0) return;

            const key = `${building.x},${building.y}`;
            const range = pConfig.RANGE || 0;
            const production = this.getEffectiveProduction(building);
            const width = CONFIG.BUILDINGS[building.type]?.WIDTH || 1;
            const height = CONFIG.BUILDINGS[building.type]?.HEIGHT || 1;
            const tiles = this.getCoveredTiles(building.x, building.y, range, width, height);

            nodes.push({ key, building, x: building.x, y: building.y, range, tiles, production });
            this.nodes.push({ x: building.x, y: building.y, range });
        });

        return nodes;
    }

    buildNetworks(nodes: PowerNode[]): PowerNetwork[] {
        const networks: PowerNetwork[] = [];
        const visited = new Set<string>();
        const spatialIndex = this.buildPowerNodeSpatialIndex(nodes);
        const maxNodeRange = nodes.reduce((max, node) => Math.max(max, node.range), 0);
        const maxNodeFootprint = nodes.reduce((max, node) => {
            const config = CONFIG.BUILDINGS[node.building.type];
            return Math.max(max, config?.WIDTH || 1, config?.HEIGHT || 1);
        }, 1);

        nodes.forEach(node => {
            if (visited.has(node.key)) return;

            const networkId = networks.length + 1;
            const network: PowerNetwork = {
                id: networkId,
                tiles: new Set(),
                buildings: [],
                production: 0,
                consumption: 0,
                net: 0,
                isBlackout: false,
                color: NETWORK_COLORS[(networkId - 1) % NETWORK_COLORS.length]
            };

            const queue = [node];
            visited.add(node.key);

            let qi = 0;
            while (qi < queue.length) {
                const current = queue[qi++];
                network.buildings.push(current.key);
                this.buildingNetworkMap.set(current.key, network);
                network.production += current.production;
                current.tiles.forEach(tile => {
                    network.tiles.add(tile);
                    this.poweredArea.add(tile);
                });

                const candidates = this.getNearbyPowerNodes(current, spatialIndex, maxNodeRange + maxNodeFootprint);
                for (let ci = 0; ci < candidates.length; ci++) {
                    const candidate = candidates[ci];
                    if (candidate === current) continue;
                    if (visited.has(candidate.key)) continue;
                    if (!this.rangesOverlap(current, candidate)) continue;
                    visited.add(candidate.key);
                    queue.push(candidate);
                }
            }

            networks.push(network);
        });

        return networks;
    }

    assignConsumersToNetworks(): void {
        this.buildingManager.getByTypes(POWER_CONSUMER_TYPES).forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            if (!pConfig || pConfig.CONSUMPTION <= 0) return;

            const key = `${building.x},${building.y}`;
            const candidateNetworks = this.networks.filter(network => network.tiles.has(key));
            if (candidateNetworks.length === 0) return;

            const chosen = this.chooseNetworkForConsumer(candidateNetworks, pConfig.CONSUMPTION);
            chosen.consumption += pConfig.CONSUMPTION;
            chosen.net = chosen.production - chosen.consumption;
            chosen.isBlackout = chosen.net < 0;
            chosen.buildings.push(key);
            this.buildingNetworkMap.set(key, chosen);
        });

        this.networks.forEach(network => {
            network.net = network.production - network.consumption;
            network.isBlackout = network.net < 0;
        });
    }

    applyPowerState(): void {
        this.buildingManager.getByTypes(POWER_RELEVANT_TYPES).forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            if (!pConfig) return;

            if (pConfig.CONSUMPTION <= 0) {
                building.hasPower = true;
                return;
            }

            const key = `${building.x},${building.y}`;
            const network = this.buildingNetworkMap.get(key);
            building.hasPower = Boolean(network && !network.isBlackout);
        });
    }

    chooseNetworkForConsumer(networks: PowerNetwork[], consumption: number): PowerNetwork {
        const sorted = networks.slice().sort((a, b) => {
            const aNetAfter = a.production - (a.consumption + consumption);
            const bNetAfter = b.production - (b.consumption + consumption);
            const aCanSupport = aNetAfter >= 0;
            const bCanSupport = bNetAfter >= 0;

            if (aCanSupport !== bCanSupport) return aCanSupport ? -1 : 1;
            if (aNetAfter !== bNetAfter) return bNetAfter - aNetAfter;
            return a.id - b.id;
        });

        return sorted[0];
    }

    getEffectiveProduction(building: BaseBuilding): number {
        const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
        if (!pConfig) return 0;
        if (building.type === 'POWER_PLANT' && !(building as any).isActive) return 0;
        return pConfig.PRODUCTION || 0;
    }

    getCoveredTiles(x: number, y: number, range: number, widthTiles: number = 1, heightTiles: number = 1): Set<string> {
        return getCenteredCoverageTiles(x, y, widthTiles, heightTiles, range, this.gridSize);
    }

    tilesOverlap(a: Set<string>, b: Set<string>): boolean {
        const smaller = a.size <= b.size ? a : b;
        const larger = a.size <= b.size ? b : a;

        for (const tile of smaller) {
            if (larger.has(tile)) return true;
        }
        return false;
    }

    private rangesOverlap(a: PowerNode, b: PowerNode): boolean {
        const aW = CONFIG.BUILDINGS[a.building.type]?.WIDTH || 1;
        const aH = CONFIG.BUILDINGS[a.building.type]?.HEIGHT || 1;
        const bW = CONFIG.BUILDINGS[b.building.type]?.WIDTH || 1;
        const bH = CONFIG.BUILDINGS[b.building.type]?.HEIGHT || 1;
        const dx = Math.abs(a.x - b.x) / this.gridSize;
        const dy = Math.abs(a.y - b.y) / this.gridSize;
        return dx <= a.range + b.range + Math.max(aW, bW)
            && dy <= a.range + b.range + Math.max(aH, bH);
    }

    private buildPowerNodeSpatialIndex(nodes: PowerNode[]): Map<string, PowerNode[]> {
        const index = new Map<string, PowerNode[]>();
        nodes.forEach(node => {
            const key = this.getPowerNodeBucketKey(node.x, node.y);
            const bucket = index.get(key);
            if (bucket) {
                bucket.push(node);
            } else {
                index.set(key, [node]);
            }
        });
        return index;
    }

    private getNearbyPowerNodes(node: PowerNode, index: Map<string, PowerNode[]>, tileRadius: number): PowerNode[] {
        const candidates: PowerNode[] = [];
        const seen = new Set<string>();
        const originX = Math.floor(node.x / this.gridSize);
        const originY = Math.floor(node.y / this.gridSize);
        const radius = Math.ceil(tileRadius);

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const bucket = index.get(`${originX + dx},${originY + dy}`);
                if (!bucket) continue;

                for (const candidate of bucket) {
                    if (seen.has(candidate.key)) continue;
                    seen.add(candidate.key);
                    candidates.push(candidate);
                }
            }
        }

        return candidates;
    }

    private getPowerNodeBucketKey(x: number, y: number): string {
        return `${Math.floor(x / this.gridSize)},${Math.floor(y / this.gridSize)}`;
    }

    getNetworkForBuilding(key: string): PowerNetwork | null {
        const building = this.buildingManager.get(key);
        if (building) {
            const originKey = `${building.x},${building.y}`;
            return this.buildingNetworkMap.get(originKey) || null;
        }
        return this.buildingNetworkMap.get(key) || null;
    }

    isPowered(x: number, y: number): boolean {
        const key = `${x},${y}`;
        const network = this.buildingNetworkMap.get(key);
        if (network) return !network.isBlackout;
        return this.poweredArea.has(key);
    }
}
