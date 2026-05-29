import { CONFIG, CORE_KEY } from '../config';
import EventBus from './EventBus';
import { CoreDataEvent, PowerUpdateData } from '../types';
import type MainScene from '../scenes/MainScene';
import ModelTrainingLab from '../buildings/ModelTrainingLab';
import TrainingLabUI from './TrainingLabUI';
import ResearchUI from './ResearchUI';
import SettingsUI from './SettingsUI';
import MobileUIManager from './MobileUIManager';
import {
    getBuildingName,
    getCableName,
    getItemName,
    t,
    textForKey,
    translateStaticDom,
    type TranslationKey
} from '../i18n';
import type { WaveBriefing } from '../utils/waveSimulation';
import { createWaveBriefing } from '../utils/waveSimulation';
import type { WaveResultSummary } from '../utils/waveResultSummary';
import { getObjectiveState, shouldHideEarlyAdvancedSystem } from '../utils/progressionGates';
import { createRunResultSummary } from '../utils/runResultSummary';
import Core from '../buildings/Core';

export default class UIManager {
    scene: MainScene;
    selectedBuildingType: string;
    buttons: Record<string, HTMLButtonElement>;
    activeCategory: string;
    currentTabBuildings: string[];
    scoreEl: HTMLElement | null;
    packetsEl: HTMLElement | null;
    powerEl: HTMLElement | null;
    waveEl: HTMLElement | null;
    waveTimerEl: HTMLElement | null;
    siliconEl: HTMLElement | null;
    objectiveTitleEl: HTMLElement | null;
    objectiveDetailEl: HTMLElement | null;
    waveTitleEl: HTMLElement | null;
    waveDetailEl: HTMLElement | null;
    waveRecommendationEl: HTMLElement | null;
    defenseTitleEl: HTMLElement | null;
    defenseDetailEl: HTMLElement | null;
    powerStatusChipEl: HTMLElement | null;
    hotkeys: string[];
    lastItemCount: number;
    lastScore: number;
    activeResearchTab: 'RESEARCH' | 'DEFENSE';
    previousBuildSelection: string;
    buildableData: Record<string, any>;
    mobileActionBar: HTMLElement | null;
    mobileInfoSheet: HTMLElement | null;
    mobileBuildSummary: HTMLElement | null;
    mobileCableMenu: HTMLElement | null;
    mobileActionStatus: string | null;
    activeTrainingLab: ModelTrainingLab | null;
    currentWaveBriefing: WaveBriefing | null;
    lastPowerData: PowerUpdateData | null;
    trainingLabUI: TrainingLabUI;
    researchUI: ResearchUI;
    settingsUI: SettingsUI;
    mobileUI: MobileUIManager;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.selectedBuildingType = 'DATA_DOWNLOADER';
        this.buttons = {};
        this.activeCategory = 'EXTRACTION';
        this.currentTabBuildings = [];
        this.buildableData = {};

        this.scoreEl = document.getElementById('hud-score');
        this.packetsEl = document.getElementById('hud-packets');
        this.powerEl = document.getElementById('hud-power');
        this.waveEl = document.getElementById('hud-wave');
        this.waveTimerEl = document.getElementById('hud-wave-timer');
        this.siliconEl = document.getElementById('hud-silicon');
        this.objectiveTitleEl = document.getElementById('current-objective-title');
        this.objectiveDetailEl = document.getElementById('current-objective-detail');
        this.waveTitleEl = document.getElementById('next-wave-title');
        this.waveDetailEl = document.getElementById('next-wave-detail');
        this.waveRecommendationEl = document.getElementById('next-wave-recommendation');
        this.defenseTitleEl = document.getElementById('defense-status-title');
        this.defenseDetailEl = document.getElementById('defense-status-detail');
        this.powerStatusChipEl = document.getElementById('power-status-chip');

