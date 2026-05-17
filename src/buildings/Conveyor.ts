import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, IMainScene } from '../types';

const PHYSICAL_ITEMS = new Set(['SILICON']);

export default class Conveyor extends BaseBuilding {
    transferRate: number;
    arrow: Phaser.GameObjects.Triangle;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}, type: string = 'CONVEYOR') {
        super(scene, x, y, type, { ...config, color: CONFIG.BUILDINGS[type].COLOR });
        this.transferRate = type === 'FAST_LINK' ? 1 : 2;
        this.maxBufferSize = 1;

        this.arrow = scene.add.triangle(0, 0, 10, 0, -8, -7, -8, 7, 0xffffff, 0.85);
        this.arrow.setAngle(CONFIG.DIRECTIONS[this.rotation].angle);
        this.container.add(this.arrow);
    }

    canAcceptItem(type: string): boolean {
        return PHYSICAL_ITEMS.has(type) && this.inputBuffer.length < this.maxBufferSize;
    }

    acceptItem(type: string): boolean {
        if (!this.canAcceptItem(type)) return false;
        this.inputBuffer.push(type);
        return true;
    }

    getOutputSource(): string[] {
        return this.inputBuffer;
    }

    onTick(tickCount: number): void {
        if (this.isInfected(tickCount) && tickCount % 2 !== 0) return;
        this.pullFromBack();

        if (tickCount % this.transferRate !== 0) return;
        this.pushToFront();
    }

    pullFromBack(): void {
        if (this.inputBuffer.length >= this.maxBufferSize) return;

        const dir = CONFIG.DIRECTIONS[this.rotation];
        const backX = this.x - dir.x * CONFIG.GRID_SIZE;
        const backY = this.y - dir.y * CONFIG.GRID_SIZE;
        const buildingManager = (this.scene as IMainScene).buildingManager;
        const source = buildingManager.get(`${backX},${backY}`);
        if (!source || !source.hasPower) return;

        const sourceOutput = source.getOutputSource();
        const item = sourceOutput[0];
        if (!item || !PHYSICAL_ITEMS.has(item)) return;

        this.inputBuffer.push(source.popOutput()!);
    }

    pushToFront(): void {
        if (this.inputBuffer.length === 0) return;

        const dir = CONFIG.DIRECTIONS[this.rotation];
        const frontX = this.x + dir.x * CONFIG.GRID_SIZE;
        const frontY = this.y + dir.y * CONFIG.GRID_SIZE;
        const buildingManager = (this.scene as IMainScene).buildingManager;
        const dest = buildingManager.get(`${frontX},${frontY}`);
        const item = this.inputBuffer[0];

        if (dest && dest.hasPower && dest.canAcceptItem(item)) {
            dest.acceptItem(this.inputBuffer.shift()!);
            this.createPacketPulse(frontX, frontY, item);
        }
    }

    createPacketPulse(frontX: number, frontY: number, itemType: string): void {
        const itemConfig = CONFIG.ITEMS[itemType] || CONFIG.ITEMS.SILICON;
        const pulse = this.scene.add.circle(this.x + CONFIG.GRID_SIZE / 2, this.y + CONFIG.GRID_SIZE / 2, 4, itemConfig.COLOR);
        pulse.setDepth(18);
        this.scene.tweens.add({
            targets: pulse,
            x: frontX + CONFIG.GRID_SIZE / 2,
            y: frontY + CONFIG.GRID_SIZE / 2,
            duration: CONFIG.TIMING.DATA_PULSE_DURATION_MS,
            ease: 'Linear',
            onComplete: () => pulse.destroy()
        });
    }
}

export class FastLink extends Conveyor {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, config, 'FAST_LINK');
    }
}
