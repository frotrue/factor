import { CONFIG } from '../config.js';
import EventBus from './EventBus.js';

/**
 * UI 매니저 - CONFIG.BUILDINGS 기반 동적 UI 생성
 * 새 건물 추가 시 HTML 수정 없이 자동으로 버튼 생성
 */
export default class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.selectedBuildingType = 'MINER';
        this.buttons = {};

        this.createBuildingButtons();
        this.createInfoText();
    }

    createBuildingButtons() {
        const overlay = document.getElementById('ui-overlay');
        if (!overlay) return;

        // 기존 하드코딩된 버튼 제거 후 동적 생성
        overlay.innerHTML = '';

        Object.entries(CONFIG.BUILDINGS).forEach(([key, data]) => {
            const btn = document.createElement('button');
            btn.id = `btn-${key.toLowerCase()}`;
            btn.className = 'build-btn';
            if (key === this.selectedBuildingType) btn.classList.add('active');

            const icon = document.createElement('div');
            icon.className = 'icon';
            icon.style.background = `#${data.COLOR.toString(16).padStart(6, '0')}`;

            const label = document.createTextNode(data.NAME.split('(')[0].trim());

            btn.appendChild(icon);
            btn.appendChild(label);

            btn.onclick = () => this.selectBuilding(key);

            overlay.appendChild(btn);
            this.buttons[key] = btn;
        });
    }

    selectBuilding(type) {
        this.selectedBuildingType = type;

        // 버튼 활성 상태 업데이트
        Object.entries(this.buttons).forEach(([key, btn]) => {
            btn.classList.toggle('active', key === type);
        });

        EventBus.emit('BUILDING_SELECTED', { type });
    }

    createInfoText() {
        this.uiText = this.scene.add.text(10, 10, '', {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 5, y: 5 }
        }).setScrollFactor(0).setDepth(200);
    }

    update(itemCount) {
        const bName = CONFIG.BUILDINGS[this.selectedBuildingType]?.NAME || '';
        this.uiText.setText(`패킷: ${itemCount}\n모드: ${bName}`);
    }

    getSelectedBuildingType() {
        return this.selectedBuildingType;
    }
}
