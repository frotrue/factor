import { CONFIG } from '../config';
import type MainScene from '../scenes/MainScene';
import type {
    InsightGroup,
    LabJobProgress,
    ResearchEffects,
    ResearchNode,
    ResearchNodeSnapshot,
    ResearchPanelSnapshot,
    ResearchProgressState,
    ResearchState,
    ResearchTag
} from '../types';
import EventBus from './EventBus';

const INSIGHT_LABELS: Record<InsightGroup, string> = {
    material: 'Material Insight',
    tactical: 'Tactical Insight',
    system: 'System Insight'
};

const TAG_LABELS: Record<ResearchTag, string> = {
    unlock: 'Unlock',
    stat: 'Stat',
    'rule-change': 'Rule',
    slot: 'Slot',
    throughput: 'Throughput'
};

const DEFAULT_SLOT_ID = 'slot-1';

function createEmptyBuffers(): Record<InsightGroup, number> {
    return { material: 0, tactical: 0, system: 0 };
}

export default class ResearchManager {
    scene: MainScene;
    private completed: Set<string>;
    private progressById: Record<string, ResearchProgressState>;
    private insightBuffers: Record<InsightGroup, number>;
    private activeSlots: Array<{ id: string; researchId: string | null }>;
    private unlockedSlots: number;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.completed = new Set<string>();
        this.progressById = {};
        this.insightBuffers = createEmptyBuffers();
        this.unlockedSlots = 1;
        this.activeSlots = [{ id: DEFAULT_SLOT_ID, researchId: null }];
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

    getJobProgress(researchId: string): LabJobProgress {
        const node = CONFIG.RESEARCH[researchId];
        const progress = this.getProgress(researchId);
        const required = node?.COST ?? 1;
        return {
            progress,
            completed: this.isUnlocked(researchId),
            isTraining: this.isResearchActive(researchId),
            trainingProgressTicks: progress,
            trainingDurationTicks: required
        };
    }

    addJobProgress(researchId: string, amount: number): LabJobProgress {
        this.addResearchProgress(researchId, amount);
        return this.getJobProgress(researchId);
    }

    startJobTraining(_researchId: string, _durationTicks: number): void {
        // Kept for old TrainingLab callers. Research now progresses through global slots.
    }

    advanceJobTraining(researchId: string, amount: number = 1): void {
        this.addResearchProgress(researchId, amount);
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
    }

    getSavedJobProgress(): Record<string, LabJobProgress> {
        const result: Record<string, LabJobProgress> = {};
        Object.keys(CONFIG.RESEARCH).forEach(id => {
            result[id] = this.getJobProgress(id);
        });
        return result;
    }

    loadJobProgress(progress: Record<string, LabJobProgress> = {}): void {
        Object.entries(progress).forEach(([id, value]) => {
            if (!CONFIG.RESEARCH[id] || this.completed.has(id)) return;
            this.progressById[id] = { progress: Math.max(0, value.progress ?? 0) };
        });
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

    addInsight(group: InsightGroup, amount: number): number {
        const capacity = CONFIG.RESEARCH_SETTINGS.BUFFER_CAPACITY[group];
        const current = this.insightBuffers[group] ?? 0;
        const next = Math.max(0, Math.min(capacity, current + Math.max(0, amount)));
        this.insightBuffers[group] = next;
        const added = next - current;
        if (added > 0) this.emitStateChanged();
        return added;
    }

    assignResearch(researchId: string): boolean {
        const node = CONFIG.RESEARCH[researchId];
        if (!node || this.completed.has(researchId) || !this.areRequirementsMet(node)) return false;
        if (this.isResearchActive(researchId)) return true;

        this.ensureSlotCount();
        const openSlot = this.activeSlots.find(slot => !slot.researchId) ?? this.activeSlots[0];
        if (!openSlot) return false;

        openSlot.researchId = researchId;
        this.emitStateChanged();
        EventBus.emit('RESEARCH_PANEL_UPDATED', this.createPanelSnapshot(true, researchId));
        return true;
    }

    clearResearch(researchId: string): void {
        this.activeSlots.forEach(slot => {
            if (slot.researchId === researchId) slot.researchId = null;
        });
        this.emitStateChanged();
    }

    onTick(): void {
        this.ensureSlotCount();
        const active = this.activeSlots
            .map(slot => slot.researchId)
            .filter((id): id is string => Boolean(id && CONFIG.RESEARCH[id] && !this.completed.has(id)));
        if (active.length === 0) return;

        let remainingThroughput = this.getResearchThroughput();
        if (remainingThroughput <= 0) return;

        let changed = false;
        const share = remainingThroughput / active.length;
        for (const researchId of active) {
            const spent = this.consumeForResearch(researchId, share);
            remainingThroughput -= spent;
            changed = changed || spent > 0;
            if (remainingThroughput <= 0) break;
        }

        if (changed) {
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
            throughput += gpuBonus * building.getPowerEfficiency();
        });
        return Math.max(1, throughput);
    }

