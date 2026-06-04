import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions, IMainScene } from '../types';
import { getCategoryColor } from '../visuals/visualTheme';

const PHYSICAL_ITEMS = new Set(['SILICON']);

export default class Conveyor extends BaseBuilding {
    transferRate: number;
    conveyorGraphics: Phaser.GameObjects.Graphics;
    scrollOffset: number;
    conveyorTween: Phaser.Tweens.Tween | null;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}, type: string = 'CONVEYOR') {
        super(scene, x, y, type, { ...config, color: CONFIG.BUILDINGS[type].COLOR });
        this.transferRate = type === 'FAST_LINK' ? 1 : 2;
        this.maxBufferSize = 1;

        this.conveyorGraphics = scene.add.graphics();
        this.container.add(this.conveyorGraphics);
        this.conveyorGraphics.angle = CONFIG.DIRECTIONS[this.rotation]?.angle || 0;

        this.scrollOffset = 0;
        this.conveyorTween = null;
        if (this.shouldUseAnimatedVisuals()) {
            this.conveyorTween = scene.tweens.add({
                targets: this,
                scrollOffset: 12,
                duration: type === 'FAST_LINK' ? 400 : 800,
                repeat: -1,
                onUpdate: () => this.drawChevronArrows()
            });
        } else {
            this.drawChevronArrows();
        }
    }

    drawChevronArrows(): void {
        if (this.shouldThrottleVisuals()) return;
        this.conveyorGraphics.clear();
        if (this.destroyed) return;

        const accent = getCategoryColor(CONFIG.BUILDINGS[this.type]?.CATEGORY) || 0x3b82f6;
        const offset = this.scrollOffset;

        const startX = -16;
        const endX = 16;
        const spacing = 12;

        // Draw track borders (top and bottom horizontal lines)
        this.conveyorGraphics.lineStyle(1.5, accent, 0.4);
        this.conveyorGraphics.lineBetween(-16, -8, 16, -8);
        this.conveyorGraphics.lineBetween(-16, 8, 16, 8);

        this.conveyorGraphics.lineStyle(0.5, 0xffffff, 0.2);
        this.conveyorGraphics.lineBetween(-16, -8, 16, -8);
        this.conveyorGraphics.lineBetween(-16, 8, 16, 8);

        for (let x = startX - spacing + (offset % spacing); x < endX + spacing; x += spacing) {
            if (x < startX || x > endX) continue;

            const chevronGlowAlpha = 0.5 * (1 - Math.abs(x) / 20);
            const chevronCoreAlpha = 0.85 * (1 - Math.abs(x) / 20);

            // Glow outer line
            this.conveyorGraphics.lineStyle(3.5, accent, chevronGlowAlpha * 0.35);
            this.conveyorGraphics.beginPath();
            this.conveyorGraphics.moveTo(x - 3, -4);
            this.conveyorGraphics.lineTo(x, 0);
            this.conveyorGraphics.lineTo(x - 3, 4);
            this.conveyorGraphics.strokePath();

            // Core inner line
            this.conveyorGraphics.lineStyle(1, 0xffffff, chevronCoreAlpha);
            this.conveyorGraphics.beginPath();
            this.conveyorGraphics.moveTo(x - 3, -4);
            this.conveyorGraphics.lineTo(x, 0);
            this.conveyorGraphics.lineTo(x - 3, 4);
            this.conveyorGraphics.strokePath();
        }
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
        super.onTick(tickCount);
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

    destroy(): void {
        if (this.conveyorTween) {
            this.conveyorTween.remove();
        }
        super.destroy();
    }
}

export class FastLink extends Conveyor {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, config, 'FAST_LINK');
    }
}
