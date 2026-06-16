import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import type { BuildingOptions } from '../types';

export default class ResearchOperationsCenter extends BaseBuilding {
    private statusText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'RESEARCH_OPERATIONS_CENTER', { ...config, color: CONFIG.BUILDINGS.RESEARCH_OPERATIONS_CENTER.COLOR });

        this.statusText = scene.add.text(0, CONFIG.GRID_SIZE * 0.35, 'ROC', {
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '8px',
            color: '#99f6e4',
            align: 'center'
        }).setOrigin(0.5);
        this.container.add(this.statusText);
        this.refreshStatusText();
    }

    onTick(tickCount: number): void {
        super.onTick(tickCount);
        this.refreshStatusText();
    }

    getCustomState(): object {
        return {};
    }

    private refreshStatusText(): void {
        if (this.hasPower === false) {
            this.statusText.setText('ROC\nOFFLINE');
            this.statusText.setColor('#fca5a5');
            return;
        }

        this.statusText.setText('ROC\nRESEARCH');
        this.statusText.setColor('#99f6e4');
    }
}
