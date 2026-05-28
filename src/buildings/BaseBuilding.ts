import Phaser from 'phaser';
import { CONFIG } from '../config';
import { BuildingOptions, GameItem, IMainScene, MoveTarget } from '../types';
import EventBus from '../managers/EventBus';
import { getCategoryColor, VISUAL_THEME } from '../visuals/visualTheme';

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

        this.graphics = scene.add.graphics();
        this.container.add(this.graphics);
        this.drawBody(config.color || bConfig.COLOR || 0xaaaaaa, w, h);
        this.drawCategoryAccent(w, h);

        this.inputBuffer = [];
        this.outputBuffer = [];
        this.maxBufferSize = bConfig.MAX_BUFFER || config.maxBufferSize || 5;
        this.hasPower = true;
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

    drawBody(color: number, w: number, h: number): void {
        const width = w * CONFIG.GRID_SIZE;
        const height = h * CONFIG.GRID_SIZE;
        const left = -width / 2;
        const top = -height / 2;
        const cx = 0;
        const cy = 0;

        this.graphics.clear();
        const accent = getCategoryColor(CONFIG.BUILDINGS[this.type]?.CATEGORY);
        this.graphics.fillStyle(VISUAL_THEME.buildings.shadow, 0.36);
        this.graphics.fillRoundedRect(left + 4, top + 5, width - 4, height - 4, 5);
        this.graphics.fillStyle(VISUAL_THEME.buildings.panelDark, 0.96);
        this.graphics.fillRoundedRect(left + 2, top + 2, width - 4, height - 4, 5);
        this.graphics.fillStyle(color, 0.28);
        this.graphics.fillRoundedRect(left + 5, top + 5, width - 10, height - 10, 4);
        this.graphics.lineStyle(1, accent, 0.5);
        this.graphics.strokeRoundedRect(left + 2, top + 2, width - 4, height - 4, 5);
        this.graphics.lineStyle(1, VISUAL_THEME.buildings.bevel, 0.18);
        this.graphics.strokeRoundedRect(left + 6, top + 6, width - 12, height - 12, 3);
        this.graphics.fillStyle(accent, 0.16);
        this.graphics.fillRect(left + 6, top + 6, width - 12, 3);

        this.graphics.lineStyle(2, 0xdbeafe, 0.52);
        switch (this.type) {
            case 'MODEL_TRAINING_LAB':
                for (let i = 0; i < 3; i++) {
                    this.graphics.strokeRect(left + 8 + i * 9, top + 8, 5, height - 16);
                }
                this.graphics.lineStyle(2, accent, 0.72);
                this.graphics.strokeCircle(cx, cy, Math.min(width, height) * 0.18);
                this.graphics.lineStyle(1, 0xffffff, 0.45);
                this.graphics.lineBetween(cx - 12, cy, cx + 12, cy);
                this.graphics.lineBetween(cx, cy - 12, cx, cy + 12);
                break;
            case 'GPU_CLUSTER':
                this.graphics.strokeRoundedRect(cx - 10, cy - 10, 20, 20, 4);
                this.graphics.lineStyle(1, accent, 0.55);
                for (let i = -1; i <= 1; i++) {
                    this.graphics.lineBetween(cx - 7, cy + i * 5, cx + 7, cy + i * 5);
                    this.graphics.lineBetween(cx + i * 5, cy - 7, cx + i * 5, cy + 7);
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
