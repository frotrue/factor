import Phaser from 'phaser';
import { CONFIG } from '../config';
import { BuildingOptions, GameItem, IMainScene, MoveTarget } from '../types';
import EventBus from '../managers/EventBus';
import { getCategoryColor, VISUAL_THEME } from '../visuals/visualTheme';

/**
 * 모든 건물의 기반 클래스
 */
export default class BaseBuilding {
    private static readonly bodyTextureKeys = new Set<string>();
    private static readonly MAX_ANIMATED_BUILDINGS = 180;

    /** Shared frame counter for visual update throttling across all buildings */
    private static _visualFrameCount = 0;
    static tickVisualFrame(): void { BaseBuilding._visualFrameCount++; }

    /** Returns true if this frame should skip visual updates (2 of 3 frames skipped) */
    protected shouldThrottleVisuals(): boolean {
        return BaseBuilding._visualFrameCount % 3 !== 0;
    }

    protected shouldUseAnimatedVisuals(): boolean {
        const buildingCount = (this.scene as IMainScene).buildingManager?.getUniqueBuildings?.().length ?? 0;
        return buildingCount < BaseBuilding.MAX_ANIMATED_BUILDINGS;
    }

    scene: Phaser.Scene;
    x: number;
    y: number;
    type: string;
    rotation: number;
    container: Phaser.GameObjects.Container;
    bodyImage?: Phaser.GameObjects.Image;
    graphics: Phaser.GameObjects.Graphics;
    inputBuffer: string[];
    outputBuffer: string[];
    maxBufferSize: number;
    hasPower: boolean;
    powerEfficiency: number;
    hp: number;
    maxHp: number;
    hpBar?: Phaser.GameObjects.Graphics;
    destroyed: boolean;
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

        this.bodyImage = this.createBodyImage(config.color || bConfig.COLOR || 0xaaaaaa, w, h);
        if (this.bodyImage) {
            this.container.add(this.bodyImage);
        }
        this.graphics = scene.add.graphics();
        this.container.add(this.graphics);
        this.drawCategoryAccent(w, h);

        this.inputBuffer = [];
        this.outputBuffer = [];
        this.maxBufferSize = bConfig.MAX_BUFFER || config.maxBufferSize || 5;
        this.hasPower = true;
        this.powerEfficiency = 1;
        this.maxHp = bConfig.HP || 100;
        this.hp = this.maxHp;
        this.destroyed = false;
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

    getPowerEfficiency(): number {
        return Math.max(0, Math.min(1, this.powerEfficiency ?? (this.hasPower === false ? 0 : 1)));
    }

    isOperational(): boolean {
        return this.getPowerEfficiency() > 0;
    }

    drawBody(color: number, w: number, h: number): void {
        const textureKey = this.ensureBodyTexture(color, w, h);
        if (textureKey && this.bodyImage) {
            this.bodyImage.setTexture(textureKey);
            return;
        }

        this.graphics.clear();
        BaseBuilding.drawBodyGraphics(this.graphics, this.type, color, w, h, true);
    }

    private createBodyImage(color: number, w: number, h: number): Phaser.GameObjects.Image | undefined {
        const textureKey = this.ensureBodyTexture(color, w, h);
        if (!textureKey || !this.scene.add.image) return undefined;

        return this.scene.add.image(0, 0, textureKey).setOrigin(0.5);
    }

    private ensureBodyTexture(color: number, w: number, h: number): string | null {
        if (!this.scene.textures?.exists || !this.scene.textures?.remove || !this.scene.add.graphics) {
            return null;
        }

        const textureKey = `building-body-${this.type}-${w}x${h}-${color.toString(16)}`;
        if (BaseBuilding.bodyTextureKeys.has(textureKey) && this.scene.textures.exists(textureKey)) {
            return textureKey;
        }

        const graphics = this.scene.add.graphics();
        if (!graphics.generateTexture) {
            graphics.destroy();
            return null;
        }

        if (this.scene.textures.exists(textureKey)) {
            this.scene.textures.remove(textureKey);
        }

        BaseBuilding.drawBodyGraphics(graphics, this.type, color, w, h, false);
        graphics.generateTexture(textureKey, w * CONFIG.GRID_SIZE, h * CONFIG.GRID_SIZE);
        graphics.destroy();
        BaseBuilding.bodyTextureKeys.add(textureKey);
        return textureKey;
    }

