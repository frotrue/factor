import { CONFIG } from '../config';
import EventBus from './EventBus';
import type MainScene from '../scenes/MainScene';
import Core from '../buildings/Core';
import { ResearchEffects } from '../types';
import { textForKey, t } from '../i18n';

export default class ResearchManager {
    scene: MainScene;
    unlockedResearch: Set<string>;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.unlockedResearch = new Set<string>();
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

        // Check cost
        const core = this.scene.buildingManager.get('0,0') as Core;
        if (!core) return false;

        return core.confidenceScore >= research.COST;
    }

    unlock(researchId: string): boolean {
        if (!this.canUnlock(researchId)) return false;

        const research = CONFIG.RESEARCH[researchId];
        const core = this.scene.buildingManager.get('0,0') as Core;
        
        core.confidenceScore -= research.COST;
        EventBus.emit('CORE_DATA_RECEIVED', { 
            type: 'SPEND', 
            score: core.confidenceScore, 
            total: core.totalDataReceived 
        });

        this.unlockedResearch.add(researchId);
        EventBus.emit('RESEARCH_UNLOCKED', { id: researchId });
        
        this.scene.uiManager.logMessage(t('log.researchComplete', { name: textForKey(`research.${researchId}.name`) }));
        return true;
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
    }
}
