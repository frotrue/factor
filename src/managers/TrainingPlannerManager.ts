import { CONFIG, CORE_KEY } from '../config';
import Core from '../buildings/Core';
import type MainScene from '../scenes/MainScene';
import type {
    TrainingPlannerDecision,
    TrainingPlannerMode,
    TrainingPlannerState,
    TrainingRewardPreference
} from '../types';
import {
    applyCompletedTraining,
    getGpuTrainingSpeedMultiplier,
    getNextTrainingRequirement,
    getTimeAdjustedModelAccuracy
} from '../utils/modelTrainingProgress';
import { getBuildingName, textForKey } from '../i18n';
import EventBus from './EventBus';

const HOLD_PROGRESS_RATIO = 0.9;
const HIGH_PRESSURE = 0.65;
const LOW_PRESSURE = 0.35;

const SYSTEM_PROTOCOL_PRIORITIES: Record<string, number> = {
    TECH_DISTRIBUTED_AP: 90,
    TECH_PRECISION_INFERENCE: 85,
    TECH_DEFENSE_RANGE: 75,
    TECH_RAPID_RESPONSE: 75,
    TECH_EFFICIENT_MINING: 65,
    TECH_STREAMLINED_PROCESSING: 65,
    TECH_FIBER_OPTIC: 60,
    TECH_FIREWALL_HARDENING: 60,
    TECH_RECYCLING: 45,
    TECH_FAST_CONVEYOR: 40,
    TECH_SOLAR_POWER: 40,
    TECH_ADVANCED_PROCESSING: 35,
    TECH_AUTOMATED_DEFENSE: 35
};

interface TrainingPowerSource {
    type?: string;
    hasPower?: boolean;
    countAdjacentGpuClusters(requirePower: boolean): number;
}

export default class TrainingPlannerManager {
    activeJobId: string | null = null;
    autoEnabled = true;
    mode: TrainingPlannerMode = 'AUTO_DECIDE';
    lastDecisionReason: string | null = null;

    constructor(private scene: MainScene) {}

    static getDefenseJobId(type: string): string {
        return `DEFENSE_${type}`;
    }

    getState(): TrainingPlannerState {
        return {
            activeJobId: this.activeJobId,
            autoEnabled: this.autoEnabled,
            mode: this.mode,
            lastDecisionReason: this.lastDecisionReason
        };
    }

    loadState(state: Partial<TrainingPlannerState> = {}): void {
        this.activeJobId = this.isValidJobId(state.activeJobId) ? state.activeJobId! : null;
        this.autoEnabled = state.autoEnabled ?? true;
        this.mode = state.mode === 'MANUAL_LOCK' ? 'MANUAL_LOCK' : 'AUTO_DECIDE';
        this.lastDecisionReason = state.lastDecisionReason ?? null;
    }

    setAutoEnabled(enabled: boolean): void {
        this.autoEnabled = enabled;
        if (enabled) {
            this.mode = 'AUTO_DECIDE';
            this.chooseBestJob(false);
        } else {
            this.mode = 'MANUAL_LOCK';
            this.lastDecisionReason = 'player selected';
        }
        EventBus.emit('TRAINING_LAB_RENDER_REQUESTED');
    }

    setManualDefenseJob(type: string): void {
        this.activeJobId = TrainingPlannerManager.getDefenseJobId(type);
        this.mode = 'MANUAL_LOCK';
        this.lastDecisionReason = 'player selected';
    }

    setManualSystemJob(researchId: string): void {
        this.activeJobId = researchId;
        this.mode = 'MANUAL_LOCK';
        this.lastDecisionReason = 'player selected';
    }

    setManualRewardPreference(type: string, preference: TrainingRewardPreference): void {
        this.scene.getDefenseModelState(type).trainingRewardPreference = preference;
        this.mode = 'MANUAL_LOCK';
        this.lastDecisionReason = 'player selected';
        this.scene.syncDefenseModelType(type);
        EventBus.emit('TRAINING_LAB_RENDER_REQUESTED');
    }

    getActiveJobCategory(jobId: string | null = this.activeJobId): 'DEFENSE_MODEL' | 'SYSTEM_PROTOCOL' | null {
        if (!jobId) return null;
        return jobId.startsWith('DEFENSE_') ? 'DEFENSE_MODEL' : 'SYSTEM_PROTOCOL';
    }

    getTargetType(jobId: string | null = this.activeJobId): string | null {
        if (!jobId?.startsWith('DEFENSE_')) return null;
        const type = jobId.replace(/^DEFENSE_/, '');
        return CONFIG.BUILDINGS[type]?.DEFENSE ? type : null;
    }