    getSavedState(): ResearchState {
        this.ensureSlotCount();
        return {
            completed: Array.from(this.completed),
            activeSlots: this.activeSlots.map(slot => ({ ...slot })),
            progressById: { ...this.progressById },
            insightBuffers: { ...this.insightBuffers },
            unlockedSlots: this.unlockedSlots
        };
    }

    loadState(state?: Partial<ResearchState>): void {
        this.completed = new Set((state?.completed ?? []).filter(id => CONFIG.RESEARCH[id]));
        this.progressById = {};
        Object.entries(state?.progressById ?? {}).forEach(([id, value]) => {
            if (!CONFIG.RESEARCH[id] || this.completed.has(id)) return;
            this.progressById[id] = { progress: Math.max(0, value.progress ?? 0) };
        });
        this.insightBuffers = createEmptyBuffers();
        (Object.keys(this.insightBuffers) as InsightGroup[]).forEach(group => {
            const capacity = CONFIG.RESEARCH_SETTINGS.BUFFER_CAPACITY[group];
            this.insightBuffers[group] = Math.max(0, Math.min(capacity, state?.insightBuffers?.[group] ?? 0));
        });
        this.unlockedSlots = Math.max(1, state?.unlockedSlots ?? 1);
        this.recomputeUnlockDerivedState();
        this.activeSlots = (state?.activeSlots ?? [])
            .filter(slot => !slot.researchId || CONFIG.RESEARCH[slot.researchId])
            .slice(0, this.unlockedSlots)
            .map((slot, index) => ({ id: slot.id || `slot-${index + 1}`, researchId: slot.researchId ?? null }));
        this.ensureSlotCount();
        this.emitStateChanged();
    }

    createPanelSnapshot(open: boolean, selectedId: string | null = null): ResearchPanelSnapshot {
        const buffers = (Object.keys(this.insightBuffers) as InsightGroup[]).map(group => {
            const capacity = CONFIG.RESEARCH_SETTINGS.BUFFER_CAPACITY[group];
            const value = this.insightBuffers[group];
            return {
                id: group,
                label: INSIGHT_LABELS[group],
                value,
                capacity,
                percent: capacity > 0 ? Math.round(value / capacity * 100) : 0
            };
        });

        const nodes = Object.values(CONFIG.RESEARCH).map(node => this.createNodeSnapshot(node));
        const selected = selectedId ?? this.getFirstSelectedId(nodes);
        return {
            open,
            title: 'Research',
            closeLabel: 'Close',
            throughputText: `Throughput ${this.getResearchThroughput().toFixed(1)} / tick`,
            slotsText: `Slots ${this.activeSlots.filter(slot => slot.researchId).length}/${this.unlockedSlots}`,
            buffers,
            axes: CONFIG.RESEARCH_AXES,
            nodes,
            selectedId: selected
        };
    }

    private consumeForResearch(researchId: string, throughputShare: number): number {
        const node = CONFIG.RESEARCH[researchId];
        if (!node || !this.areRequirementsMet(node)) return 0;
        const remaining = Math.max(0, node.COST - this.getProgress(researchId));
        if (remaining <= 0) {
            this.completeResearch(researchId);
            return 0;
        }

        const affordable = this.getAffordableProgress(node);
        const amount = Math.min(throughputShare, remaining, affordable);
        if (amount <= 0) return 0;

        const totalCost = node.COST;
        (Object.entries(node.COSTS.insight) as Array<[InsightGroup, number]>).forEach(([group, cost]) => {
            this.insightBuffers[group] = Math.max(0, this.insightBuffers[group] - amount * (cost / totalCost));
        });
        this.addResearchProgress(researchId, amount);
        return amount;
    }