    private static drawBodyGraphics(
        graphics: Phaser.GameObjects.Graphics,
        type: string,
        color: number,
        w: number,
        h: number,
        centered: boolean
    ): void {
        const width = w * CONFIG.GRID_SIZE;
        const height = h * CONFIG.GRID_SIZE;
        const left = centered ? -width / 2 : 0;
        const top = centered ? -height / 2 : 0;
        const cx = centered ? 0 : width / 2;
        const cy = centered ? 0 : height / 2;

        const accent = getCategoryColor(CONFIG.BUILDINGS[type]?.CATEGORY);
        graphics.fillStyle(VISUAL_THEME.buildings.shadow, 0.36);
        graphics.fillRoundedRect(left + 4, top + 5, width - 4, height - 4, 5);
        graphics.fillStyle(VISUAL_THEME.buildings.panelDark, 0.96);
        graphics.fillRoundedRect(left + 2, top + 2, width - 4, height - 4, 5);
        graphics.fillStyle(color, 0.28);
        graphics.fillRoundedRect(left + 5, top + 5, width - 10, height - 10, 4);
        graphics.lineStyle(1, accent, 0.5);
        graphics.strokeRoundedRect(left + 2, top + 2, width - 4, height - 4, 5);
        graphics.lineStyle(1, VISUAL_THEME.buildings.bevel, 0.18);
        graphics.strokeRoundedRect(left + 6, top + 6, width - 12, height - 12, 3);
        graphics.fillStyle(accent, 0.16);
        graphics.fillRect(left + 6, top + 6, width - 12, 3);

        graphics.lineStyle(2, 0xdbeafe, 0.52);
        switch (type) {
            case 'RESEARCH_OPERATIONS_CENTER':
                for (let i = 0; i < 3; i++) {
                    graphics.strokeRect(left + 8 + i * 9, top + 8, 5, height - 16);
                }
                graphics.lineStyle(2, accent, 0.72);
                graphics.strokeCircle(cx, cy, Math.min(width, height) * 0.18);
                graphics.lineStyle(1, 0xffffff, 0.45);
                graphics.lineBetween(cx - 12, cy, cx + 12, cy);
                graphics.lineBetween(cx, cy - 12, cx, cy + 12);
                break;
            case 'GPU_CLUSTER':
                graphics.strokeRoundedRect(cx - 10, cy - 10, 20, 20, 4);
                graphics.lineStyle(1, accent, 0.55);
                for (let i = -1; i <= 1; i++) {
                    graphics.lineBetween(cx - 7, cy + i * 5, cx + 7, cy + i * 5);
                    graphics.lineBetween(cx + i * 5, cy - 7, cx + i * 5, cy + 7);
                }
                break;
            default:
                // 다른 모든 업그레이드된 건물은 각자의 생성자에서 고품질 동적 벡터 비주얼을 렌더링하므로,
                // 기존의 단순 정적 아이콘 그리기는 생략하여 새로운 프리미엄 디자인이 가려지지 않도록 합니다.
                break;
        }
    }

    drawCategoryAccent(w: number, h: number): void {
        const bConfig = CONFIG.BUILDINGS[this.type];
        const color = getCategoryColor(bConfig.CATEGORY);

        const width = w * CONFIG.GRID_SIZE;
        const height = h * CONFIG.GRID_SIZE;
        const left = -width / 2;
        const top = -height / 2;
        this.graphics.lineStyle(2, color, 0.92);
        this.graphics.lineBetween(left + 6, top + 6, left + Math.min(width * 0.55, 22), top + 6);
        this.graphics.lineBetween(left + 6, top + 6, left + 6, top + Math.min(height * 0.55, 22));
        this.graphics.fillStyle(color, 0.75);
        this.graphics.fillCircle(left + 8, top + 8, 2);
    }

    ensureHpBar(): void {
        if (this.hpBar) return;
        this.hpBar = this.scene.add.graphics();
        this.container.add(this.hpBar);
    }

    drawHpBar(): void {
        if (!this.hpBar) return;
        this.hpBar.clear();
        if (this.hp >= this.maxHp) return;

        const bConfig = CONFIG.BUILDINGS[this.type];
        const width = CONFIG.GRID_SIZE * (bConfig.WIDTH || 1);
        const height = 4;
        const percent = Math.max(0, this.hp / this.maxHp);
        this.hpBar.fillStyle(0x7f1d1d, 1);
        this.hpBar.fillRect(-width / 2, -CONFIG.GRID_SIZE / 2 - 8, width, height);
        this.hpBar.fillStyle(0x22c55e, 1);
        this.hpBar.fillRect(-width / 2, -CONFIG.GRID_SIZE / 2 - 8, width * percent, height);
    }

    takeDamage(amount: number): void {
        if (this.destroyed || amount <= 0) return;
        this.hp = Math.max(0, this.hp - amount);
        this.ensureHpBar();
        this.drawHpBar();
        EventBus.emit('BUILDING_DAMAGED', {
            key: `${this.x},${this.y}`,
            building: this,
            amount,
            hp: this.hp,
            maxHp: this.maxHp
        });

        if (this.hp <= 0) {
            this.destroyed = true;
            (this.scene as IMainScene).buildingManager?.destroyBuilding(`${this.x},${this.y}`);
        }
    }

    infectUntil(tickCount: number): void {
        this.infectedUntilTick = Math.max(this.infectedUntilTick, tickCount);
    }

    isInfected(tickCount?: number): boolean {
        const currentTick = tickCount ?? (this.scene as IMainScene).tickSystem?.getCurrentTick?.() ?? 0;
        return this.infectedUntilTick > currentTick;
    }

    updateStatusMarkers(tickCount?: number): void {
        if (!this.infectionMarker) return;
        this.infectionMarker.clear();
        if (!this.isInfected(tickCount)) return;

        const pulse = Math.sin(this.scene.time.now / 150) * 0.25 + 0.75;
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
