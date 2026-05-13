import Phaser from 'phaser';
import Storage from './Storage';
import { CONFIG } from '../config';
import { BuildingOptions } from '../types';

const DATA_ITEM_TYPES = ['RAW_DATA', 'LABELED_DATA', 'WEIGHT_UPDATE', 'TRAINED_MODEL', 'INFERENCE_UNIT'];

export default class DataCache extends Storage {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, { ...config, color: CONFIG.BUILDINGS.DATA_CACHE.COLOR });
        this.type = 'DATA_CACHE';
        this.maxBufferSize = CONFIG.BUILDINGS.DATA_CACHE.MAX_BUFFER || 20;
        this.drawBody(CONFIG.BUILDINGS.DATA_CACHE.COLOR, 1, 1);
    }

    canAcceptItem(type: string): boolean {
        if (!DATA_ITEM_TYPES.includes(type)) return false;
        return super.canAcceptItem(type);
    }
}
