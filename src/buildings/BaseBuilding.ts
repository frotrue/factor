import Phaser from 'phaser';
import { CONFIG } from '../config';
import { BuildingOptions, GameItem, MoveTarget } from '../types';

/**
 * 모든 건물의 기반 클래스
 */
export default class BaseBuilding {
    scene: Phaser.Scene;
    x: number;
    y: number;
    type: string;
    rotation: number;
    container: Phaser.GameObjects.Container;
    graphics: Phaser.GameObjects.Graphics;
    inputBuffer: string[];
    outputBuffer: string[];
    maxBufferSize: number;
    hasPower: boolean;
    infectedUntilTick: number;
    infectionMarker: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number, type: string, config: BuildingOptions = {}) {
        const bConfig = CONFIG.BUILDINGS[type];
        if (!bConfig) {
            const validTypes = Object.keys(CONFIG.BUILDINGS).join(', ');
            throw new Error(
                `[BaseBuilding] Invalid building type: "${type}". Valid types are: [${validTypes}]`
            );
        }

        this.scene = scene;
        this.x = x;
        this.y = y;
        this.type = type;
        this.rotation = config.rotation || 0;

        const w = bConfig.WIDTH || 1;
        const h = bConfig.HEIGHT || 1;

        this.container = scene.add.container(
            x + (w * CONFIG.GRID_SIZE) / 2,
            y + (h * CONFIG.GRID_SIZE) / 2
        );

        this.graphics = scene.add.graphics();
        this.container.add(this.graphics);
        this.drawBody(config.color || bConfig.COLOR || 0xaaaaaa, w, h);

        this.inputBuffer = [];
        this.outputBuffer = [];
        this.maxBufferSize = bConfig.MAX_BUFFER || config.maxBufferSize || 5;
        this.hasPower = true;
        this.infectedUntilTick = 0;
        this.infectionMarker = scene.add.graphics();
        this.infectionMarker.setDepth(35);
        this.container.add(this.infectionMarker);
    }

    canAcceptItem(_type: string): boolean {
        return false;
    }

    acceptItem(itemType: string): boolean {
        if (this.canAcceptItem(itemType)) {
            this.inputBuffer.push(itemType);
            return true;
        }
        return false;
    }

    /** 케이블이 데이터를 빼갈 때 참조하는 버퍼. Storage 등에서 override */
    getOutputSource(): string[] {
        return this.outputBuffer;
    }

    popOutput(): string | undefined {
        return this.getOutputSource().shift();
    }

    onTick(_tickCount: number, _occupiedPositions?: Set<string>): void {
        this.updateStatusMarkers(_tickCount);
    }

    drawBody(color: number, w: number, h: number): void {
        const width = w * CONFIG.GRID_SIZE;
        const height = h * CONFIG.GRID_SIZE;
        const left = -width / 2;
        const top = -height / 2;
        const cx = 0;
        const cy = 0;

        this.graphics.clear();
        this.graphics.fillStyle(color, 0.92);
        this.graphics.fillRoundedRect(left + 2, top + 2, width - 4, height - 4, 3);
        this.graphics.lineStyle(1, 0xffffff, 0.22);
        this.graphics.strokeRoundedRect(left + 2, top + 2, width - 4, height - 4, 3);

        this.graphics.lineStyle(2, 0x0a0a0c, 0.42);
        switch (this.type) {
            case 'MINER':
                this.graphics.strokeCircle(cx, cy, Math.min(width, height) * 0.24);
                this.graphics.lineBetween(cx - 7, cy, cx + 7, cy);
                this.graphics.lineBetween(cx, cy - 7, cx, cy + 7);
                break;
            case 'DATA_DOWNLOADER':
                this.graphics.lineStyle(2, 0x00ffff, 0.75);
                this.graphics.lineBetween(cx, cy + 8, cx, cy - 8);
                this.graphics.strokeCircle(cx, cy - 10, 5);
                this.graphics.strokeCircle(cx, cy - 10, 11);
                break;
            case 'CONVEYOR':
            case 'FAST_LINK':
                this.graphics.lineStyle(2, 0xffffff, 0.55);
                this.graphics.lineBetween(left + 7, cy, left + width - 7, cy);
                this.graphics.fillStyle(0xffffff, 0.55);
                this.graphics.fillTriangle(left + width - 10, cy, left + width - 17, cy - 5, left + width - 17, cy + 5);
                break;
            case 'PROCESSOR':
            case 'WEIGHT_TRAINER':
            case 'NEURAL_TRAINER':
                for (let i = 0; i < 3; i++) {
                    this.graphics.strokeRect(left + 8 + i * 9, top + 8, 5, height - 16);
                }
                break;
            case 'STORAGE':
                this.graphics.lineStyle(1, 0xffffff, 0.28);
                this.graphics.lineBetween(left + width / 2, top + 5, left + width / 2, top + height - 5);
                this.graphics.lineBetween(left + 5, top + height / 2, left + width - 5, top + height / 2);
                break;
            case 'POWER_NODE':
            case 'POWER_PLANT':
            case 'SOLAR_PANEL':
                this.graphics.lineStyle(2, 0xfde047, 0.8);
                this.graphics.lineBetween(cx - 4, top + 7, cx + 5, cy - 1);
                this.graphics.lineBetween(cx + 5, cy - 1, cx - 2, cy - 1);
                this.graphics.lineBetween(cx - 2, cy - 1, cx + 4, top + height - 7);
                break;
            case 'CLASSIFIER':
            case 'FILTER':
            case 'FIREWALL':
                this.graphics.lineStyle(2, 0xffffff, 0.58);
                this.graphics.strokeCircle(cx, cy, Math.min(width, height) * 0.22);
                this.graphics.lineBetween(cx, top + 8, cx, top + height - 8);
                break;
            default:
                this.graphics.fillStyle(0xffffff, 0.2);
                this.graphics.fillCircle(cx, cy, 4);
                break;
        }
    }

    infectUntil(tickCount: number): void {
        this.infectedUntilTick = Math.max(this.infectedUntilTick, tickCount);
    }

    isInfected(tickCount?: number): boolean {
        const currentTick = tickCount ?? (this.scene as any).tickSystem?.getCurrentTick?.() ?? 0;
        return this.infectedUntilTick > currentTick;
    }

    updateStatusMarkers(tickCount?: number): void {
        if (!this.infectionMarker) return;
        this.infectionMarker.clear();
        if (!this.isInfected(tickCount)) return;

        const pulse = Math.sin((this.scene as any).time?.now / 150) * 0.25 + 0.75;
        this.infectionMarker.lineStyle(2, 0xff00aa, pulse);
        this.infectionMarker.strokeTriangle(-6, -CONFIG.GRID_SIZE / 2 - 12, 6, -CONFIG.GRID_SIZE / 2 - 12, 0, -CONFIG.GRID_SIZE / 2 - 2);
        this.infectionMarker.fillStyle(0xff00aa, 0.4 * pulse);
        this.infectionMarker.fillTriangle(-6, -CONFIG.GRID_SIZE / 2 - 12, 6, -CONFIG.GRID_SIZE / 2 - 12, 0, -CONFIG.GRID_SIZE / 2 - 2);
    }

    getNextPosition(item: GameItem, currentTick: number): MoveTarget | null {
        return null;
    }

    destroy(): void {
        if (this.container) {
            this.container.destroy();
        }
    }
}
