import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, IMainScene } from '../types';

export default class ResearchLab extends BaseBuilding {
    private analyzeWork = 0;
    private labGraphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'RESEARCH_LAB', { ...config, color: CONFIG.BUILDINGS.RESEARCH_LAB.COLOR });
        this.labGraphics = scene.add.graphics();
        this.container.add(this.labGraphics);
        this.drawLab();
    }

    canAcceptItem(type: string): boolean {
        return type === 'MATERIAL_SAMPLE' && this.inputBuffer.length < this.maxBufferSize;
    }

    onTick(tickCount: number): void {
        super.onTick(tickCount);
        if (this.isInfected(tickCount) && tickCount % 2 !== 0) return;
        if (this.inputBuffer.length === 0) return;

        this.analyzeWork += this.getPowerEfficiency();
        if (this.analyzeWork < 1) return;
        this.analyzeWork -= 1;

        const index = this.inputBuffer.indexOf('MATERIAL_SAMPLE');
        if (index < 0) return;
        this.inputBuffer.splice(index, 1);
        (this.scene as IMainScene).researchManager.addInsight(
            'material',
            CONFIG.RESEARCH_SETTINGS.FACILITY_OUTPUT.material
        );
    }

    private drawLab(): void {
        this.labGraphics.clear();
        this.labGraphics.lineStyle(2, 0x5eead4, 0.85);
        this.labGraphics.strokeRoundedRect(-14, -10, 28, 20, 4);
        this.labGraphics.lineStyle(1, 0xffffff, 0.55);
        this.labGraphics.lineBetween(-9, -4, 9, -4);
        this.labGraphics.lineBetween(-9, 3, 9, 3);
        this.labGraphics.fillStyle(0x5eead4, 0.75);
        this.labGraphics.fillCircle(-8, 7, 2);
        this.labGraphics.fillCircle(0, 7, 2);
        this.labGraphics.fillCircle(8, 7, 2);
    }
}