    private getAffordableProgress(node: ResearchNode): number {
        const totalCost = Math.max(1, node.COST);
        let affordable = Number.POSITIVE_INFINITY;
        (Object.entries(node.COSTS.insight) as Array<[InsightGroup, number]>).forEach(([group, cost]) => {
            if (cost <= 0) return;
            affordable = Math.min(affordable, this.insightBuffers[group] / (cost / totalCost));
        });
        return Number.isFinite(affordable) ? affordable : 0;
    }

    private addResearchProgress(researchId: string, amount: number): void {
        const node = CONFIG.RESEARCH[researchId];
        if (!node || this.completed.has(researchId)) return;
        if (!this.areRequirementsMet(node)) return;
        const current = this.getProgress(researchId);
        const next = Math.min(node.COST, current + Math.max(0, amount));
        this.progressById[researchId] = { progress: next };
        EventBus.emit('LAB_JOB_PROGRESS', { id: researchId, progress: next, required: node.COST });
        if (next >= node.COST) {
            this.completeResearch(researchId);
        }
    }

    private completeResearch(researchId: string): void {
        const node = CONFIG.RESEARCH[researchId];
        if (!node || this.completed.has(researchId)) return;
        this.completed.add(researchId);
        this.progressById[researchId] = { progress: node.COST };
        this.activeSlots.forEach(slot => {
            if (slot.researchId === researchId) slot.researchId = null;
        });
        this.recomputeUnlockDerivedState();
        EventBus.emit('RESEARCH_UNLOCKED', { id: researchId });
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', { message: `Research complete: ${node.NAME}` });
        this.emitStateChanged();
    }

    private recomputeUnlockDerivedState(): void {
        this.unlockedSlots = 1;
        this.completed.forEach(id => {
            this.unlockedSlots += CONFIG.RESEARCH[id]?.SLOT_BONUS ?? 0;
        });
        this.ensureSlotCount();
    }

    private ensureSlotCount(): void {
        while (this.activeSlots.length < this.unlockedSlots) {
            this.activeSlots.push({ id: `slot-${this.activeSlots.length + 1}`, researchId: null });
        }
        if (this.activeSlots.length > this.unlockedSlots) {
            this.activeSlots = this.activeSlots.slice(0, this.unlockedSlots);
        }
    }

    private areRequirementsMet(node: ResearchNode): boolean {
        return (node.REQUIREMENTS ?? []).every(id => this.completed.has(id));
    }

    private isResearchActive(researchId: string): boolean {
        return this.activeSlots.some(slot => slot.researchId === researchId);
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
        if (this.isResearchActive(node.ID)) {
            return this.getAffordableProgress(node) > 0 ? 'active' : 'waiting_resource';
        }
        return 'available';
    }

    private formatCost(node: ResearchNode): string {
        return (Object.entries(node.COSTS.insight) as Array<[InsightGroup, number]>)
            .map(([group, amount]) => `${INSIGHT_LABELS[group]} ${amount}`)
            .join(' / ');
    }

    private formatEffects(node: ResearchNode): string[] {
        const effects: string[] = [];
        if (node.SLOT_BONUS) effects.push(`Research slots +${node.SLOT_BONUS}`);
        if (node.THROUGHPUT_BONUS) effects.push(`Throughput +${node.THROUGHPUT_BONUS}`);
        if (node.UNLOCKS.BUILDINGS?.length) effects.push(`Unlocks: ${node.UNLOCKS.BUILDINGS.join(', ')}`);
        if (node.UNLOCKS.RECIPES?.length) effects.push(`Recipes: ${node.UNLOCKS.RECIPES.join(', ')}`);
        if (node.UNLOCKS.CABLES?.length) effects.push(`Cables: ${node.UNLOCKS.CABLES.join(', ')}`);
        Object.entries(node.EFFECTS ?? {}).forEach(([key, value]) => effects.push(`${key}: ${value}`));
        return effects;
    }

    private getFirstSelectedId(nodes: ResearchNodeSnapshot[]): string | null {
        return nodes.find(node => node.status === 'active')?.id
            ?? nodes.find(node => node.status === 'available')?.id
            ?? nodes[0]?.id
            ?? null;
    }

    private emitStateChanged(): void {
        EventBus.emit('RESEARCH_STATE_CHANGED');
    }
}
