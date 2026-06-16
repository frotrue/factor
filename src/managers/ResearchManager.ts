import { CONFIG } from '../config';
import type MainScene from '../scenes/MainScene';
import type {
    InsightGroup,
    ActiveResearchSnapshot,
    ResearchDataCurrency,
    ResearchDataShortfall,
    ResearchEffects,
    ResearchNode,
    ResearchNodeSnapshot,
    ResearchPanelSnapshot,
    ResearchProgressState,
    ResearchQueueSnapshot,
    ResearchState,
    ResearchTag
} from '../types';
import EventBus from './EventBus';

const DATA_CURRENCIES: ResearchDataCurrency[] = ['material', 'tactical', 'system'];

const DATA_LABELS: Record<ResearchDataCurrency, string> = {
    material: 'Material Data',
    tactical: 'Tactical Data',
    system: 'System Data'
};

const TAG_LABELS: Record<ResearchTag, string> = {
    unlock: 'Unlock',
    stat: 'Stat',
    'rule-change': 'Rule',
    queue: 'Queue',
    slot: 'Queue',
    throughput: 'Throughput'
};

const FALLBACK_QUEUE_LIMIT = 3;
const RESEARCH_OPERATIONS_CENTER_BASE_BONUSES = [0.2, 0.1, 0.05];
const RESEARCH_OPERATIONS_CENTER_ADDITIONAL_BONUS = 0.02;
const RESEARCH_OPERATIONS_CENTER_GPU_ADJACENCY_BONUS = 0.25;
const RESEARCH_OPERATIONS_CENTER_BONUS_CAP = 0.5;

function createEmptyDataStore(): Record<ResearchDataCurrency, number> {
    return { material: 0, tactical: 0, system: 0 };
}

