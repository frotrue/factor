import { CONFIG } from '../config';
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
    currentWaveBriefing: WaveBriefing | null;
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
        this.currentWaveBriefing = null;
        this.trainingLabUI = new TrainingLabUI(scene, this);
        this.researchUI = new ResearchUI(scene, this);
        this.settingsUI = new SettingsUI(scene, this);
        this.mobileUI = new MobileUIManager(scene, this);

        // Note: createBuildingButtons is now called by MainScene after ResearchManager is initialized
        this.setupEvents();
    }

    setupEvents(): void {
        EventBus.on('CORE_DATA_RECEIVED', (data: CoreDataEvent) => {
            if (this.scoreEl && this.lastScore !== data.score) {
                this.lastScore = data.score;
                this.scoreEl.innerText = data.score.toFixed(2);
            }
        }, 'UIManager');

        EventBus.on('POWER_UPDATED', (data: PowerUpdateData) => {
            if (this.powerEl) {
                const isDeficit = data.isBlackout || data.net < 0;
                const networkText = data.networks ? ` | ${data.networks.length} grids` : '';
                this.powerEl.innerText = `${data.production} / ${data.consumption} W${networkText}`;
                this.powerEl.style.color = isDeficit ? '#ef4444' : '#fde047';
                this.powerEl.style.textShadow = isDeficit ? '0 0 10px #ef4444' : '0 0 10px #fde047';
            }
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

        EventBus.on('GAME_OVER', () => {
            const gameOverScreen = document.getElementById('game-over-screen');
            if (gameOverScreen) gameOverScreen.style.display = 'flex';
            
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
            this.updateMobileBuildSummary();
            this.updateMobileControls();
            this.renderWaveBriefing();
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
        const prefix = countdown ? `${countdown} | ` : '';
        this.waveTimerEl.innerText = `${prefix}${routeText} | ${this.currentWaveBriefing.threat}${specialText}`;
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
        return;
        const btnSettings = document.getElementById('btn-settings');
        const modalSettings = document.getElementById('settings-modal');
        const btnClose = document.getElementById('btn-close-settings');
        const btnSave = document.getElementById('btn-save');
        const btnLoad = document.getElementById('btn-load');
        const volumeInput = document.getElementById('audio-volume') as HTMLInputElement | null;
        const mutedInput = document.getElementById('audio-muted') as HTMLInputElement | null;
        const btnResetTutorial = document.getElementById('btn-reset-tutorial');
        const mainScene = this.scene;
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

        if (volumeInput && audioSettings) volumeInput!.value = String(Math.round(audioSettings.masterVolume * 100));
        if (mutedInput && audioSettings) mutedInput!.checked = audioSettings.muted;

        if (btnSettings && modalSettings) {
            btnSettings!.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalSettings!.style.display = 'flex';
            };
        }

        if (btnClose && modalSettings) {
            btnClose!.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                modalSettings!.style.display = 'none';
            };
        }

        if (btnSave) btnSave!.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            EventBus.emit('SAVE_REQUESTED');
        };
        if (btnLoad) btnLoad!.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            EventBus.emit('LOAD_REQUESTED');
        };
        if (btnResetTutorial) {
            btnResetTutorial!.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                EventBus.emit('TUTORIAL_RESET');
                this.logMessage('Tutorial: 안내를 다시 시작합니다.');
            };
        }

        const emitAudioSettings = () => {
            const volume = volumeInput ? Number(volumeInput!.value) / 100 : audioSettings?.masterVolume ?? 0.6;
            const muted = mutedInput ? mutedInput!.checked : audioSettings?.muted ?? false;
            EventBus.emit('AUDIO_SETTINGS_CHANGED', { masterVolume: volume, muted });
        };
        if (volumeInput) volumeInput!.oninput = emitAudioSettings;
        if (mutedInput) mutedInput!.onchange = emitAudioSettings;

        [1, 2, 3].forEach(speed => {
            const btn = document.getElementById(`btn-speed-${speed}`);
            if (btn) {
                this.guardDomPointer(btn);
                btn.onclick = event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const mainScene = this.scene;
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

        let index = 0;
        const mainScene = this.scene;
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

            const label = document.createTextNode(CONFIG.BUILDINGS[key] ? getBuildingName(key) : getCableName(key));

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
                costLabel.innerText = data.COST.map((c: any) => `${c.amount} ${getItemName(c.resource)}`).join(', ');
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
