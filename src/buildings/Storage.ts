import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';

export default class Storage extends BaseBuilding {
    amountText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}, type: string = 'STORAGE') {
        super(scene, x, y, type, { ...config, color: CONFIG.BUILDINGS[type].COLOR });

        this.amountText = scene.add.text(0, 0, '0', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Share Tech Mono'
        }).setOrigin(0.5);
        this.container.add(this.amountText);
    }

    /** 케이블은 Storage의 inputBuffer에서 데이터를 빼감 */
    getOutputSource(): string[] {
        return this.inputBuffer;
    }

    canAcceptItem(type: string): boolean {
        if (this.inputBuffer.length >= this.maxBufferSize) return false;
        if (this.inputBuffer.length > 0) {
            return this.inputBuffer[0] === type;
        }
        return true;
    }

    acceptItem(type: string): boolean {
        if (this.canAcceptItem(type)) {
            this.inputBuffer.push(type);
            this.amountText.setText(this.inputBuffer.length.toString());
            return true;
        }
        return false;
    }

    onTick(_tickCount: number): void {
        this.amountText.setText(this.inputBuffer.length.toString());
    }
}
