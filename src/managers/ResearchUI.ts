import type MainScene from '../scenes/MainScene';
import type UIManager from './UIManager';

export default class ResearchUI {
    constructor(
        private scene: MainScene,
        private uiManager: UIManager
    ) {}

    setup(): void {
        this.updateResearchButtonVisibility();
    }

    updateResearchButtonVisibility(): void {
        const btnResearch = document.getElementById('btn-research');
        if (btnResearch) btnResearch.style.display = 'none';
    }

    render(): void {
        const modal = document.getElementById('research-modal');
        if (modal) modal.style.display = 'none';
    }

    getEffectSummary(_researchId: string): string {
        return '';
    }
}
