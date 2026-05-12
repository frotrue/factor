import Phaser from 'phaser';
import { CONFIG } from '../config';
import EventBus from './EventBus';
import { CoreDataEvent, PowerUpdateData } from '../types';
import type MainScene from '../scenes/MainScene';

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
    }

    setupResearchUI(): void {
        const btnResearch = document.getElementById('btn-research');
        const modalResearch = document.getElementById('research-modal');
        const btnClose = document.getElementById('btn-close-research');
        const container = document.getElementById('research-tree-container');

        if (btnResearch && modalResearch) {
            btnResearch.style.display = 'flex'; // Show research button
            btnResearch.onclick = () => {
                modalResearch.style.display = 'flex';
                EventBus.emit('RESEARCH_OPENED');
                this.renderResearchTree();
            };
        }

        if (btnClose && modalResearch) {
            btnClose.onclick = () => {
                modalResearch.style.display = 'none';
            };
        }

        EventBus.on('RESEARCH_UNLOCKED', () => {
            this.createBuildingButtons(); // Re-render build UI
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
            tabBtn.onclick = () => {
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
                actionBtn.onclick = () => {
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

        if (volumeInput && audioSettings) volumeInput.value = String(Math.round(audioSettings.masterVolume * 100));
        if (mutedInput && audioSettings) mutedInput.checked = audioSettings.muted;

        if (btnSettings && modalSettings) {
            btnSettings.onclick = () => {
                modalSettings.style.display = 'flex';
            };
        }

        if (btnClose && modalSettings) {
            btnClose.onclick = () => {
                modalSettings.style.display = 'none';
            };
        }

        if (btnSave) btnSave.onclick = () => EventBus.emit('SAVE_REQUESTED');
        if (btnLoad) btnLoad.onclick = () => EventBus.emit('LOAD_REQUESTED');
        if (btnResetTutorial) {
            btnResetTutorial.onclick = () => {
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
                btn.onclick = () => {
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
            tabBtn.onclick = () => {
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

            btn.onclick = () => this.selectBuilding(key);
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
        removeBtn.onclick = () => this.selectBuilding('REMOVE');
        overlay.appendChild(removeBtn);
        this.buttons['REMOVE'] = removeBtn;
    }

    selectBuilding(type: string): void {
        this.selectedBuildingType = type;
        Object.entries(this.buttons).forEach(([key, btn]) => {
            btn.classList.toggle('active', key === type);
        });
        EventBus.emit('BUILDING_SELECTED', { type });
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