    getTrainingPower(lab: TrainingPowerSource): number {
        if (lab.hasPower === false) return 0;
        return 1 / getGpuTrainingSpeedMultiplier(lab.countAdjacentGpuClusters(true));
    }

    getTotalTrainingPower(): number {
        let total = 0;
        this.scene.buildingManager?.forEach(building => {
            if (building.type === 'MODEL_TRAINING_LAB' && typeof (building as any).countAdjacentGpuClusters === 'function') {
                total += this.getTrainingPower(building as unknown as TrainingPowerSource);
            }
        });
        return Math.max(1, total);
    }

    getEstimatedDurationTicks(jobId: string | null = this.activeJobId): number {
        const type = this.getTargetType(jobId);
        const requirement = type
            ? this.scene.getDefenseModelState(type).currentRequirement
            : jobId && CONFIG.RESEARCH[jobId]
                ? CONFIG.RESEARCH[jobId].COST
                : CONFIG.MODEL_TRAINING.INITIAL_DATA_REQUIREMENT;
        const baseDuration = Math.max(1, requirement / CONFIG.MODEL_TRAINING.INITIAL_DATA_REQUIREMENT * CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS);
        return Math.max(1, Math.ceil(baseDuration / this.getTotalTrainingPower()));
    }

    prepareLabTick(_lab: TrainingPowerSource): void {
        this.maybeAutoSelect();
    }

    advanceFromLab(lab: TrainingPowerSource): boolean {
        this.maybeAutoSelect();
        const power = this.getTrainingPower(lab);
        if (power <= 0 || !this.activeJobId) return false;

        const category = this.getActiveJobCategory();
        if (category === 'DEFENSE_MODEL') {
            return this.advanceDefenseTraining(power);
        }
        if (category === 'SYSTEM_PROTOCOL') {
            return this.advanceSystemProtocolTraining(power);
        }
        return false;
    }

