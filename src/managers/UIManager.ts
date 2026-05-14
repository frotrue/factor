import Phaser from 'phaser';
import { CONFIG } from '../config';
import EventBus from './EventBus';
import { CoreDataEvent, PowerUpdateData } from '../types';
import type MainScene from '../scenes/MainScene';
import ModelTrainingLab from '../buildings/ModelTrainingLab';

export default class UIManager {
    scene: Phaser.Scene;
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
    hotkeys: string[];
    lastItemCount: number;
    lastScore: number;
    activeResearchTab: 'RESEARCH' | 'DEFENSE';
    previousBuildSelection: string;
    mobileActionBar: HTMLElement | null;
    mobileInfoSheet: HTMLElement | null;
    mobileBuildSummary: HTMLElement | null;
    mobileCableMenu: HTMLElement | null;
    mobileActionStatus: string | null;
    activeTrainingLab: ModelTrainingLab | null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.selectedBuildingType = 'DATA_DOWNLOADER';
        this.buttons = {};
        this.activeCategory = 'EXTRACTION';
        this.currentTabBuildings = [];

        this.scoreEl = document.getElementById('hud-score');
        this.packetsEl = document.getElementById('hud-packets');
        this.powerEl = document.getElementById('hud-power');
        this.waveEl = document.getElementById('hud-wave');
        this.waveTimerEl = document.getElementById('hud-wave-timer');
        this.siliconEl = document.getElementById('hud-silicon');

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