        this.hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
        this.lastItemCount = -1;
        this.lastScore = -1;
        this.activeResearchTab = 'RESEARCH';
        this.previousBuildSelection = this.selectedBuildingType;
        this.mobileActionBar = null;
        this.mobileInfoSheet = null;
        this.mobileBuildSummary = null;
        this.mobileCableMenu = null;
        this.mobileActionStatus = null;
        this.activeTrainingLab = null;
        this.currentWaveBriefing = createWaveBriefing(scene.waveManager.currentWave + 1, scene.difficultyId);
        this.lastPowerData = null;
        this.trainingLabUI = new TrainingLabUI(scene, this);
        this.researchUI = new ResearchUI(scene, this);
        this.settingsUI = new SettingsUI(scene, this);
        this.mobileUI = new MobileUIManager(scene, this);

        // Note: createBuildingButtons is now called by MainScene after ResearchManager is initialized
        this.setupEvents();
        this.showTacticalPanels();
    }

    setupEvents(): void {
        EventBus.on('CORE_DATA_RECEIVED', (data: CoreDataEvent) => {
            if (this.scoreEl && this.lastScore !== data.total) {
                this.lastScore = data.total;
                this.scoreEl.innerText = String(data.total);
            }
        }, 'UIManager');

        EventBus.on('POWER_UPDATED', (data: PowerUpdateData) => {
            this.lastPowerData = data;
            if (this.powerEl) {
                const isDeficit = data.isBlackout || data.net < 0;
                const networkText = data.networks ? ` | ${data.networks.length} grids` : '';
                this.powerEl.innerText = `${data.production} / ${data.consumption} W${networkText}`;
                this.powerEl.style.color = isDeficit ? '#ef4444' : '#fde047';
                this.powerEl.style.textShadow = isDeficit ? '0 0 10px #ef4444' : '0 0 10px #fde047';
            }
            this.renderPowerStatus();
        }, 'UIManager');

        EventBus.on('WAVE_STARTED', ({ wave }: { wave: number }) => {
            if (this.waveEl) this.waveEl.innerText = String(wave);
            if (this.waveTimerEl) this.waveTimerEl.innerText = t('hud.waveActive');
            this.logMessage(t('log.waveIncoming', { wave }), true);
        }, 'UIManager');

        EventBus.on('WAVE_BRIEFING_UPDATED', (briefing: WaveBriefing) => {
            this.currentWaveBriefing = briefing;
            this.renderWaveBriefing();
        }, 'UIManager');

        EventBus.on('WAVE_UPDATE', ({ timer }: { timer: number }) => {
            this.renderWaveBriefing(timer);
        }, 'UIManager');

        EventBus.on('WAVE_ENDED', () => {
            this.createBuildingButtons();
            this.renderTacticalPanels();
            this.logMessage(textForKey('log.labAvailable'));
        }, 'UIManager');

        EventBus.on('GAME_OVER', () => {
            const gameOverScreen = document.getElementById('game-over-screen');
            if (gameOverScreen) gameOverScreen.style.display = 'flex';
            this.renderGameOverStats();

            const btnRestart = document.getElementById('btn-restart');
            if (btnRestart) {
                btnRestart.onclick = () => window.location.reload();
            }
        }, 'UIManager');

        this.scene.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
            const key = event.key;
            if (this.hotkeys.includes(key)) {
                const index = parseInt(key) - 1;
                if (index < this.currentTabBuildings.length) {
                    this.selectBuilding(this.currentTabBuildings[index]);
                }
            } else if (key === 'Delete' || key === 'Backspace' || key === '0') {
                this.selectBuilding('REMOVE');
            } else if (key === 'Escape') {
                const modalSettings = document.getElementById('settings-modal');
                const modalResearch = document.getElementById('research-modal');
                const modalTrainingLab = document.getElementById('training-lab-modal');
                if (modalSettings) modalSettings.style.display = 'none';
                if (modalResearch) modalResearch.style.display = 'none';
                if (modalTrainingLab) modalTrainingLab.style.display = 'none';
                this.restoreCanvasFocus();
            }
        });

        EventBus.on('GAME_SPEED_CHANGED', ({ speed }: { speed: number }) => {
            [1, 2, 3].forEach(s => {
                const btn = document.getElementById(`btn-speed-${s}`);
                if (btn) btn.classList.toggle('active', s === speed);
            });
        }, 'UIManager');

        this.setupSettingsUI();
        this.setupResearchUI();
        this.setupMobileUI();
        this.setupTrainingLabUI();
        translateStaticDom();
        window.addEventListener('languagechange', () => {
            translateStaticDom();
            this.createBuildingButtons();
            this.renderResearchTree();
            this.setupMobileUI();
            this.updateSelectedToolPanel();
            this.updateMobileBuildSummary();
            this.updateMobileControls();
            this.renderTacticalPanels();
        });
    }

    private renderWaveBriefing(timer?: number): void {
        if (!this.waveTimerEl) return;
        if (!this.currentWaveBriefing) {
            if (typeof timer === 'number') this.waveTimerEl.innerText = `${Math.ceil(timer / 1000)}s`;
            return;
        }

        const countdown = typeof timer === 'number' ? `${Math.max(0, Math.ceil(timer / 1000))}s` : null;
        const routeText = this.currentWaveBriefing.routeNames.join(' + ');
        const specialText = this.currentWaveBriefing.special ? ` | ${this.currentWaveBriefing.special}` : '';
        this.waveTimerEl.innerText = countdown || t('hud.waveActive');

        if (this.waveTitleEl) {
            this.waveTitleEl.innerText = `Wave ${this.currentWaveBriefing.wave}`;
        }
        if (this.waveDetailEl) {
            this.waveDetailEl.innerText = `${routeText} | ${this.currentWaveBriefing.threat}${specialText}`;
        }
        if (this.waveRecommendationEl) {
            this.waveRecommendationEl.innerText = this.currentWaveBriefing.recommendedDefense;
        }
    }

    showTacticalPanels(): void {
        ['mission-panel', 'threat-panel', 'systems-panel'].forEach(id => {
            const panel = document.getElementById(id);
            if (panel) panel.style.display = 'block';
        });
        this.renderTacticalPanels();
    }

    renderTacticalPanels(): void {
        this.renderCurrentObjective();
        this.renderWaveBriefing();
        this.renderDefenseStatus();
        this.renderPowerStatus();
        this.researchUI.updateResearchButtonVisibility();
    }

    showWaveResultSummary(summary: WaveResultSummary): void {
        const container = document.getElementById('notification-container');
        if (!container) {
            this.logMessage(t('waveSummary.log', {
                wave: summary.wave,
                data: summary.dataProcessed,
                integrity: summary.coreHpPercent
            }));
            return;
        }

        const card = document.createElement('div');
        card.className = 'wave-result-card glass-panel';
        card.innerHTML = `
            <div class="wave-result-kicker">${t('waveSummary.kicker')}</div>
            <div class="wave-result-title">${t('waveSummary.title', { wave: summary.wave })}</div>
            <div class="wave-result-grid">
                <span>${t('waveSummary.destroyed', { count: summary.enemiesDestroyed })}</span>
                <span>${t('waveSummary.data', { amount: summary.dataProcessed })}</span>
                <span>${t('waveSummary.integrity', { percent: summary.coreHpPercent, damage: summary.coreDamage })}</span>
                <span>${t('waveSummary.buildings', { destroyed: summary.buildingsDestroyed, damaged: summary.buildingsDamaged })}</span>
            </div>
        `;
        container.appendChild(card);
        this.logMessage(t('waveSummary.log', {
            wave: summary.wave,
            data: summary.dataProcessed,
            integrity: summary.coreHpPercent
        }));

        setTimeout(() => {
            if (card.parentNode === container) container.removeChild(card);
        }, 7000);
    }

    private renderGameOverStats(): void {
        const statsEl = document.getElementById('game-over-stats');
        if (!statsEl) return;
        const core = this.scene.buildingManager.get(CORE_KEY);
        const coreBuilding = core instanceof Core ? core : null;
        const summary = createRunResultSummary({
            wave: this.scene.waveManager.currentWave,
            coreHp: coreBuilding?.hp ?? 0,
            coreMaxHp: coreBuilding?.maxHp ?? 1,
            totalDataReceived: coreBuilding?.totalDataReceived ?? 0,
            unlockedResearchCount: this.scene.researchManager?.getUnlockedResearch().length ?? 0,
            modelStates: this.scene.defenseModelStates,
            getModelName: getBuildingName
        });

        statsEl.innerHTML = `
            <div>${textForKey('gameOver.stat.wave', { wave: summary.wave })}</div>
            <div>${textForKey('gameOver.stat.core', { percent: summary.coreHpPercent })}</div>
            <div>${textForKey('gameOver.stat.data', { amount: summary.totalDataReceived })}</div>
            <div>${textForKey('gameOver.stat.research', { count: summary.unlockedResearchCount })}</div>
            <div>${textForKey('gameOver.stat.model', {
                name: summary.bestModelName,
                confidence: summary.bestModelAccuracy,
                damage: summary.bestModelDamageBonus,
                version: summary.bestModelVersion
            })}</div>
        `;
    }

    hasFirstDefenseSuccess(): boolean {
        const waveManager = this.scene.waveManager;
        if (!waveManager) return false;
        return waveManager.currentWave > 1 || (waveManager.currentWave >= 1 && !waveManager.waveActive);
    }

    private countBuildings(types: string[]): number {
        let count = 0;
        this.scene.buildingManager?.forEach(building => {
            if (types.includes(building.type)) count++;
        });
        return count;
    }

    private renderCurrentObjective(): void {
        if (!this.objectiveTitleEl || !this.objectiveDetailEl) return;

        const hasDownloader = this.countBuildings(['DATA_DOWNLOADER']) > 0;
        const hasProcessor = this.countBuildings(['PROCESSOR', 'WEIGHT_TRAINER']) > 0;
        const hasDefense = this.countBuildings(['CLASSIFIER', 'FILTER', 'FIREWALL']) > 0;
        const firstDefenseDone = this.hasFirstDefenseSuccess();
        const modelLabs: ModelTrainingLab[] = [];
        this.scene.buildingManager?.forEach(building => {
            if (building instanceof ModelTrainingLab) modelLabs.push(building);
        });
        const state = getObjectiveState({
            hasDownloader,
            hasProcessor,
            hasDefense,
            firstDefenseDone,
            productionCount: this.countBuildings(['DATA_DOWNLOADER', 'PROCESSOR', 'WEIGHT_TRAINER', 'NEURAL_TRAINER', 'MODEL_TRAINING_LAB']),
            defenseCount: this.countBuildings(['CLASSIFIER', 'FILTER', 'FIREWALL']),
            hasModelTrainingLab: modelLabs.length > 0,
            hasModelTrainingTarget: modelLabs.some(lab => Boolean(lab.targetType))
        });

        this.objectiveTitleEl.innerText = textForKey(state.titleKey);
        this.objectiveDetailEl.innerText = textForKey(state.detailKey);
    }

    private renderDefenseStatus(): void {
        if (!this.defenseTitleEl || !this.defenseDetailEl) return;

        const defenseTypes = ['CLASSIFIER', 'FILTER', 'FIREWALL'];
        const counts = defenseTypes.map(type => ({
            type,
            name: getBuildingName(type),
            count: this.countBuildings([type]),
            state: this.scene.getDefenseModelState(type)
        }));
        const total = counts.reduce((sum, entry) => sum + entry.count, 0);

        if (total === 0) {
            this.defenseTitleEl.innerText = textForKey('defenseStatus.empty.title');
            this.defenseDetailEl.innerText = textForKey('defenseStatus.empty.detail');
            return;
        }

        this.defenseTitleEl.innerText = textForKey('defenseStatus.ready.title', { count: total });
        const lines = counts
            .filter(entry => entry.count > 0)
            .map(entry => `${entry.name} x${entry.count} | ${Math.round(entry.state.modelAccuracy)}% | DMG +${Math.round(entry.state.damageBonus)}%`);
        const activeLab = this.findActiveModelTrainingLab();
        if (activeLab?.targetType) {
            const state = this.scene.getDefenseModelState(activeLab.targetType);
            lines.push(textForKey('defenseStatus.training', {
                name: getBuildingName(activeLab.targetType),
                confidence: Math.round(state.modelAccuracy),
                version: state.modelVersion
            }));
        }
        this.defenseDetailEl.innerText = lines.join('\n');
    }

    private findActiveModelTrainingLab(): ModelTrainingLab | null {
        let activeLab: ModelTrainingLab | null = null;
        this.scene.buildingManager?.forEach(building => {
            if (!activeLab && building instanceof ModelTrainingLab) activeLab = building;
        });
        return activeLab;
    }

    private renderPowerStatus(): void {
        if (!this.powerStatusChipEl) return;
        const data = this.lastPowerData;
        this.powerStatusChipEl.classList.remove('panel-chip-danger', 'panel-chip-warning');

        if (!data) {
            this.powerStatusChipEl.innerText = textForKey('powerStatus.core');
            this.powerStatusChipEl.classList.add('panel-chip-warning');
            return;
        }

        if (data.isBlackout || data.net < 0) {
            this.powerStatusChipEl.innerText = textForKey('powerStatus.blackout', { net: data.net });
            this.powerStatusChipEl.classList.add('panel-chip-danger');
        } else {
            this.powerStatusChipEl.innerText = textForKey('powerStatus.stable', { net: data.net });
        }
    }

    guardDomPointer(element: HTMLElement | null): void {
        if (!element || element.dataset.pointerGuarded === 'true') return;
        element.dataset.pointerGuarded = 'true';
        ['pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(eventName => {
            element.addEventListener(eventName, event => {
                event.stopPropagation();
            }, { passive: false });
        });
    }

    setupMobileUI(): void {
        this.mobileUI.setup();
    }

    renderMobileCableMenu(): void {
        this.mobileUI.renderCableMenu();
    }

    openMobileCableMenu(): void {
        this.mobileUI.openCableMenu();
    }

    setupResearchUI(): void {
        this.researchUI.setup();
    }

    renderResearchTree(): void {
        this.researchUI.render();
    }
    getResearchEffectSummary(researchId: string): string {
        return this.researchUI.getEffectSummary(researchId);
    }

    setupSettingsUI(): void {
        this.settingsUI.setup();
    }

    createBuildingButtons(): void {
        const overlay = document.getElementById('ui-overlay');
        const tabsContainer = document.getElementById('ui-tabs');
        if (!overlay || !tabsContainer) return;
        this.guardDomPointer(overlay);
        this.guardDomPointer(tabsContainer);

        // Render Tabs
        tabsContainer.innerHTML = '';
        const categories = [
            { id: 'EXTRACTION', name: '추출' },
            { id: 'LOGISTICS', name: '물류' },
            { id: 'PRODUCTION', name: '생산' },
            { id: 'POWER', name: '전력' },
            { id: 'DEFENSE', name: '방어' }
        ];

        categories.forEach(cat => {
            cat.name = textForKey(`category.${cat.id}`);
            const tabBtn = document.createElement('button');
            tabBtn.className = `tab-btn ${this.activeCategory === cat.id ? 'active' : ''}`;
            tabBtn.innerText = cat.name;
            this.guardDomPointer(tabBtn);
            tabBtn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                this.activeCategory = cat.id;
                this.createBuildingButtons();
            };
            tabsContainer.appendChild(tabBtn);
        });

        overlay.innerHTML = '';
        this.buttons = {};
        this.currentTabBuildings = [];
        this.buildableData = {};

        let index = 0;
        const mainScene = this.scene;
        const rm = mainScene.researchManager;
        const tm = mainScene.tutorialManager;
        const allowed = tm && !tm.isCompleted() ? tm.getAllowedBuildings() : null;

        const buildables: Record<string, any> = { ...CONFIG.BUILDINGS };
        if (CONFIG.CABLES) {
            Object.entries(CONFIG.CABLES).forEach(([k, v]) => {
                buildables[k] = {
                    ...v,
                    CATEGORY: 'LOGISTICS',
                    COST: v.COST_PER_TILE ? [{ resource: 'SILICON', amount: v.COST_PER_TILE }] : []
                };
            });
        }

        Object.entries(buildables).forEach(([key, data]) => {
            this.buildableData[key] = data;
            if (shouldHideEarlyAdvancedSystem(key, this.hasFirstDefenseSuccess())) {
                return;
            }
            if (key === 'GPU_CLUSTER' && !this.scene.isGpuUnlocked()) {
                return;
            }

            // Check Category
            if (data.CATEGORY !== this.activeCategory && data.CATEGORY !== 'ALL') {
                return;
            }

            // Check Unlock Required
            if (data.UNLOCK_REQUIRED && rm && !rm.isUnlocked(data.UNLOCK_REQUIRED)) {
                return;
            }

            this.currentTabBuildings.push(key);

            const isLocked = allowed !== null && !allowed.includes(key);

            const btn = document.createElement('button');
            btn.id = `btn-${key.toLowerCase()}`;
            btn.className = 'build-btn';
            btn.type = 'button';
            if (key === this.selectedBuildingType) btn.classList.add('active');
            if (isLocked) {
                btn.classList.add('build-btn-locked');
                btn.style.opacity = '0.22';
                btn.style.cursor = 'not-allowed';
                btn.disabled = true;
            }

            const icon = document.createElement('div');
            icon.className = 'build-swatch icon';
            icon.style.background = `#${data.COLOR.toString(16).padStart(6, '0')}`;

            if (index < this.hotkeys.length) {
                const hotkeyLabel = document.createElement('div');
                hotkeyLabel.className = 'hotkey-label';
                hotkeyLabel.innerText = this.hotkeys[index];
                btn.appendChild(hotkeyLabel);
            }

            btn.appendChild(icon);

            const label = document.createElement('span');
            label.className = 'build-label';
            label.innerText = CONFIG.BUILDINGS[key] ? getBuildingName(key) : getCableName(key);
            btn.appendChild(label);

            // Show cost if defined
            const costLabel = document.createElement('span');
            costLabel.className = 'build-cost';
            if (data.COST && data.COST.length > 0) {
                costLabel.innerText = data.COST.map((c: any) => `${c.amount} ${getItemName(c.resource)}`).join(', ');
            } else {
                costLabel.innerText = textForKey('action.noCost');
            }
            btn.appendChild(costLabel);

            this.guardDomPointer(btn);
            btn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                this.selectBuilding(key);
            };
            overlay.appendChild(btn);
            this.buttons[key] = btn;
            index++;
        });

        // Remove button is always available at index 0 (key '0')
        const isRemoveLocked = allowed !== null && !allowed.includes('REMOVE');
        const removeBtn = document.createElement('button');
        removeBtn.id = 'btn-remove';
        removeBtn.className = 'build-btn';
        removeBtn.type = 'button';
        if (this.selectedBuildingType === 'REMOVE') removeBtn.classList.add('active');
        if (isRemoveLocked) {
            removeBtn.classList.add('build-btn-locked');
            removeBtn.style.opacity = '0.22';
            removeBtn.style.cursor = 'not-allowed';
            removeBtn.disabled = true;
        }
        removeBtn.innerHTML = `
            <div class="hotkey-label">0</div>
            <div class="build-swatch icon" style="background:#2b3038; border:1px solid #ff6676"></div>
            <span class="build-label">${textForKey('action.remove')}</span>
            <span class="build-cost">${textForKey('action.removeMode')}</span>
        `;
        this.guardDomPointer(removeBtn);
        removeBtn.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            this.selectBuilding('REMOVE');
        };
        overlay.appendChild(removeBtn);
        this.buttons['REMOVE'] = removeBtn;

        this.updateSelectedToolPanel();
        this.updateMobileBuildSummary();
        this.updateMobileControls();
    }

    selectBuilding(type: string): void {
        if (type !== 'REMOVE' && type !== 'BASIC' && type !== 'FIBER') {
            this.previousBuildSelection = type;
        }
        this.selectedBuildingType = type;
        Object.entries(this.buttons).forEach(([key, btn]) => {
            btn.classList.toggle('active', key === type);
        });
        this.mobileCableMenu?.classList.remove('open');
        this.updateSelectedToolPanel();
        this.updateMobileBuildSummary();
        this.updateMobileControls();
        EventBus.emit('BUILDING_SELECTED', { type });
    }

    private getBuildableData(type: string): any {
        if (type === 'REMOVE') return null;
        return this.buildableData[type] || CONFIG.BUILDINGS[type] || CONFIG.CABLES[type];
    }

    private getSelectedToolName(): string {
        if (this.selectedBuildingType === 'REMOVE') return textForKey('action.removeMode');
        if (CONFIG.BUILDINGS[this.selectedBuildingType]) return getBuildingName(this.selectedBuildingType);
        if (CONFIG.CABLES[this.selectedBuildingType]) return getCableName(this.selectedBuildingType);
        return this.selectedBuildingType;
    }

    private getSelectedToolCost(): string {
        if (this.selectedBuildingType === 'REMOVE') return textForKey('action.noCost');
        const data = this.getBuildableData(this.selectedBuildingType);
        if (!data) return '';
        if (data.COST && data.COST.length > 0) {
            return data.COST.map((c: any) => `${c.amount} ${getItemName(c.resource)}`).join(', ');
        }
        if (data.COST_PER_TILE) {
            return textForKey('action.costPerTile', { amount: data.COST_PER_TILE });
        }
        return textForKey('action.noCost');
    }

    private updateSelectedToolPanel(): void {
        const nameEl = document.getElementById('selected-tool-name');
        const costEl = document.getElementById('selected-tool-cost');
        const hintEl = document.getElementById('selected-tool-hint');
        if (nameEl) nameEl.innerText = this.getSelectedToolName();
        if (costEl) costEl.innerText = this.getSelectedToolCost();
        if (hintEl) {
            hintEl.innerText = this.selectedBuildingType === 'REMOVE'
                ? textForKey('build.removeHint')
                : textForKey('build.defaultHint');
        }
    }

    cancelMobileAction(): void {
        this.mobileUI.cancelAction();
    }

    setMobileActionStatus(status: string | null): void {
        this.mobileUI.setActionStatus(status);
    }

    updateMobileControls(): void {
        this.mobileUI.updateControls();
    }

    setupTrainingLabUI(): void {
        this.trainingLabUI.setup();
    }

    openTrainingLab(lab: ModelTrainingLab): void {
        this.trainingLabUI.open(lab);
    }

    renderTrainingLab(): void {
        this.trainingLabUI.render();
    }

    updateMobileBuildSummary(): void {
        this.mobileUI.updateBuildSummary();
    }

    update(itemCount: number): void {
        if (this.packetsEl && this.lastItemCount !== itemCount) {
            this.lastItemCount = itemCount;
            this.packetsEl.innerText = String(itemCount);
        }

        // Update silicon count from InventoryManager
        if (this.siliconEl) {
            const mainScene = this.scene;
            if (mainScene.inventoryManager) {
                const siliconCount = mainScene.inventoryManager.getResourceCount('SILICON');
                this.siliconEl.innerText = String(siliconCount);
            }
        }

        this.renderCurrentObjective();
        this.renderDefenseStatus();
    }

    showTooltip(x: number, y: number, title: string, content: string): void {
        if (document.body.classList.contains('mobile-layout')) {
            const tooltip = document.getElementById('tooltip');
            if (tooltip) tooltip.style.display = 'none';
            if (this.mobileInfoSheet) {
                this.mobileInfoSheet.style.display = 'block';
                this.mobileInfoSheet.innerHTML = this.formatMobileInfo(title, content);
            }
            return;
        }

        const tooltip = document.getElementById('tooltip');
        if (!tooltip) return;
        tooltip.style.display = 'block';
        tooltip.innerHTML = `<div class="tooltip-title">${title}</div><div>${content}</div>`;
        tooltip.style.left = '0px';
        tooltip.style.top = '0px';

        const rect = tooltip.getBoundingClientRect();
        const margin = 12;
        const offset = 15;
        let left = x + offset;
        let top = y + offset;
        const bottomUi = document.getElementById('bottom-ui-container')?.getBoundingClientRect();

        if (left + rect.width > window.innerWidth - margin) {
            left = x - rect.width - offset;
        }
        if (top + rect.height > window.innerHeight - margin) {
            top = y - rect.height - offset;
        }
        if (bottomUi && top + rect.height > bottomUi.top - margin && y < bottomUi.top) {
            top = bottomUi.top - rect.height - margin;
        }

        tooltip.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin))}px`;
        tooltip.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin))}px`;
    }

    hideTooltip(): void {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) tooltip.style.display = 'none';
        if (this.mobileInfoSheet) this.mobileInfoSheet.style.display = 'none';
    }

    restoreCanvasFocus(): void {
        const canvas = document.querySelector<HTMLCanvasElement>('#game-container canvas');
        if (!canvas) return;
        if (canvas.tabIndex < 0) canvas.tabIndex = 0;
        requestAnimationFrame(() => canvas.focus({ preventScroll: true }));
    }

    formatMobileInfo(title: string, content: string): string {
        const lines = content.split('\n').filter(Boolean);
        const tags: string[] = [];
        const details: string[] = [];
        const findLine = (...labels: string[]) => lines.find(line => labels.some(label => line.startsWith(`${label}:`)));

        const powerLine = findLine('Power', textForKey('tooltip.power'));
        if (powerLine) {
            tags.push(powerLine.includes('OK') || powerLine.includes(textForKey('tooltip.powerOk')) ? 'POWER OK' : 'NO POWER');
        }

        const inputLine = findLine('Input Buffer', textForKey('tooltip.inputBuffer'));
        const outputLine = findLine('Output Buffer', textForKey('tooltip.outputBuffer'));
        const defenseBufferLine = lines.find(line => line.startsWith('Buffer:'));
        const statusLine = findLine('Status', textForKey('tooltip.status'));
        const ammoLine = lines.find(line => line.startsWith('Ammo:'));
        const recipeLine = findLine('Recipe', textForKey('tooltip.recipe'));
        const networkLine = findLine('Network Power', textForKey('tooltip.networkPower'));

        if (statusLine?.includes('Processing') || statusLine?.includes(textForKey('tooltip.processing'))) tags.push('PROCESSING');
        if (inputLine) {
            details.push(inputLine);
            const match = inputLine.match(/(\d+)\s*\/\s*(\d+)/);
            if (match && match[1] === match[2]) tags.push('INPUT FULL');
        }
        if (outputLine) {
            details.push(outputLine);
            const match = outputLine.match(/(\d+)\s*\/\s*(\d+)/);
            if (match && match[1] === match[2]) tags.push('OUTPUT FULL');
        }
        if (defenseBufferLine) {
            details.push(defenseBufferLine);
            const match = defenseBufferLine.match(/(\d+)\s*\/\s*(\d+)/);
            if (ammoLine && match && Number(match[1]) === 0 && !ammoLine.includes('None')) tags.push('NO AMMO');
        }
        if (networkLine) details.push(networkLine);
        if (recipeLine) details.push(recipeLine);

        const tagHtml = tags.length
            ? `<div class="mobile-status-tags">${tags.map(tag => `<span>${tag}</span>`).join('')}</div>`
            : '';
        const detailHtml = details.slice(0, 3).map(line => `<div>${line}</div>`).join('');

        return `<div class="tooltip-title">${title}</div>${tagHtml}<div>${detailHtml || lines[0] || ''}</div>`;
    }

    logMessage(message: string, isAlert: boolean = false): void {
        const logContainer = document.getElementById('activity-log');
        if (!logContainer) return;

        const entry = document.createElement('div');
        entry.className = 'log-entry';
        if (isAlert) {
            entry.style.borderLeftColor = '#ff4444';
            entry.style.color = '#ffaaaa';
        }
        entry.innerText = `> ${message}`;
        logContainer.appendChild(entry);

        setTimeout(() => {
            if (entry.parentNode === logContainer) {
                logContainer.removeChild(entry);
            }
        }, 5000);
    }

    getSelectedBuildingType(): string {
        return this.selectedBuildingType;
    }

    getText(key: TranslationKey, values: Record<string, string | number> = {}): string {
        return t(key, values);
    }

    getDynamicText(key: string, values: Record<string, string | number> = {}): string {
        return textForKey(key, values);
    }
}
