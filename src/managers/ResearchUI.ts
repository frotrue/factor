import { CONFIG } from '../config';
import EventBus from './EventBus';
import type MainScene from '../scenes/MainScene';
import type UIManager from './UIManager';
import Core from '../buildings/Core';
import { t } from '../i18n';

export default class ResearchUI {
    private activeTab: 'RESEARCH' | 'DEFENSE' = 'RESEARCH';

    constructor(
        private scene: MainScene,
        private uiManager: UIManager
    ) {}

    setup(): void {
        const btnResearch = document.getElementById('btn-research');
        const modalResearch = document.getElementById('research-modal');
        const btnClose = document.getElementById('btn-close-research');
        const container = document.getElementById('research-tree-container');
        this.uiManager.guardDomPointer(btnResearch);
        this.uiManager.guardDomPointer(modalResearch);
        this.uiManager.guardDomPointer(btnClose);
        this.uiManager.guardDomPointer(container);

        if (btnResearch && modalResearch) {
            btnResearch.style.display = 'flex';
            btnResearch.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalResearch.style.display = 'flex';
                EventBus.emit('RESEARCH_OPENED');
                this.render();
            };
        }

        if (btnClose && modalResearch) {
            btnClose.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalResearch.style.display = 'none';
                this.uiManager.restoreCanvasFocus();
            };
        }

        EventBus.on('RESEARCH_UNLOCKED', () => {
            this.uiManager.createBuildingButtons();
            this.uiManager.renderMobileCableMenu();
            if (modalResearch && modalResearch.style.display === 'flex') {
                this.render();
            }
        }, 'UIManager');
    }

    render(): void {
        const container = document.getElementById('research-tree-container');
        const scoreEl = document.getElementById('research-score');
        const rm = this.scene.researchManager;
        const coreBuilding = this.scene.buildingManager.get('0,0');
        const currentScore = coreBuilding instanceof Core ? coreBuilding.confidenceScore : 0;

        if (scoreEl) {
            scoreEl.innerText = currentScore.toFixed(2);
        }

        if (!container) return;
        container.innerHTML = '';

        const tabs = document.createElement('div');
        tabs.style.display = 'flex';
        tabs.style.gap = '8px';
        tabs.style.marginBottom = '12px';

        [
            { id: 'RESEARCH' as const, label: t('research.tab.research') },
            { id: 'DEFENSE' as const, label: t('research.tab.defense') }
        ].forEach(tab => {
            const tabBtn = document.createElement('button');
            tabBtn.className = 'tab-btn';
            tabBtn.innerText = tab.label;
            tabBtn.classList.toggle('active', this.activeTab === tab.id);
            this.uiManager.guardDomPointer(tabBtn);
            tabBtn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                this.activeTab = tab.id;
                this.render();
            };
            tabs.appendChild(tabBtn);
        });
        container.appendChild(tabs);

        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '15px';
        container.appendChild(list);

        const defenseResearchIds = new Set([
            'TECH_PRECISION_INFERENCE',
            'TECH_DEFENSE_RANGE',
            'TECH_RAPID_RESPONSE',
            'TECH_FIREWALL_HARDENING',
            'TECH_AUTOMATED_DEFENSE'
        ]);

        Object.values(CONFIG.RESEARCH).forEach(node => {
            const hasActiveUnlock = !node.UNLOCKS.BUILDINGS || node.UNLOCKS.BUILDINGS.some(type => Boolean(CONFIG.BUILDINGS[type]));
            if (!hasActiveUnlock) return;
            const isDefenseNode = defenseResearchIds.has(node.ID);
            if (this.activeTab === 'DEFENSE' && !isDefenseNode) return;
            if (this.activeTab === 'RESEARCH' && isDefenseNode) return;

            const isUnlocked = rm.isUnlocked(node.ID);
            const canUnlock = rm.canUnlock(node.ID);
            const card = document.createElement('div');
            card.style.background = isUnlocked ? 'rgba(99, 102, 241, 0.2)' : 'rgba(20, 20, 25, 0.8)';
            card.style.border = `1px solid ${isUnlocked ? '#6366f1' : (canUnlock ? '#fde047' : 'rgba(255,255,255,0.1)')}`;
            card.style.borderRadius = '8px';
            card.style.padding = '15px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '10px';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';

            const title = document.createElement('strong');
            title.innerText = node.NAME;
            title.style.color = isUnlocked ? '#a5b4fc' : '#fff';
            title.style.fontSize = '18px';

            const cost = document.createElement('span');
            cost.innerText = t('research.cost', { cost: node.COST });
            cost.style.color = '#fde047';
            cost.style.fontSize = '14px';

            header.appendChild(title);
            header.appendChild(cost);

            const desc = document.createElement('div');
            const effectSummary = this.getEffectSummary(node.ID);
            desc.innerText = effectSummary ? `${node.DESCRIPTION}\n${effectSummary}` : node.DESCRIPTION;
            desc.style.color = '#aaa';
            desc.style.fontSize = '14px';
            desc.style.whiteSpace = 'pre-wrap';

            const actionBtn = document.createElement('button');
            actionBtn.className = 'build-btn';
            actionBtn.style.width = '100%';
            actionBtn.style.height = '35px';
            actionBtn.style.flexDirection = 'row';

            if (isUnlocked) {
                actionBtn.innerText = t('research.action.unlocked');
                actionBtn.style.background = 'rgba(99, 102, 241, 0.3)';
                actionBtn.style.borderColor = '#6366f1';
                actionBtn.disabled = true;
            } else if (canUnlock) {
                actionBtn.innerText = t('research.action.research');
                actionBtn.style.borderColor = '#fde047';
                this.uiManager.guardDomPointer(actionBtn);
                actionBtn.onclick = event => {
                    event.preventDefault();
                    event.stopPropagation();
                    rm.unlock(node.ID);
                };
            } else {
                actionBtn.innerText = t('research.action.locked');
                actionBtn.style.opacity = '0.5';
                actionBtn.disabled = true;
            }

            card.appendChild(header);
            card.appendChild(desc);
            card.appendChild(actionBtn);
            list.appendChild(card);
        });
    }

    getEffectSummary(researchId: string): string {
        const summaries: Record<string, string> = {
            TECH_PRECISION_INFERENCE: t('research.effect.precision'),
            TECH_DEFENSE_RANGE: t('research.effect.range'),
            TECH_RAPID_RESPONSE: t('research.effect.rapid'),
            TECH_FIREWALL_HARDENING: t('research.effect.firewall'),
            TECH_AUTOMATED_DEFENSE: t('research.effect.automated')
        };
        return summaries[researchId] || '';
    }
}
