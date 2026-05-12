import Phaser from 'phaser';
import { CONFIG } from '../config';
import EventBus from './EventBus';
import BuildingManager from './BuildingManager';
import BaseBuilding from '../buildings/BaseBuilding';
import { PowerNetwork, PowerNodeInfo } from '../types';

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
    }

    updatePowerGrid(): void {
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

        this.buildingManager.forEach(building => {
            const pConfig = CONFIG.BUILDINGS[building.type]?.POWER;
            if (!pConfig) return;
            if ((pConfig.PRODUCTION || 0) <= 0 && (pConfig.RANGE || 0) <= 0) return;

            const key = `${building.x},${building.y}`;
            const range = pConfig.RANGE || 0;
            const production = this.getEffectiveProduction(building);
            const tiles = this.getCoveredTiles(building.x, building.y, range);

            nodes.push({ key, building, x: building.x, y: building.y, range, tiles, production });
            this.nodes.push({ x: building.x, y: building.y, range });
        });

        return nodes;
    }

    buildNetworks(nodes: PowerNode[]): PowerNetwork[] {
        const networks: PowerNetwork[] = [];
        const visited = new Set<string>();

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

            while (queue.length > 0) {
                const current = queue.shift()!;
                network.buildings.push(current.key);
                this.buildingNetworkMap.set(current.key, network);
                network.production += current.production;
                current.tiles.forEach(tile => {
                    network.tiles.add(tile);
                    this.poweredArea.add(tile);
                });

                nodes.forEach(candidate => {
                    if (visited.has(candidate.key)) return;
                    if (!this.tilesOverlap(current.tiles, candidate.tiles)) return;
                    visited.add(candidate.key);
                    queue.push(candidate);
                });
            }

            networks.push(network);
        });

        return networks;
    }

    assignConsumersToNetworks(): void {
        this.buildingManager.forEach(building => {
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
        this.buildingManager.forEach(building => {
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

    getCoveredTiles(x: number, y: number, range: number): Set<string> {
        const tiles = new Set<string>();
        const cx = Math.floor(x / this.gridSize);
        const cy = Math.floor(y / this.gridSize);
        const effectiveRange = Math.max(0, range);

        for (let dx = -effectiveRange; dx <= effectiveRange; dx++) {
            for (let dy = -effectiveRange; dy <= effectiveRange; dy++) {
                tiles.add(`${(cx + dx) * this.gridSize},${(cy + dy) * this.gridSize}`);
            }
        }

        return tiles;
    }

    tilesOverlap(a: Set<string>, b: Set<string>): boolean {
        const smaller = a.size <= b.size ? a : b;
        const larger = a.size <= b.size ? b : a;

        for (const tile of smaller) {
            if (larger.has(tile)) return true;
        }
        return false;
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
