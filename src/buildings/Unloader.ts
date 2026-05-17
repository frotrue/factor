import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
import Storage from './Storage';
import { BuildingOptions, IMainScene } from '../types';

export default class Unloader extends BaseBuilding {
    selectedType: string | null;

    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'UNLOADER', { ...config, color: CONFIG.BUILDINGS.UNLOADER.COLOR });
        this.selectedType = null;
    }

    canAcceptItem(): boolean {
        return false;
    }

    onTick(_tickCount: number): void {
        const dir = CONFIG.DIRECTIONS[this.rotation];
        const backX = this.x - dir.x * CONFIG.GRID_SIZE;
        const backY = this.y - dir.y * CONFIG.GRID_SIZE;
        const buildingManager = (this.scene as IMainScene).buildingManager;
        const backBuilding = buildingManager.get(`${backX},${backY}`);

        if (backBuilding && backBuilding.type === 'STORAGE') {
            if (this.outputBuffer.length === 0) {
                const storage = backBuilding as Storage;
                if (storage.inputBuffer.length > 0) {
                    let indexToExtract = 0;
                    if (this.selectedType) {
                        indexToExtract = storage.inputBuffer.indexOf(this.selectedType);
                    }
                    if (indexToExtract !== -1) {
                        const itemType = storage.inputBuffer.splice(indexToExtract, 1)[0];
                        this.outputBuffer.push(itemType);
                        storage.amountText.setText(storage.inputBuffer.length.toString());
                    }
                }
            }
        }
    }
}