        // Note: createBuildingButtons is now called by MainScene after ResearchManager is initialized
        this.setupEvents();
    }

    setupEvents(): void {
        EventBus.on('CORE_DATA_RECEIVED', (data: CoreDataEvent) => {
            if (this.scoreEl && this.lastScore !== data.score) {
                this.lastScore = data.score;
                this.scoreEl.innerText = data.score.toFixed(2);
            }
        });

        EventBus.on('POWER_UPDATED', (data: PowerUpdateData) => {
            if (this.powerEl) {
                const isDeficit = data.isBlackout || data.net < 0;
                const networkText = data.networks ? ` | ${data.networks.length} grids` : '';
                this.powerEl.innerText = `${data.production} / ${data.consumption} W${networkText}`;
                this.powerEl.style.color = isDeficit ? '#ef4444' : '#fde047';
                this.powerEl.style.textShadow = isDeficit ? '0 0 10px #ef4444' : '0 0 10px #fde047';
            }
        });

        EventBus.on('WAVE_STARTED', ({ wave }: { wave: number }) => {
            if (this.waveEl) this.waveEl.innerText = String(wave);
            if (this.waveTimerEl) this.waveTimerEl.innerText = 'ACTIVE';
            this.logMessage(`System: Wave ${wave} incoming!`, true);
        });
        
        EventBus.on('WAVE_UPDATE', ({ timer }: { timer: number }) => {
            if (this.waveTimerEl) this.waveTimerEl.innerText = `${Math.ceil(timer/1000)}s`;
        });

        EventBus.on('GAME_OVER', () => {
            const gameOverScreen = document.getElementById('game-over-screen');
            if (gameOverScreen) gameOverScreen.style.display = 'flex';
            
            const btnRestart = document.getElementById('btn-restart');
            if (btnRestart) {
                btnRestart.onclick = () => window.location.reload();
            }
        });

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
                if (modalSettings) modalSettings.style.display = 'none';
                if (modalResearch) modalResearch.style.display = 'none';
            }
        });

        EventBus.on('GAME_SPEED_CHANGED', ({ speed }: { speed: number }) => {
            [1, 2, 3].forEach(s => {
                const btn = document.getElementById(`btn-speed-${s}`);
                if (btn) btn.classList.toggle('active', s === speed);
            });
        });

        this.setupSettingsUI();
        this.setupResearchUI();
        this.setupMobileUI();
        this.setupTrainingLabUI();
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
        this.mobileActionBar = document.getElementById('mobile-action-bar');
        if (!this.mobileActionBar) {
            this.mobileActionBar = document.createElement('div');
            this.mobileActionBar.id = 'mobile-action-bar';
            document.body.appendChild(this.mobileActionBar);
        }
        this.guardDomPointer(this.mobileActionBar);

        this.mobileCableMenu = document.getElementById('mobile-cable-menu');
        if (!this.mobileCableMenu) {
            this.mobileCableMenu = document.createElement('div');
            this.mobileCableMenu.id = 'mobile-cable-menu';
            this.mobileCableMenu.className = 'glass-panel';
            this.mobileActionBar.appendChild(this.mobileCableMenu);
        }
        this.guardDomPointer(this.mobileCableMenu);

        const actions = [
            { id: 'rotate', label: 'Rotate', handler: () => (this.scene as MainScene).rotateCursor() },
            { id: 'remove', label: 'Remove', handler: () => this.selectBuilding('REMOVE') },
            { id: 'cable', label: 'Cable', handler: () => this.openMobileCableMenu() },
            { id: 'cancel', label: 'Cancel', handler: () => (this.scene as MainScene).cancelCurrentAction() },
            { id: 'defense', label: 'Defense', handler: () => (this.scene as MainScene).toggleDefenseRange() },
            { id: 'power', label: 'Power', handler: () => (this.scene as MainScene).togglePowerGrid() }
        ];

        this.mobileActionBar.innerHTML = '';
        this.mobileActionBar.appendChild(this.mobileCableMenu);
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
            this.mobileActionBar!.appendChild(btn);
        });

        this.mobileInfoSheet = document.getElementById('mobile-info-sheet');
        if (!this.mobileInfoSheet) {
            this.mobileInfoSheet = document.createElement('div');
            this.mobileInfoSheet.id = 'mobile-info-sheet';
            this.mobileInfoSheet.className = 'glass-panel';
            document.body.appendChild(this.mobileInfoSheet);
        }
        this.guardDomPointer(this.mobileInfoSheet);

        this.mobileBuildSummary = document.getElementById('mobile-build-summary');
        if (!this.mobileBuildSummary) {
            this.mobileBuildSummary = document.createElement('div');
            this.mobileBuildSummary.id = 'mobile-build-summary';
            this.mobileBuildSummary.className = 'glass-panel';
            document.body.appendChild(this.mobileBuildSummary);
        }
        this.guardDomPointer(this.mobileBuildSummary);

        this.renderMobileCableMenu();
        this.updateMobileControls();
        this.updateMobileBuildSummary();
    }

    renderMobileCableMenu(): void {
        if (!this.mobileCableMenu) return;

        this.mobileCableMenu.innerHTML = '';
        (['BASIC', 'FIBER'] as const).forEach(type => {
            const cConfig = CONFIG.CABLES[type];
            const btn = document.createElement('button');
            btn.className = 'mobile-cable-option';
            btn.type = 'button';
            btn.textContent = cConfig.NAME.split('(')[0].trim() || type;
            btn.setAttribute('aria-label', cConfig.NAME);
            btn.addEventListener('pointerdown', event => {
                event.preventDefault();
                event.stopPropagation();
            });
            btn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                this.mobileCableMenu!.classList.remove('open');
                this.selectBuilding(type);
            };
            this.mobileCableMenu!.appendChild(btn);
        });
    }

    openMobileCableMenu(): void {
        const mainScene = this.scene as MainScene;
        const fiberUnlocked = !CONFIG.CABLES.FIBER.UNLOCK_REQUIRED || mainScene.researchManager?.isUnlocked(CONFIG.CABLES.FIBER.UNLOCK_REQUIRED);
        if (!fiberUnlocked) {
            this.selectBuilding('BASIC');
            return;
        }

        this.mobileCableMenu?.classList.toggle('open');
    }

    setupResearchUI(): void {
        const btnResearch = document.getElementById('btn-research');
        const modalResearch = document.getElementById('research-modal');
        const btnClose = document.getElementById('btn-close-research');
        const container = document.getElementById('research-tree-container');
        this.guardDomPointer(btnResearch);
        this.guardDomPointer(modalResearch);
        this.guardDomPointer(btnClose);
        this.guardDomPointer(container);

        if (btnResearch && modalResearch) {
            btnResearch.style.display = 'flex'; // Show research button
            btnResearch.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalResearch.style.display = 'flex';
                EventBus.emit('RESEARCH_OPENED');
                this.renderResearchTree();
            };
        }

        if (btnClose && modalResearch) {
            btnClose.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalResearch.style.display = 'none';
            };
        }

        EventBus.on('RESEARCH_UNLOCKED', () => {
            this.createBuildingButtons(); // Re-render build UI
            this.renderMobileCableMenu();
            if (modalResearch && modalResearch.style.display === 'flex') {
                this.renderResearchTree(); // Re-render tree if open
            }
        });
    }

    renderResearchTree(): void {
        const container = document.getElementById('research-tree-container');
        const scoreEl = document.getElementById('research-score');
        const mainScene = this.scene as MainScene;
        const rm = mainScene.researchManager;
        
        const coreBuilding = mainScene.buildingManager.get('0,0');
        const currentScore = coreBuilding ? (coreBuilding as any).confidenceScore : 0;
        
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
            { id: 'RESEARCH' as const, label: 'Research' },
            { id: 'DEFENSE' as const, label: 'Defense Upgrades' }
        ].forEach(tab => {
            const tabBtn = document.createElement('button');
            tabBtn.className = 'tab-btn';
            tabBtn.innerText = tab.label;
            tabBtn.classList.toggle('active', this.activeResearchTab === tab.id);
            this.guardDomPointer(tabBtn);
            tabBtn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                this.activeResearchTab = tab.id;
                this.renderResearchTree();
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
            if (this.activeResearchTab === 'DEFENSE' && !isDefenseNode) return;
            if (this.activeResearchTab === 'RESEARCH' && isDefenseNode) return;

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
            cost.innerText = `Cost: ${node.COST} CS`;
            cost.style.color = '#fde047';
            cost.style.fontSize = '14px';

            header.appendChild(title);
            header.appendChild(cost);
            
            const desc = document.createElement('div');
            const effectSummary = this.getResearchEffectSummary(node.ID);
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
                actionBtn.innerText = 'Unlocked';
                actionBtn.style.background = 'rgba(99, 102, 241, 0.3)';
                actionBtn.style.borderColor = '#6366f1';
                actionBtn.disabled = true;
            } else if (canUnlock) {
                actionBtn.innerText = 'Research';
                actionBtn.style.borderColor = '#fde047';
                this.guardDomPointer(actionBtn);
                actionBtn.onclick = event => {
                    event.preventDefault();
                    event.stopPropagation();
                    rm.unlock(node.ID);
                };
            } else {
                actionBtn.innerText = 'Locked';
                actionBtn.style.opacity = '0.5';
                actionBtn.disabled = true;
            }

            card.appendChild(header);
            card.appendChild(desc);
            card.appendChild(actionBtn);
            list.appendChild(card);
        });
    }

    getResearchEffectSummary(researchId: string): string {
        const summaries: Record<string, string> = {
            TECH_PRECISION_INFERENCE: 'Effect: Tower Damage +30%',
            TECH_DEFENSE_RANGE: 'Effect: Tower Range +1 tile',
            TECH_RAPID_RESPONSE: 'Effect: Fire Rate 20% faster',
            TECH_FIREWALL_HARDENING: 'Effect: Firewall HP +50%',
            TECH_AUTOMATED_DEFENSE: 'Effect: Unlocks Inference Unit production'
        };
        return summaries[researchId] || '';
    }

    setupSettingsUI(): void {
        const btnSettings = document.getElementById('btn-settings');
        const modalSettings = document.getElementById('settings-modal');
        const btnClose = document.getElementById('btn-close-settings');
        const btnSave = document.getElementById('btn-save');
        const btnLoad = document.getElementById('btn-load');
        const volumeInput = document.getElementById('audio-volume') as HTMLInputElement | null;
        const mutedInput = document.getElementById('audio-muted') as HTMLInputElement | null;
        const btnResetTutorial = document.getElementById('btn-reset-tutorial');
        const mainScene = this.scene as MainScene;
        const audioSettings = mainScene.soundManager?.getSettings?.();
        [
            btnSettings,
            modalSettings,
            btnClose,
            btnSave,
            btnLoad,
            volumeInput,
            mutedInput,
            btnResetTutorial
        ].forEach(element => this.guardDomPointer(element));

        if (volumeInput && audioSettings) volumeInput.value = String(Math.round(audioSettings.masterVolume * 100));
        if (mutedInput && audioSettings) mutedInput.checked = audioSettings.muted;

        if (btnSettings && modalSettings) {
            btnSettings.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalSettings.style.display = 'flex';
            };
        }

        if (btnClose && modalSettings) {
            btnClose.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalSettings.style.display = 'none';
            };
        }

        if (btnSave) btnSave.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            EventBus.emit('SAVE_REQUESTED');
        };
        if (btnLoad) btnLoad.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            EventBus.emit('LOAD_REQUESTED');
        };
        if (btnResetTutorial) {
            btnResetTutorial.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                EventBus.emit('TUTORIAL_RESET');
                this.logMessage('Tutorial: 안내를 다시 시작합니다.');
            };
        }

        const emitAudioSettings = () => {
            const volume = volumeInput ? Number(volumeInput.value) / 100 : audioSettings?.masterVolume ?? 0.6;
            const muted = mutedInput ? mutedInput.checked : audioSettings?.muted ?? false;
            EventBus.emit('AUDIO_SETTINGS_CHANGED', { masterVolume: volume, muted });
        };
        if (volumeInput) volumeInput.oninput = emitAudioSettings;
        if (mutedInput) mutedInput.onchange = emitAudioSettings;

        [1, 2, 3].forEach(speed => {
            const btn = document.getElementById(`btn-speed-${speed}`);
            if (btn) {
                this.guardDomPointer(btn);
                btn.onclick = event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const mainScene = this.scene as MainScene;
                    if (mainScene.setGameSpeed) {
                        mainScene.setGameSpeed(speed);
                    }
                };
            }
        });
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

        let index = 0;
        const mainScene = this.scene as MainScene;
        const rm = mainScene.researchManager;

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
            // Check Category
            if (data.CATEGORY !== this.activeCategory && data.CATEGORY !== 'ALL') {
                return;
            }

            // Check Unlock Required
            if (data.UNLOCK_REQUIRED && rm && !rm.isUnlocked(data.UNLOCK_REQUIRED)) {
                return;
            }

            this.currentTabBuildings.push(key);

            const btn = document.createElement('button');
            btn.id = `btn-${key.toLowerCase()}`;
            btn.className = 'build-btn';
            if (key === this.selectedBuildingType) btn.classList.add('active');

            const icon = document.createElement('div');
            icon.className = 'icon';
            icon.style.background = `#${data.COLOR.toString(16).padStart(6, '0')}`;

            const label = document.createTextNode(data.NAME.split('(')[0].trim());

            if (index < this.hotkeys.length) {
                const hotkeyLabel = document.createElement('div');
                hotkeyLabel.className = 'hotkey-label';
                hotkeyLabel.innerText = this.hotkeys[index];
                btn.appendChild(hotkeyLabel);
            }

            btn.appendChild(icon);
            btn.appendChild(label);

            // Show cost if defined
            if (data.COST && data.COST.length > 0) {
                const costLabel = document.createElement('div');
                costLabel.style.fontSize = '9px';
                costLabel.style.color = '#94a3b8';
                costLabel.style.marginTop = '2px';
                costLabel.innerText = data.COST.map((c: any) => `${c.amount} ${CONFIG.ITEMS[c.resource]?.NAME || c.resource}`).join(', ');
                btn.appendChild(costLabel);
            }

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
        const removeBtn = document.createElement('button');
        removeBtn.id = 'btn-remove';
        removeBtn.className = 'build-btn';
        if (this.selectedBuildingType === 'REMOVE') removeBtn.classList.add('active');
        removeBtn.innerHTML = `
            <div class="hotkey-label">0</div>
            <div class="icon" style="background:#444; border:1px solid #ff4444"></div>
            철거
        `;
        this.guardDomPointer(removeBtn);
        removeBtn.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            this.selectBuilding('REMOVE');
        };
        overlay.appendChild(removeBtn);
        this.buttons['REMOVE'] = removeBtn;

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
        this.updateMobileBuildSummary();
        this.updateMobileControls();
        EventBus.emit('BUILDING_SELECTED', { type });
    }

    cancelMobileAction(): void {
        this.mobileCableMenu?.classList.remove('open');
        this.mobileActionStatus = null;
        if (this.selectedBuildingType === 'REMOVE' || this.selectedBuildingType === 'BASIC' || this.selectedBuildingType === 'FIBER') {
            this.selectBuilding(this.previousBuildSelection || 'DATA_DOWNLOADER');
        } else {
            this.updateMobileBuildSummary();
            this.updateMobileControls();
        }
    }

    setMobileActionStatus(status: string | null): void {
        this.mobileActionStatus = status;
        this.updateMobileBuildSummary();
        this.updateMobileControls();
    }

    updateMobileControls(): void {
        const mainScene = this.scene as MainScene;
        const activeMap: Record<string, boolean> = {
            remove: this.selectedBuildingType === 'REMOVE',
            cable: this.selectedBuildingType === 'BASIC' || this.selectedBuildingType === 'FIBER',
            defense: Boolean(mainScene.showDefenseRange),
            power: Boolean(mainScene.showPowerGrid)
        };

        Object.entries(activeMap).forEach(([id, active]) => {
            const btn = document.getElementById(`mobile-action-${id}`);
            if (btn) btn.classList.toggle('active', active);
        });
    }

    setupTrainingLabUI(): void {
        let modal = document.getElementById('training-lab-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'training-lab-modal';
            modal.className = 'glass-panel';
            modal.innerHTML = `
                <div class="training-lab-header">
                    <div>
                        <div class="training-lab-kicker">Target Selection</div>
                        <h2>Model Training Lab</h2>
                    </div>
                    <button id="btn-close-training-lab" class="training-lab-close" type="button">Close</button>
                </div>
                <div id="training-lab-buffer" class="training-lab-buffer"></div>
                <div id="training-target-list" class="training-target-list"></div>
            `;
            document.body.appendChild(modal);
        }

        this.guardDomPointer(modal);
        const closeBtn = document.getElementById('btn-close-training-lab');
        this.guardDomPointer(closeBtn);
        if (closeBtn) {
            closeBtn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modal!.style.display = 'none';
            };
        }
    }

    openTrainingLab(lab: ModelTrainingLab): void {
        this.activeTrainingLab = lab;
        const modal = document.getElementById('training-lab-modal');
        if (!modal) return;
        modal.style.display = 'block';
        this.renderTrainingLab();
    }

    renderTrainingLab(): void {
        const lab = this.activeTrainingLab;
        const buffer = document.getElementById('training-lab-buffer');
        const list = document.getElementById('training-target-list');
        if (!lab || !buffer || !list) return;

        const counts = lab.inputBuffer.reduce<Record<string, number>>((acc, item) => {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {});
        const bufferText = ['WEIGHT_UPDATE', 'TRAINED_MODEL', 'INFERENCE_UNIT']
            .map(type => `${CONFIG.ITEMS[type]?.NAME || type}: ${counts[type] || 0}`)
            .join(' | ');
        buffer.textContent = bufferText;

        list.innerHTML = '';
        const mainScene = this.scene as MainScene;
        const targetTypes = ['CLASSIFIER', 'FILTER', 'FIREWALL'];
        targetTypes.forEach(type => {
            const displayName = CONFIG.BUILDINGS[type]?.NAME.split('(')[0].trim() || type;
            const state = mainScene.getDefenseModelState(type);
            let onlineCount = 0;
            mainScene.buildingManager.forEach(building => {
                if (building.type === type) onlineCount++;
            });
            const selected = lab.targetType === type;
            const row = document.createElement('button');
            row.className = `training-target-row ${selected ? 'active' : ''}`;
            row.type = 'button';
            row.innerHTML = `
                <span class="training-target-title">${displayName}</span>
                <span>Confidence ${Math.round(state.modelConfidence)}%</span>
                <span>v${state.modelVersion}</span>
                <span>${onlineCount} online</span>
            `;
            this.guardDomPointer(row);
            row.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                lab.setTarget(type);
                this.logMessage(`Training: target set to all ${displayName} models.`);
                this.renderTrainingLab();
            };
            list.appendChild(row);
        });

        const actions = document.createElement('div');
        actions.className = 'training-actions';
        const trainBtn = document.createElement('button');
        trainBtn.className = 'training-action-btn';
        trainBtn.type = 'button';
        trainBtn.textContent = 'Train Once';
        this.guardDomPointer(trainBtn);
        trainBtn.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            if (!lab.trainOnce()) {
                this.logMessage('Training: select a target and provide training input first.', true);
            }
            this.renderTrainingLab();
        };

        const autoBtn = document.createElement('button');
        autoBtn.className = `training-action-btn ${lab.autoTrain ? 'active' : ''}`;
        autoBtn.type = 'button';
        autoBtn.textContent = lab.autoTrain ? 'Auto Train: ON' : 'Auto Train: OFF';
        this.guardDomPointer(autoBtn);
        autoBtn.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            lab.autoTrain = !lab.autoTrain;
            this.renderTrainingLab();
        };

        actions.appendChild(trainBtn);
        actions.appendChild(autoBtn);
        list.appendChild(actions);
    }

    updateMobileBuildSummary(): void {
        if (!this.mobileBuildSummary) return;

        const type = this.selectedBuildingType;
        const data = CONFIG.BUILDINGS[type] || CONFIG.CABLES[type];
        if (!data) {
            this.mobileBuildSummary.textContent = type === 'REMOVE' ? 'Remove mode' : '';
            return;
        }

        const cost = (data as any).COST?.map((c: any) => `${c.amount} ${CONFIG.ITEMS[c.resource]?.NAME || c.resource}`).join(', ')
            || ((data as any).COST_PER_TILE ? `${(data as any).COST_PER_TILE} Silicon / tile` : '');
        this.mobileBuildSummary.innerHTML = `
            <strong>${data.NAME.split('(')[0].trim()}</strong>
            <span>${this.mobileActionStatus || cost || 'No build cost'}</span>
        `;
    }

    update(itemCount: number): void {
        if (this.packetsEl && this.lastItemCount !== itemCount) {
            this.lastItemCount = itemCount;
            this.packetsEl.innerText = String(itemCount);
        }

        // Update silicon count from InventoryManager
        if (this.siliconEl) {
            const mainScene = this.scene as MainScene;
            if (mainScene.inventoryManager) {
                const siliconCount = mainScene.inventoryManager.getResourceCount('SILICON');
                this.siliconEl.innerText = String(siliconCount);
            }
        }
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
        tooltip.style.left = `${x + 15}px`;
        tooltip.style.top = `${y + 15}px`;
        tooltip.innerHTML = `<div class="tooltip-title">${title}</div><div>${content}</div>`;
    }

    hideTooltip(): void {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) tooltip.style.display = 'none';
        if (this.mobileInfoSheet) this.mobileInfoSheet.style.display = 'none';
    }

    formatMobileInfo(title: string, content: string): string {
        const lines = content.split('\n').filter(Boolean);
        const tags: string[] = [];
        const details: string[] = [];

        const powerLine = lines.find(line => line.startsWith('Power:'));
        if (powerLine) {
            tags.push(powerLine.includes('OK') ? 'POWER OK' : 'NO POWER');
        }

        const inputLine = lines.find(line => line.startsWith('Input Buffer:'));
        const outputLine = lines.find(line => line.startsWith('Output Buffer:'));
        const defenseBufferLine = lines.find(line => line.startsWith('Buffer:'));
        const statusLine = lines.find(line => line.startsWith('Status:'));
        const ammoLine = lines.find(line => line.startsWith('Ammo:'));
        const recipeLine = lines.find(line => line.startsWith('Recipe:'));
        const networkLine = lines.find(line => line.startsWith('Network Power:'));

        if (statusLine?.includes('Processing')) tags.push('PROCESSING');
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
}
