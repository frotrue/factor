import Phaser from 'phaser';
import { CONFIG } from '../config';
import EventBus from './EventBus';
import { CoreDataEvent, PowerUpdateData } from '../types';

export default class UIManager {
    scene: Phaser.Scene;
    selectedBuildingType: string;
    buttons: Record<string, HTMLButtonElement>;
    scoreEl: HTMLElement | null;
    packetsEl: HTMLElement | null;
    powerEl: HTMLElement | null;
    hotkeys: string[];
    lastItemCount: number;
    lastScore: number;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.selectedBuildingType = 'MINER';
        this.buttons = {};

        this.scoreEl = document.getElementById('hud-score');
        this.packetsEl = document.getElementById('hud-packets');
        this.powerEl = document.getElementById('hud-power');

        this.hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
        this.lastItemCount = -1;
        this.lastScore = -1;

        this.createBuildingButtons();
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
                const isDeficit = data.net < 0;
                this.powerEl.innerText = `${data.production} / ${data.consumption} W`;
                this.powerEl.style.color = isDeficit ? '#ef4444' : '#fde047';
                this.powerEl.style.textShadow = isDeficit ? '0 0 10px #ef4444' : '0 0 10px #fde047';
            }
        });

        this.scene.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
            const key = event.key;
            if (this.hotkeys.includes(key)) {
                const index = parseInt(key) - 1;
                const buildingKeys = Object.keys(CONFIG.BUILDINGS);
                if (index < buildingKeys.length) {
                    this.selectBuilding(buildingKeys[index]);
                }
            } else if (key === 'Delete' || key === 'Backspace' || key === '0') {
                this.selectBuilding('REMOVE');
            }
        });
    }

    createBuildingButtons(): void {
        const overlay = document.getElementById('ui-overlay');
        if (!overlay) return;

        overlay.innerHTML = '';

        let index = 0;
        Object.entries(CONFIG.BUILDINGS).forEach(([key, data]) => {
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
            btn.onclick = () => this.selectBuilding(key);
            overlay.appendChild(btn);
            this.buttons[key] = btn;
            index++;
        });

        const removeBtn = document.createElement('button');
        removeBtn.id = 'btn-remove';
        removeBtn.className = 'build-btn';
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
