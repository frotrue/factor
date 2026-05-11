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
        this.graphics.fillStyle(config.color || 0xaaaaaa, 1);
        this.graphics.fillRect(
            -(w * CONFIG.GRID_SIZE) / 2,
            -(h * CONFIG.GRID_SIZE) / 2,
            w * CONFIG.GRID_SIZE,
            h * CONFIG.GRID_SIZE
        );
        this.container.add(this.graphics);

        this.inputBuffer = [];
        this.outputBuffer = [];
        this.maxBufferSize = bConfig.MAX_BUFFER || config.maxBufferSize || 5;
        this.hasPower = true;
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
        // Override in subclass
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
