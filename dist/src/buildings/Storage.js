import BaseBuilding from './BaseBuilding';
import { CONFIG } from '../config';
export default class Storage extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'STORAGE', { ...config, color: CONFIG.BUILDINGS.STORAGE.COLOR });
        this.amountText = scene.add.text(0, 0, '0', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Share Tech Mono'
        }).setOrigin(0.5);
        this.container.add(this.amountText);
    }
    canAcceptItem(type) {
        if (this.inputBuffer.length >= this.maxBufferSize)
            return false;
        if (this.inputBuffer.length > 0) {
            return this.inputBuffer[0] === type;
        }
        return true;
    }
    acceptItem(type) {
        if (this.canAcceptItem(type)) {
            this.inputBuffer.push(type);
            this.amountText.setText(this.inputBuffer.length.toString());
            return true;
        }
        return false;
    }
    onTick(_tickCount) {
        this.amountText.setText(this.inputBuffer.length.toString());
    }
}
//# sourceMappingURL=Storage.js.map