    private advanceDefenseTraining(power: number): boolean {
        const targetType = this.getTargetType();
        if (!targetType) return false;

        const state = this.scene.getDefenseModelState(targetType);
        if (!state.isTraining) {
            if (state.accumulatedTrainingData < state.currentRequirement) return false;
            state.accumulatedTrainingData -= state.currentRequirement;
            state.isTraining = true;
            state.trainingProgressTicks = 0;
            state.trainingDurationTicks = Math.max(1, Math.ceil(state.currentRequirement / CONFIG.MODEL_TRAINING.INITIAL_DATA_REQUIREMENT * CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS));
            this.scene.syncDefenseModelType(targetType);
        }

        state.trainingProgressTicks += power;
        if (state.trainingProgressTicks < state.trainingDurationTicks) {
            return true;
        }

        const reward = applyCompletedTraining(state);
        state.isTraining = false;
        state.trainingProgressTicks = 0;
        state.trainingDurationTicks = CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS;
        state.currentRequirement = getNextTrainingRequirement(state.currentRequirement);
        this.scene.syncDefenseModelType(targetType);
        EventBus.emit('BUILD_CONSOLE_REFRESH_REQUESTED');

        const displayName = getBuildingName(targetType);
        const rewardText = reward.kind === 'accuracy'
            ? `accuracy ${Math.round(state.modelAccuracy)}%`
            : `damage +${Math.round(state.damageBonus)}%`;
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', {
            message: `Training: ${displayName} model complete. ${rewardText}.`
        });
        this.scene.buildingManager.forEach(building => {
            if (building.type === targetType) {
                this.scene.effectsManager?.playModelTrainingPulse(building, reward.kind);
            }
        });
        EventBus.emit('TRAINING_LAB_RENDER_REQUESTED');
        this.maybeAutoSelect(true);
        return true;
    }

    private advanceSystemProtocolTraining(power: number): boolean {
        const researchId = this.activeJobId;
        if (!researchId) return false;
        const research = CONFIG.RESEARCH[researchId];
        const progress = this.scene.researchManager.getJobProgress(researchId);
        if (!research || progress.completed || !this.scene.researchManager.isJobAvailable(researchId)) return false;

        if (!progress.isTraining) {
            if (progress.progress < research.COST) return false;
            this.scene.researchManager.startJobTraining(researchId, research.COST / CONFIG.MODEL_TRAINING.INITIAL_DATA_REQUIREMENT * CONFIG.MODEL_TRAINING.BASE_TRAINING_TICKS);
        }

        this.scene.researchManager.advanceJobTraining(researchId, power);
        EventBus.emit('TRAINING_LAB_RENDER_REQUESTED');
        this.maybeAutoSelect(true);
        return true;
    }

    private maybeAutoSelect(force: boolean = false): void {
        if (!this.autoEnabled || this.mode !== 'AUTO_DECIDE') return;
        if (!force && this.shouldKeepCurrentJob()) return;
        this.chooseBestJob(this.hasAnyReadyCandidate());
    }

    private shouldKeepCurrentJob(): boolean {
        if (!this.activeJobId || !this.isValidJobId(this.activeJobId)) return false;
        if (this.isJobComplete(this.activeJobId)) return false;
        if (this.isJobTraining(this.activeJobId)) return true;
        if (this.canStartJob(this.activeJobId)) return true;
        return this.getProgressRatio(this.activeJobId) >= HOLD_PROGRESS_RATIO;
    }

    private chooseBestJob(readyOnly: boolean): void {
        const decision = this.getBestDecision(readyOnly) ?? this.getBestDecision(false);
        if (!decision || !decision.jobId) return;

        const changed = this.activeJobId !== decision.jobId;
        this.activeJobId = decision.jobId;
        this.lastDecisionReason = decision.reason;

        const targetType = this.getTargetType(decision.jobId);
        if (targetType && decision.rewardPreference) {
            this.scene.getDefenseModelState(targetType).trainingRewardPreference = decision.rewardPreference;
        }

        if (changed) {
            EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', {
                message: `Auto Training: ${this.getJobLabel(decision.jobId)} selected. ${decision.reason}.`
            });
        }
        EventBus.emit('TRAINING_LAB_RENDER_REQUESTED');
    }

    private getBestDecision(readyOnly: boolean): TrainingPlannerDecision | null {
        const pressure = this.getPressure();
        const candidates = [
            ...this.getDefenseDecisions(pressure),
            ...this.getSystemProtocolDecisions(pressure)
        ].filter(candidate => !readyOnly || this.canStartJob(candidate.jobId));

        return candidates
            .filter(candidate => candidate.jobId && !this.isJobComplete(candidate.jobId))
            .sort((a, b) => b.score - a.score || a.jobId!.localeCompare(b.jobId!))[0] ?? null;
    }

    private getDefenseDecisions(pressure: number): TrainingPlannerDecision[] {
        return CONFIG.MODEL_TRAINING.TARGET_TYPES.map(type => {
            const state = this.scene.getDefenseModelState(type);
            const towerCount = this.countDefenseTowers(type);
            const towerPresenceScore = towerCount > 0 ? 30 + towerCount * 12 : 5;
            const effectiveAccuracy = getTimeAdjustedModelAccuracy(state.modelAccuracy, this.scene.time.now);
            const targetAccuracy = pressure >= HIGH_PRESSURE ? 90 : 80;
            const survivalWeight = this.lerp(0.35, 0.85, pressure);
            const enemyHpPressure = this.getEnemyHpPressure();
            const accuracyNeed = this.clamp01((targetAccuracy - effectiveAccuracy) / targetAccuracy);
            const damageNeed = this.clamp01((effectiveAccuracy - 60) / 40) * enemyHpPressure;

            const accuracyScore = survivalWeight * towerPresenceScore * (1 + accuracyNeed * 2);
            const damageScore = survivalWeight * towerPresenceScore * (0.6 + damageNeed * 1.6);
            const rewardPreference = effectiveAccuracy < targetAccuracy || accuracyScore >= damageScore
                ? 'accuracy'
                : 'damage';
            const score = rewardPreference === 'accuracy' ? accuracyScore : damageScore;
            const reason = rewardPreference === 'accuracy'
                ? `${towerCount} towers, effective accuracy ${Math.round(effectiveAccuracy)}%`
                : `${towerCount} towers, enemy pressure ${Math.round(enemyHpPressure * 100)}%`;

            return {
                jobId: TrainingPlannerManager.getDefenseJobId(type),
                rewardPreference,
                score,
                reason
            };
        });
    }

    private getSystemProtocolDecisions(pressure: number): TrainingPlannerDecision[] {
        const growthWeight = 1 - this.lerp(0.35, 0.85, pressure);
        const pressureGate = pressure >= HIGH_PRESSURE ? 0.1 : pressure <= LOW_PRESSURE ? 1 : 0.45;

        return Object.values(CONFIG.RESEARCH)
            .filter(node => this.scene.researchManager.isJobAvailable(node.ID))
            .map(node => {
                const progress = this.scene.researchManager.getJobProgress(node.ID);
                const priority = SYSTEM_PROTOCOL_PRIORITIES[node.ID] ?? 35;
                const progressRatio = Math.min(1, progress.progress / node.COST);
                const readyMultiplier = progress.progress >= node.COST ? 1.35 : 0.75 + progressRatio * 0.35;
                return {
                    jobId: node.ID,
                    score: growthWeight * pressureGate * priority * readyMultiplier,
                    reason: pressure <= LOW_PRESSURE ? 'low threat, protocol ready' : 'protocol available'
                };
            });
    }

    private hasAnyReadyCandidate(): boolean {
        return [...this.getDefenseJobIds(), ...Object.keys(CONFIG.RESEARCH)].some(jobId => this.canStartJob(jobId));
    }

    private getDefenseJobIds(): string[] {
        return CONFIG.MODEL_TRAINING.TARGET_TYPES.map(type => TrainingPlannerManager.getDefenseJobId(type));
    }

    private canStartJob(jobId: string | null): boolean {
        if (!jobId || this.isJobComplete(jobId) || this.isJobTraining(jobId)) return false;
        const type = this.getTargetType(jobId);
        if (type) {
            const state = this.scene.getDefenseModelState(type);
            return state.accumulatedTrainingData >= state.currentRequirement;
        }

        const research = CONFIG.RESEARCH[jobId];
        if (!research || !this.scene.researchManager.isJobAvailable(jobId)) return false;
        const progress = this.scene.researchManager.getJobProgress(jobId);
        return progress.progress >= research.COST;
    }

    private isJobTraining(jobId: string | null): boolean {
        const type = this.getTargetType(jobId);
        if (type) return this.scene.getDefenseModelState(type).isTraining;
        if (!jobId) return false;
        return Boolean(this.scene.researchManager.getJobProgress(jobId).isTraining);
    }

    private isJobComplete(jobId: string | null): boolean {
        const type = this.getTargetType(jobId);
        if (type) return false;
        if (!jobId) return false;
        return Boolean(this.scene.researchManager.getJobProgress(jobId).completed || this.scene.researchManager.isUnlocked(jobId));
    }

    private getProgressRatio(jobId: string | null): number {
        const type = this.getTargetType(jobId);
        if (type) {
            const state = this.scene.getDefenseModelState(type);
            return Math.min(1, state.accumulatedTrainingData / state.currentRequirement);
        }
        if (!jobId || !CONFIG.RESEARCH[jobId]) return 0;
        const progress = this.scene.researchManager.getJobProgress(jobId);
        return Math.min(1, progress.progress / CONFIG.RESEARCH[jobId].COST);
    }

    private isValidJobId(jobId: string | null | undefined): boolean {
        if (!jobId) return false;
        return Boolean(this.getTargetType(jobId) || CONFIG.RESEARCH[jobId]);
    }

    private countDefenseTowers(type: string): number {
        let count = 0;
        this.scene.buildingManager?.forEach(building => {
            if (building.type === type && CONFIG.BUILDINGS[type]?.DEFENSE) count++;
        });
        return count;
    }

    private getPressure(): number {
        const core = this.scene.buildingManager?.get(CORE_KEY) as Core | null;
        const corePressure = core ? this.clamp01(1 - core.hp / core.maxHp) : 0;
        const activeEnemyPressure = this.clamp01((this.scene.waveManager?.enemies.size ?? 0) / 20);
        const weakDefenseCoverage = this.getWeakDefenseCoverage();
        return this.clamp01(corePressure * 0.4 + activeEnemyPressure * 0.4 + weakDefenseCoverage * 0.2);
    }

    private getEnemyHpPressure(): number {
        const enemies = Array.from(this.scene.waveManager?.enemies.values?.() ?? []);
        if (enemies.length === 0) return 0.25;
        const totalHp = enemies.reduce((sum, enemy) => sum + Math.max(0, enemy.hp), 0);
        return this.clamp01(totalHp / 1500);
    }

    private getWeakDefenseCoverage(): number {
        let weightedDeficit = 0;
        let towerTotal = 0;
        CONFIG.MODEL_TRAINING.TARGET_TYPES.forEach(type => {
            const count = this.countDefenseTowers(type);
            if (count <= 0) return;
            const state = this.scene.getDefenseModelState(type);
            const effectiveAccuracy = getTimeAdjustedModelAccuracy(state.modelAccuracy, this.scene.time.now);
            weightedDeficit += count * this.clamp01((80 - effectiveAccuracy) / 80);
            towerTotal += count;
        });
        return towerTotal > 0 ? weightedDeficit / towerTotal : 0.5;
    }

    getJobLabel(jobId: string | null = this.activeJobId): string {
        const type = this.getTargetType(jobId);
        if (type) {
            const state = this.scene.getDefenseModelState(type);
            const reward = state.trainingRewardPreference === 'accuracy'
                ? textForKey('trainingLab.rewardAccuracy')
                : textForKey('trainingLab.rewardDamage');
            return `${getBuildingName(type)} ${reward}`;
        }
        if (jobId && CONFIG.RESEARCH[jobId]) {
            return textForKey(`research.${jobId}.name`);
        }
        return textForKey('trainingLab.waiting');
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }

    private lerp(min: number, max: number, amount: number): number {
        return min + (max - min) * this.clamp01(amount);
    }
}
