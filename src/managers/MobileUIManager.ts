import { CONFIG } from '../config';
import type MainScene from '../scenes/MainScene';
import type UIManager from './UIManager';
import { getBuildingName, getCableName, getItemName, t } from '../i18n';

export default class MobileUIManager {
    constructor(
        private scene: MainScene,
        private uiManager: UIManager
    ) {}

    setup(): void {
        this.uiManager.mobileActionBar = document.getElementById('mobile-action-bar');
        if (!this.uiManager.mobileActionBar) {
            this.uiManager.mobileActionBar = document.createElement('div');
            this.uiManager.mobileActionBar.id = 'mobile-action-bar';
            document.body.appendChild(this.uiManager.mobileActionBar);
        }
        this.uiManager.guardDomPointer(this.uiManager.mobileActionBar);

        this.uiManager.mobileCableMenu = document.getElementById('mobile-cable-menu');
        if (!this.uiManager.mobileCableMenu) {
            this.uiManager.mobileCableMenu = document.createElement('div');
            this.uiManager.mobileCableMenu.id = 'mobile-cable-menu';
            this.uiManager.mobileCableMenu.className = 'glass-panel';
            this.uiManager.mobileActionBar.appendChild(this.uiManager.mobileCableMenu);
        }
        this.uiManager.guardDomPointer(this.uiManager.mobileCableMenu);

        const actions = [
            { id: 'rotate', label: t('action.rotate'), handler: () => this.scene.rotateCursor() },
            { id: 'remove', label: t('action.remove'), handler: () => this.uiManager.selectBuilding('REMOVE') },
            { id: 'cable', label: t('action.cable'), handler: () => this.openCableMenu() },
            { id: 'cancel', label: t('action.cancel'), handler: () => this.scene.cancelCurrentAction() },
            { id: 'defense', label: t('action.defense'), handler: () => this.scene.toggleDefenseRange() },
            { id: 'power', label: t('action.power'), handler: () => this.scene.togglePowerGrid() }
        ];

        this.uiManager.mobileActionBar.innerHTML = '';
        this.uiManager.mobileActionBar.appendChild(this.uiManager.mobileCableMenu);
        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.id = `mobile-action-${action.id}`;
            btn.className = 'mobile-action-btn';
            btn.type = 'button';
            btn.textContent = action.label;
            btn.setAttribute('aria-label', action.label);
            btn.addEventListener('pointerdown', event => {
                event.preventDefault();
                event.stopPropagation();
            });
            btn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                action.handler();
            };
            this.uiManager.mobileActionBar!.appendChild(btn);
        });

        this.uiManager.mobileInfoSheet = document.getElementById('mobile-info-sheet');
        if (!this.uiManager.mobileInfoSheet) {
            this.uiManager.mobileInfoSheet = document.createElement('div');
            this.uiManager.mobileInfoSheet.id = 'mobile-info-sheet';
            this.uiManager.mobileInfoSheet.className = 'glass-panel';
            document.body.appendChild(this.uiManager.mobileInfoSheet);
        }
        this.uiManager.guardDomPointer(this.uiManager.mobileInfoSheet);

        this.uiManager.mobileBuildSummary = document.getElementById('mobile-build-summary');
        if (!this.uiManager.mobileBuildSummary) {
            this.uiManager.mobileBuildSummary = document.createElement('div');
            this.uiManager.mobileBuildSummary.id = 'mobile-build-summary';
            this.uiManager.mobileBuildSummary.className = 'glass-panel';
            document.body.appendChild(this.uiManager.mobileBuildSummary);
        }
        this.uiManager.guardDomPointer(this.uiManager.mobileBuildSummary);

        this.renderCableMenu();
        this.updateControls();
        this.updateBuildSummary();
    }

    renderCableMenu(): void {
        if (!this.uiManager.mobileCableMenu) return;

        this.uiManager.mobileCableMenu.innerHTML = '';
        (['BASIC', 'FIBER'] as const).forEach(type => {
            const cConfig = CONFIG.CABLES[type];
            const btn = document.createElement('button');
            btn.className = 'mobile-cable-option';
            btn.type = 'button';
            btn.textContent = getCableName(type);
            btn.setAttribute('aria-label', getCableName(type));
            btn.addEventListener('pointerdown', event => {
                event.preventDefault();
                event.stopPropagation();
            });
            btn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                this.uiManager.mobileCableMenu!.classList.remove('open');
                this.uiManager.selectBuilding(type);
            };
            this.uiManager.mobileCableMenu!.appendChild(btn);
        });
    }

    openCableMenu(): void {
        const fiberUnlocked = !CONFIG.CABLES.FIBER.UNLOCK_REQUIRED || this.scene.researchManager?.isUnlocked(CONFIG.CABLES.FIBER.UNLOCK_REQUIRED);
        if (!fiberUnlocked) {
            this.uiManager.selectBuilding('BASIC');
            return;
        }

        this.uiManager.mobileCableMenu?.classList.toggle('open');
    }

    cancelAction(): void {
        this.uiManager.mobileCableMenu?.classList.remove('open');
        this.uiManager.mobileActionStatus = null;
        if (this.uiManager.selectedBuildingType === 'REMOVE' || this.uiManager.selectedBuildingType === 'BASIC' || this.uiManager.selectedBuildingType === 'FIBER') {
            this.uiManager.selectBuilding(this.uiManager.previousBuildSelection || 'DATA_DOWNLOADER');
        } else {
            this.updateBuildSummary();
            this.updateControls();
        }
    }

    setActionStatus(status: string | null): void {
        this.uiManager.mobileActionStatus = status;
        this.updateBuildSummary();
        this.updateControls();
    }

    updateControls(): void {
        const activeMap: Record<string, boolean> = {
            remove: this.uiManager.selectedBuildingType === 'REMOVE',
            cable: this.uiManager.selectedBuildingType === 'BASIC' || this.uiManager.selectedBuildingType === 'FIBER',
            defense: Boolean(this.scene.showDefenseRange),
            power: Boolean(this.scene.showPowerGrid)
        };

        Object.entries(activeMap).forEach(([id, active]) => {
            const btn = document.getElementById(`mobile-action-${id}`);
            if (btn) btn.classList.toggle('active', active);
        });
    }

    updateBuildSummary(): void {
        const summary = this.uiManager.mobileBuildSummary;
        if (!summary) return;

        const type = this.uiManager.selectedBuildingType;
        const data = CONFIG.BUILDINGS[type] || CONFIG.CABLES[type];
        if (!data) {
            summary.textContent = type === 'REMOVE' ? t('action.removeMode') : '';
            return;
        }

        const cost = 'COST' in data && data.COST
            ? data.COST.map(c => `${c.amount} ${getItemName(c.resource)}`).join(', ')
            : 'COST_PER_TILE' in data && data.COST_PER_TILE
                ? t('action.costPerTile', { amount: data.COST_PER_TILE })
                : '';
        summary.innerHTML = `
            <strong>${CONFIG.BUILDINGS[type] ? getBuildingName(type) : getCableName(type)}</strong>
            <span>${this.uiManager.mobileActionStatus || cost || t('action.noCost')}</span>
        `;
    }
}
