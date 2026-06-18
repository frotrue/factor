import Phaser from 'phaser';
import AbstractProcessor from './AbstractProcessor';
import { BuildingOptions } from '../types';

const DATA_ITEM_TYPES = ['RAW_DATA', 'LABELED_DATA', 'WEIGHT_UPDATE', 'MATERIAL_SAMPLE'];

export default class Recycler extends AbstractProcessor {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'RECYCLER', 'RECYCLING', config);
    }

    canAcceptItem(type: string): boolean {
        return this.hasPower && DATA_ITEM_TYPES.includes(type) && this.inputBuffer.length < this.maxBufferSize;
    }

    tryStartProcessing(): void {
        if (this.outputBuffer.length >= this.maxBufferSize) return;
        if (this.inputBuffer.length < 2) return;

        this.inputBuffer.splice(0, 2);
        this.isProcessing = true;
        this.processingTimer = 0;
    }
}
