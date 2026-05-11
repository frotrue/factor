import { CONFIG } from '../config';
import EventBus from './EventBus';
export default class ResearchManager {
    constructor(scene) {
        this.scene = scene;
        this.unlockedResearch = new Set();
    }
    isUnlocked(researchId) {
        return this.unlockedResearch.has(researchId);
    }
    canUnlock(researchId) {
        if (this.isUnlocked(researchId))
            return false;
        const research = CONFIG.RESEARCH[researchId];
        if (!research)
            return false;
        // Check requirements
        if (research.REQUIREMENTS) {
            for (const req of research.REQUIREMENTS) {
                if (!this.isUnlocked(req))
                    return false;
            }
        }
        // Check cost
        const core = this.scene.buildingManager.get('0,0');
        if (!core)
            return false;
        return core.confidenceScore >= research.COST;
    }
    unlock(researchId) {
        if (!this.canUnlock(researchId))
            return false;
        const research = CONFIG.RESEARCH[researchId];
        const core = this.scene.buildingManager.get('0,0');
        core.confidenceScore -= research.COST;
        EventBus.emit('CORE_DATA_RECEIVED', {
            type: 'SPEND',
            score: core.confidenceScore,
            total: core.totalDataReceived
        });
        this.unlockedResearch.add(researchId);
        EventBus.emit('RESEARCH_UNLOCKED', { id: researchId });
        this.scene.uiManager.logMessage(`System: Research [${research.NAME}] complete!`);
        return true;
    }
    getUnlockedResearch() {
        return Array.from(this.unlockedResearch);
    }
    loadUnlockedResearch(researchIds) {
        this.unlockedResearch.clear();
        researchIds.forEach(id => this.unlockedResearch.add(id));
    }
}
//# sourceMappingURL=ResearchManager.js.map