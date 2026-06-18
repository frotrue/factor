import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, IMainScene } from '../types';

export default class DataCenter extends BaseBuilding {
    private logWork = 0;
    private dataGraphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'DATA_CENTER', { ...config, color: CONFIG.BUILDINGS.DATA_CENTER.COLOR });
        this.dataGraphics = scene.add.graphics();
        this.container.add(this.dataGraphics);
        this.drawDataCenter();
    }

    onTick(tickCount: number): void {
        super.onTick(tickCount);
        if (this.isInfected(tickCount) && tickCount % 2 !== 0) return;

        const efficiency = this.getPowerEfficiency();
        const activity = this.getSystemActivityFactor();
        this.logWork += efficiency * activity;
        if (this.logWork < 1) return;

        const cycles = Math.floor(this.logWork);
        this.logWork -= cycles;
        (this.scene as IMainScene).researchManager.depositData(
            'system',
            CONFIG.RESEARCH_SETTINGS.DATA_OUTPUT.system * cycles
        );
    }

    private getSystemActivityFactor(): number {
        const scene = this.scene as IMainScene;
        const poweredBuildings = scene.buildingManager
            ?.getUniqueBuildings()
            .filter(building => building.type !== 'DATA_CENTER' && building.getPowerEfficiency() > 0).length ?? 0;
        const cables = scene.cableManager?.cables?.size ?? 0;
        const accessPoints = scene.buildingManager?.getByType('ACCESS_POINT').length ?? 0;
        return Math.max(0.5, Math.min(3, 0.5 + poweredBuildings * 0.04 + cables * 0.08 + accessPoints * 0.2));
    }

    private drawDataCenter(): void {
        this.dataGraphics.clear();
        this.dataGraphics.lineStyle(2, 0x60a5fa, 0.82);
        for (let i = 0; i < 3; i++) {
            this.dataGraphics.strokeRoundedRect(-11 + i * 8, -12, 6, 24, 2);
            this.dataGraphics.fillStyle(0x60a5fa, 0.45 + i * 0.12);
            this.dataGraphics.fillCircle(-8 + i * 8, -6, 1.5);
            this.dataGraphics.fillCircle(-8 + i * 8, 1, 1.5);
            this.dataGraphics.fillCircle(-8 + i * 8, 8, 1.5);
        }
    }
}
