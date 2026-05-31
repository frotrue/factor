import { CONFIG } from '../config';
import EventBus from './EventBus';
import type MainScene from '../scenes/MainScene';
import { LabJobProgress, ResearchEffects } from '../types';
import { textForKey, t } from '../i18n';

export default class ResearchManager {
    scene: MainScene;
    unlockedResearch: Set<string>;
    jobProgress: Record<string, LabJobProgress>;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.unlockedResearch = new Set<string>();
        this.jobProgress = {};
    }

    isUnlocked(researchId: string): boolean {
        return this.unlockedResearch.has(researchId);
    }

    canUnlock(researchId: string): boolean {
        if (this.isUnlocked(researchId)) return false;

        const research = CONFIG.RESEARCH[researchId];
        if (!research) return false;

        // Check requirements
        if (research.REQUIREMENTS) {
            for (const req of research.REQUIREMENTS) {
                if (!this.isUnlocked(req)) return false;
            }
        }

        return this.getJobProgress(researchId).progress >= research.COST;
    }

    unlock(researchId: string): boolean {
        if (!this.canUnlock(researchId)) return false;

        const research = CONFIG.RESEARCH[researchId];

        this.unlockedResearch.add(researchId);
        this.jobProgress[researchId] = {
            ...this.getJobProgress(researchId),
            progress: Math.max(this.getJobProgress(researchId).progress, research.COST),
            completed: true
        };
        EventBus.emit('RESEARCH_UNLOCKED', { id: researchId });
        
        this.scene.uiManager.logMessage(t('log.researchComplete', { name: textForKey(`research.${researchId}.name`) }));
        return true;
    }

    isJobAvailable(researchId: string): boolean {
        const research = CONFIG.RESEARCH[researchId];
        if (!research || this.isUnlocked(researchId)) return false;
        return (research.REQUIREMENTS || []).every(req => this.isUnlocked(req));
    }

    getJobProgress(researchId: string): LabJobProgress {
        const existing = this.jobProgress[researchId];
        if (existing) return existing;
        return { progress: 0, completed: this.isUnlocked(researchId) };
    }

    addJobProgress(researchId: string, amount: number): LabJobProgress {
        const research = CONFIG.RESEARCH[researchId];
        const current = this.getJobProgress(researchId);
        if (!research || current.completed || !this.isJobAvailable(researchId)) return current;

        const next: LabJobProgress = {
            ...current,
            progress: Math.min(research.COST, current.progress + Math.max(0, amount)),
            completed: false
        };
        this.jobProgress[researchId] = next;
        EventBus.emit('LAB_JOB_PROGRESS', { id: researchId, progress: next.progress, required: research.COST });
        return next;
    }

    startJobTraining(researchId: string, durationTicks: number): void {
        const progress = this.getJobProgress(researchId);
        const research = CONFIG.RESEARCH[researchId];
        if (!research || progress.completed || progress.isTraining) return;

        this.jobProgress[researchId] = {
            ...progress,
            isTraining: true,
            trainingProgressTicks: 0,
            trainingDurationTicks: Math.max(1, Math.ceil(durationTicks))
        };
        EventBus.emit('LAB_JOB_PROGRESS', { id: researchId, progress: progress.progress, required: research.COST });
    }

    advanceJobTraining(researchId: string, amount: number = 1): void {
        const progress = this.jobProgress[researchId];
        if (!progress || !progress.isTraining || progress.completed) return;

        progress.trainingProgressTicks = (progress.trainingProgressTicks ?? 0) + Math.max(0, amount);
        if (progress.trainingProgressTicks >= (progress.trainingDurationTicks ?? 1)) {
            progress.isTraining = false;
            progress.completed = true;
            this.unlock(researchId);
        } else {
            const research = CONFIG.RESEARCH[researchId];
            EventBus.emit('LAB_JOB_PROGRESS', { id: researchId, progress: progress.progress, required: research.COST });
        }
    }

    getUnlockedResearch(): string[] {
        return Array.from(this.unlockedResearch);
    }

    getEffectValue(effect: keyof ResearchEffects, defaultValue: number): number {
        let value = defaultValue;
        this.unlockedResearch.forEach(id => {
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

    loadUnlockedResearch(researchIds: string[]): void {
        this.unlockedResearch.clear();
        researchIds.forEach(id => this.unlockedResearch.add(id));
        researchIds.forEach(id => {
            const required = CONFIG.RESEARCH[id]?.COST ?? 1;
            this.jobProgress[id] = { progress: required, completed: true };
        });
    }

    getSavedJobProgress(): Record<string, LabJobProgress> {
        return { ...this.jobProgress };
    }

    loadJobProgress(progress: Record<string, LabJobProgress> = {}): void {
        this.jobProgress = {};
        Object.entries(progress).forEach(([id, value]) => {
            this.jobProgress[id] = {
                progress: Math.max(0, value.progress ?? 0),
                completed: Boolean(value.completed || this.unlockedResearch.has(id)),
                isTraining: value.isTraining,
                trainingProgressTicks: value.trainingProgressTicks,
                trainingDurationTicks: value.trainingDurationTicks
            };
        });
        this.unlockedResearch.forEach(id => {
            if (this.jobProgress[id]) return;
            this.jobProgress[id] = {
                progress: CONFIG.RESEARCH[id]?.COST ?? 1,
                completed: true
            };
        });
    }
}