export default class ResearchManager {
    scene: MainScene;
    private completed: Set<string>;
    private progressById: Record<string, ResearchProgressState>;
    private dataStore: Record<ResearchDataCurrency, number>;
    private activeResearch: string | null;
    private researchQueue: string[];
    private queueLimit: number;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.completed = new Set<string>();
        this.progressById = {};
        this.dataStore = createEmptyDataStore();
        this.activeResearch = null;
        this.researchQueue = [];
        this.queueLimit = CONFIG.RESEARCH_SETTINGS.DEFAULT_QUEUE_LIMIT ?? FALLBACK_QUEUE_LIMIT;
    }

    isUnlocked(researchId: string): boolean {
        return this.completed.has(researchId);
    }

    getUnlockedResearch(): string[] {
        return Array.from(this.completed);
    }

    canUnlock(researchId: string): boolean {
        const node = CONFIG.RESEARCH[researchId];
        return Boolean(node && !this.isUnlocked(researchId) && this.areRequirementsMet(node));
    }

    isJobAvailable(researchId: string): boolean {
        return this.canUnlock(researchId);
    }

    unlock(researchId: string): boolean {
        const node = CONFIG.RESEARCH[researchId];
        if (!node || this.completed.has(researchId)) return false;
        if (!this.areRequirementsMet(node)) return false;
        this.completeResearch(researchId);
        return true;
    }

    loadUnlockedResearch(researchIds: string[]): void {
        this.completed.clear();
        researchIds.forEach(id => {
            if (CONFIG.RESEARCH[id]) this.completed.add(id);
        });
        this.recomputeUnlockDerivedState();
        this.removeInvalidQueuedResearch();
    }

    getEffectValue(effect: keyof ResearchEffects, defaultValue: number): number {
        let value = defaultValue;
        this.completed.forEach(id => {
            const effectValue = CONFIG.RESEARCH[id]?.EFFECTS?.[effect];
            if (typeof effectValue !== 'number') return;

            if (effect.endsWith('MULTIPLIER')) {
                value *= effectValue;
            } else {
                value += effectValue;
            }
        });
        return value;
    }

    depositData(currency: ResearchDataCurrency, amount: number): number {
        const capacity = CONFIG.RESEARCH_SETTINGS.DATA_CAPACITY[currency];
        const current = this.dataStore[currency] ?? 0;
        const next = Math.max(0, Math.min(capacity, current + Math.max(0, amount)));
        this.dataStore[currency] = next;
        const added = next - current;
        if (added > 0) this.emitStateChanged();
        return added;
    }

    addInsight(group: InsightGroup, amount: number): number {
        return this.depositData(group, amount);
    }

    assignResearch(researchId: string): boolean {
        const node = CONFIG.RESEARCH[researchId];
        if (!node || this.completed.has(researchId) || !this.areRequirementsMet(node)) return false;
        if (this.activeResearch === researchId || this.researchQueue.includes(researchId)) return true;

        if (!this.activeResearch) {
            this.activeResearch = researchId;
        } else {
            if (this.researchQueue.length >= this.queueLimit) return false;
            this.researchQueue.push(researchId);
        }

        this.emitStateChanged();
        EventBus.emit('RESEARCH_PANEL_UPDATED', this.createPanelSnapshot(true, researchId));
        return true;
    }

    clearResearch(researchId: string): void {
        let changed = false;
        if (this.activeResearch === researchId) {
            this.activeResearch = null;
            changed = true;
        }

        const nextQueue = this.researchQueue.filter(id => id !== researchId);
        if (nextQueue.length !== this.researchQueue.length) {
            this.researchQueue = nextQueue;
            changed = true;
        }

        if (this.promoteNextResearch()) changed = true;
        if (changed) this.emitStateChanged();
    }

    onTick(): void {
        if (!this.activeResearch && this.promoteNextResearch()) {
            this.emitStateChanged();
        }

        const active = this.activeResearch;
        if (!active) return;

        const node = CONFIG.RESEARCH[active];
        if (!node || this.completed.has(active) || !this.areRequirementsMet(node)) {
            this.activeResearch = null;
            this.promoteNextResearch();
            this.emitStateChanged();
            return;
        }

        const consumedWork = this.consumeForResearch(active, this.getResearchThroughput());
        if (consumedWork > 0) {
            this.emitStateChanged();
            EventBus.emit('RESEARCH_PANEL_UPDATED', this.createPanelSnapshot(true));
        }
    }

    getResearchThroughput(): number {
        let throughput = CONFIG.RESEARCH_SETTINGS.BASE_THROUGHPUT;
        this.completed.forEach(id => {
            throughput += CONFIG.RESEARCH[id]?.THROUGHPUT_BONUS ?? 0;
        });

        const gpuBonus = CONFIG.RESEARCH_SETTINGS.GPU_THROUGHPUT_BONUS;
        this.scene.buildingManager?.getByType('GPU_CLUSTER').forEach(building => {
            if (building.hasPower === false) return;
            throughput += gpuBonus * building.getPowerEfficiency();
        });

        return Math.max(1, throughput * (1 + this.getResearchOperationsCenterBonus()));
    }

    private getResearchOperationsCenterBonus(): number {
        const centers = (this.scene.buildingManager?.getByType('RESEARCH_OPERATIONS_CENTER') ?? [])
            .filter(building => building.hasPower !== false);
        if (centers.length === 0) return 0;

        const total = centers.reduce((sum, center, index) => {
            const baseContribution = RESEARCH_OPERATIONS_CENTER_BASE_BONUSES[index]
                ?? RESEARCH_OPERATIONS_CENTER_ADDITIONAL_BONUS;
            const adjacentGpuCount = this.countAdjacentPoweredGpuClusters(center);
            return sum + baseContribution * (1 + adjacentGpuCount * RESEARCH_OPERATIONS_CENTER_GPU_ADJACENCY_BONUS);
        }, 0);

        return Math.min(RESEARCH_OPERATIONS_CENTER_BONUS_CAP, total);
    }

    private countAdjacentPoweredGpuClusters(center: { x: number; y: number; type: string }): number {
        const gpus = this.scene.buildingManager?.getByType('GPU_CLUSTER') ?? [];
        return gpus.filter(gpu => gpu.hasPower !== false && this.areOrthogonallyAdjacent(center, gpu)).length;
    }

    private areOrthogonallyAdjacent(
        a: { x: number; y: number; type: string },
        b: { x: number; y: number; type: string }
    ): boolean {
        const gridSize = CONFIG.GRID_SIZE;
        const aConfig = CONFIG.BUILDINGS[a.type];
        const bConfig = CONFIG.BUILDINGS[b.type];
        if (!aConfig || !bConfig) return false;

        const aLeft = a.x / gridSize;
        const aTop = a.y / gridSize;
        const aRight = aLeft + (aConfig.WIDTH || 1);
        const aBottom = aTop + (aConfig.HEIGHT || 1);
        const bLeft = b.x / gridSize;
        const bTop = b.y / gridSize;
        const bRight = bLeft + (bConfig.WIDTH || 1);
        const bBottom = bTop + (bConfig.HEIGHT || 1);

        const verticalOverlap = bTop < aBottom && bBottom > aTop;
        const horizontalOverlap = bLeft < aRight && bRight > aLeft;
        return ((bRight === aLeft || bLeft === aRight) && verticalOverlap)
            || ((bBottom === aTop || bTop === aBottom) && horizontalOverlap);
    }

    getSavedState(): ResearchState {
        return {
            completed: Array.from(this.completed),
            activeResearch: this.activeResearch,
            researchQueue: [...this.researchQueue],
            progressById: { ...this.progressById },
            dataStore: { ...this.dataStore },
            queueLimit: this.queueLimit
        };
    }

    loadState(state?: Partial<ResearchState>): void {
        this.completed = new Set((state?.completed ?? []).filter(id => CONFIG.RESEARCH[id]));
        this.progressById = {};
        Object.entries(state?.progressById ?? {}).forEach(([id, value]) => {
            if (!CONFIG.RESEARCH[id] || this.completed.has(id)) return;
            this.progressById[id] = { progress: Math.max(0, value.progress ?? 0) };
        });

        this.dataStore = createEmptyDataStore();
        DATA_CURRENCIES.forEach(currency => {
            const capacity = CONFIG.RESEARCH_SETTINGS.DATA_CAPACITY[currency];
            this.dataStore[currency] = Math.max(0, Math.min(capacity, state?.dataStore?.[currency] ?? 0));
        });

        this.recomputeUnlockDerivedState(state?.queueLimit);
        this.activeResearch = this.canActivateResearch(state?.activeResearch ?? null) ? state?.activeResearch ?? null : null;
        this.researchQueue = [];
        (state?.researchQueue ?? []).forEach(id => {
            if (!this.canActivateResearch(id)) return;
            if (id === this.activeResearch || this.researchQueue.includes(id)) return;
            if (this.researchQueue.length < this.queueLimit) this.researchQueue.push(id);
        });
        this.promoteNextResearch();
        this.emitStateChanged();
    }

    createPanelSnapshot(open: boolean, selectedId: string | null = null): ResearchPanelSnapshot {
        const dataBalances = DATA_CURRENCIES.map(currency => {
            const capacity = CONFIG.RESEARCH_SETTINGS.DATA_CAPACITY[currency];
            const value = this.dataStore[currency];
            return {
                id: currency,
                label: DATA_LABELS[currency],
                value,
                capacity,
                percent: capacity > 0 ? Math.round(value / capacity * 100) : 0
            };
        });

        const nodes = Object.values(CONFIG.RESEARCH).map(node => this.createNodeSnapshot(node));
        const selected = selectedId ?? this.getFirstSelectedId(nodes);
        const blockedData = this.createBlockedDataSnapshot();
        return {
            open,
            title: 'Research',
            closeLabel: 'Close',
            throughputText: `Throughput ${this.getResearchThroughput().toFixed(1)} / tick`,
            queueText: `Queue ${this.researchQueue.length}/${this.queueLimit}`,
            dataBalances,
            activeResearch: this.createActiveResearchSnapshot(),
            researchQueue: this.researchQueue
                .map(id => this.createQueuedResearchSnapshot(id))
                .filter((snapshot): snapshot is ResearchQueueSnapshot => Boolean(snapshot)),
            blockedData,
            axes: CONFIG.RESEARCH_AXES,
            nodes,
            selectedId: selected
        };
    }

    private consumeForResearch(researchId: string, throughput: number): number {
        const node = CONFIG.RESEARCH[researchId];
        if (!node || !this.areRequirementsMet(node)) return 0;
        const remaining = Math.max(0, node.COST - this.getProgress(researchId));
        if (remaining <= 0) {
            this.completeResearch(researchId);
            return 0;
        }

        const affordable = this.getAffordableProgress(node);
        const amount = Math.min(throughput, remaining, affordable);
        if (amount <= 0) return 0;

        this.consumeDataForProgress(node, amount);
        this.addResearchProgress(researchId, amount);
        return amount;
    }

    private consumeDataForProgress(node: ResearchNode, amount: number): void {
        const totalCost = Math.max(1, node.COST);
        (Object.entries(node.DATA_COSTS) as Array<[ResearchDataCurrency, number]>).forEach(([currency, cost]) => {
            this.dataStore[currency] = Math.max(0, this.dataStore[currency] - amount * (cost / totalCost));
        });
    }

    private getAffordableProgress(node: ResearchNode): number {
        const totalCost = Math.max(1, node.COST);
        let affordable = Number.POSITIVE_INFINITY;
        (Object.entries(node.DATA_COSTS) as Array<[ResearchDataCurrency, number]>).forEach(([currency, cost]) => {
            if (cost <= 0) return;
            affordable = Math.min(affordable, this.dataStore[currency] / (cost / totalCost));
        });
        return affordable;
    }

    private addResearchProgress(researchId: string, amount: number): void {
        const node = CONFIG.RESEARCH[researchId];
        if (!node || this.completed.has(researchId)) return;
        if (!this.areRequirementsMet(node)) return;
        const current = this.getProgress(researchId);
        const next = Math.min(node.COST, current + Math.max(0, amount));
        this.progressById[researchId] = { progress: next };
        if (next >= node.COST) {
            this.completeResearch(researchId);
        }
    }

    private completeResearch(researchId: string): void {
        const node = CONFIG.RESEARCH[researchId];
        if (!node || this.completed.has(researchId)) return;
        this.completed.add(researchId);
        this.progressById[researchId] = { progress: node.COST };
        if (this.activeResearch === researchId) this.activeResearch = null;
        this.researchQueue = this.researchQueue.filter(id => id !== researchId);
        this.recomputeUnlockDerivedState();
        this.promoteNextResearch();
        EventBus.emit('RESEARCH_UNLOCKED', { id: researchId });
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', { message: `Research complete: ${node.NAME}` });
        this.emitStateChanged();
    }

    private recomputeUnlockDerivedState(savedLimit: number | null = null): void {
        const baseLimit = CONFIG.RESEARCH_SETTINGS.DEFAULT_QUEUE_LIMIT ?? FALLBACK_QUEUE_LIMIT;
        let computedLimit = baseLimit;
        this.completed.forEach(id => {
            computedLimit += CONFIG.RESEARCH[id]?.QUEUE_LIMIT_BONUS ?? 0;
        });
        this.queueLimit = Math.max(computedLimit, savedLimit ?? 0);
        if (this.researchQueue.length > this.queueLimit) {
            this.researchQueue = this.researchQueue.slice(0, this.queueLimit);
        }
    }

    private promoteNextResearch(): boolean {
        if (this.activeResearch && this.canActivateResearch(this.activeResearch)) return false;
        this.activeResearch = null;

        while (this.researchQueue.length > 0) {
            const candidate = this.researchQueue.shift() ?? null;
            if (this.canActivateResearch(candidate)) {
                this.activeResearch = candidate;
                return true;
            }
        }

        return false;
    }

    private removeInvalidQueuedResearch(): void {
        if (this.activeResearch && !this.canActivateResearch(this.activeResearch)) {
            this.activeResearch = null;
        }
        this.researchQueue = this.researchQueue
            .filter((id, index, queue) => this.canActivateResearch(id) && queue.indexOf(id) === index && id !== this.activeResearch)
            .slice(0, this.queueLimit);
        this.promoteNextResearch();
    }

    private canActivateResearch(researchId: string | null): researchId is string {
        if (!researchId) return false;
        const node = CONFIG.RESEARCH[researchId];
        return Boolean(node && !this.completed.has(researchId) && this.areRequirementsMet(node));
    }

    private areRequirementsMet(node: ResearchNode): boolean {
        return (node.REQUIREMENTS ?? []).every(id => this.completed.has(id));
    }

    private isResearchQueued(researchId: string): boolean {
        return this.researchQueue.includes(researchId);
    }

    private getProgress(researchId: string): number {
        if (this.completed.has(researchId)) return CONFIG.RESEARCH[researchId]?.COST ?? 1;
        return this.progressById[researchId]?.progress ?? 0;
    }

    private createNodeSnapshot(node: ResearchNode): ResearchNodeSnapshot {
        const progress = this.getProgress(node.ID);
        const status = this.getNodeStatus(node);
        return {
            id: node.ID,
            name: node.NAME,
            description: node.DESCRIPTION,
            axis: node.AXIS,
            ring: node.RING,
            position: node.POSITION,
            status,
            progressPercent: node.COST > 0 ? Math.round(progress / node.COST * 100) : 100,
            costText: this.formatCost(node),
            tagLabels: node.TAGS.map(tag => TAG_LABELS[tag] ?? tag),
            effectsText: this.formatEffects(node)
        };
    }

    private getNodeStatus(node: ResearchNode): ResearchNodeSnapshot['status'] {
        if (this.completed.has(node.ID)) return 'completed';
        if (!this.areRequirementsMet(node)) {
            const hasTierGate = (node.REQUIREMENTS ?? []).some(id => CONFIG.RESEARCH[id]?.AXIS === 'core');
            return hasTierGate ? 'gated' : 'locked';
        }
        if (this.activeResearch === node.ID) {
            return this.getAffordableProgress(node) > 0 ? 'active' : 'waiting_resource';
        }
        if (this.isResearchQueued(node.ID)) return 'queued';
        return 'available';
    }

    private formatCost(node: ResearchNode): string {
        return (Object.entries(node.DATA_COSTS) as Array<[ResearchDataCurrency, number]>)
            .map(([currency, amount]) => `${DATA_LABELS[currency]} ${amount}`)
            .join(' / ');
    }

    private formatEffects(node: ResearchNode): string[] {
        const effects: string[] = [];
        if (node.QUEUE_LIMIT_BONUS) effects.push(`Research queue +${node.QUEUE_LIMIT_BONUS}`);
        if (node.THROUGHPUT_BONUS) effects.push(`Throughput +${node.THROUGHPUT_BONUS}`);
        if (node.UNLOCKS.BUILDINGS?.length) effects.push(`Unlocks: ${node.UNLOCKS.BUILDINGS.join(', ')}`);
        if (node.UNLOCKS.RECIPES?.length) effects.push(`Recipes: ${node.UNLOCKS.RECIPES.join(', ')}`);
        if (node.UNLOCKS.CABLES?.length) effects.push(`Cables: ${node.UNLOCKS.CABLES.join(', ')}`);
        Object.entries(node.EFFECTS ?? {}).forEach(([key, value]) => effects.push(`${key}: ${value}`));
        return effects;
    }

    private getFirstSelectedId(nodes: ResearchNodeSnapshot[]): string | null {
        return nodes.find(node => node.status === 'active')?.id
            ?? nodes.find(node => node.status === 'queued')?.id
            ?? nodes.find(node => node.status === 'available')?.id
            ?? nodes[0]?.id
            ?? null;
    }

    private createQueuedResearchSnapshot(researchId: string): ResearchQueueSnapshot | null {
        const node = CONFIG.RESEARCH[researchId];
        if (!node) return null;
        return {
            id: node.ID,
            name: node.NAME,
            progressPercent: node.COST > 0 ? Math.round(this.getProgress(node.ID) / node.COST * 100) : 100,
            status: this.getNodeStatus(node)
        };
    }

    private createActiveResearchSnapshot(): ActiveResearchSnapshot | null {
        if (!this.activeResearch) return null;
        const snapshot = this.createQueuedResearchSnapshot(this.activeResearch);
        if (!snapshot) return null;
        const node = CONFIG.RESEARCH[this.activeResearch];
        const blocked = this.isBlockedByData(node);
        return {
            ...snapshot,
            blocked,
            missingData: blocked ? this.getMissingData(node) : []
        };
    }

    private createBlockedDataSnapshot(): ResearchPanelSnapshot['blockedData'] {
        if (!this.activeResearch) {
            return { blocked: false, researchId: null, missing: [], message: '' };
        }

        const node = CONFIG.RESEARCH[this.activeResearch];
        const blocked = this.isBlockedByData(node);
        const missing = blocked ? this.getMissingData(node) : [];
        return {
            blocked,
            researchId: blocked ? this.activeResearch : null,
            missing,
            message: blocked && missing.length > 0
                ? `Missing ${missing.map(item => `${item.label} ${Math.ceil(item.missing)}`).join(', ')}`
                : ''
        };
    }

    private isBlockedByData(node: ResearchNode | undefined): boolean {
        if (!node || this.completed.has(node.ID)) return false;
        const remaining = Math.max(0, node.COST - this.getProgress(node.ID));
        return remaining > 0 && this.getAffordableProgress(node) <= 0;
    }

    private getMissingData(node: ResearchNode): ResearchDataShortfall[] {
        const totalCost = Math.max(1, node.COST);
        const remainingProgress = Math.max(0, node.COST - this.getProgress(node.ID));
        return (Object.entries(node.DATA_COSTS) as Array<[ResearchDataCurrency, number]>)
            .map(([currency, cost]) => {
                const required = cost * (remainingProgress / totalCost);
                const available = this.dataStore[currency] ?? 0;
                return {
                    id: currency,
                    label: DATA_LABELS[currency],
                    required,
                    available,
                    missing: Math.max(0, required - available)
                };
            })
            .filter(item => item.missing > 0);
    }

    private emitStateChanged(): void {
        EventBus.emit('RESEARCH_STATE_CHANGED');
    }
}
