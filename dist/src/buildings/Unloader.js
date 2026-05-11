import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
export default class Unloader extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'UNLOADER', { ...config, color: CONFIG.BUILDINGS.UNLOADER.COLOR });
        this.selectedType = null;
    }
    canAcceptItem() {
        return false;
    }
    onTick(_tickCount) {
        const dir = CONFIG.DIRECTIONS[this.rotation];
        const backX = this.x - dir.x * CONFIG.GRID_SIZE;
        const backY = this.y - dir.y * CONFIG.GRID_SIZE;
        const buildingManager = this.scene.buildingManager;
        const backBuilding = buildingManager.get(`${backX},${backY}`);
        if (backBuilding && backBuilding.type === 'STORAGE') {
            if (this.outputBuffer.length === 0) {
                const storage = backBuilding;
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
//# sourceMappingURL=Unloader.js.map