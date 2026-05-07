import BaseBuilding from './BaseBuilding.js';
import { CONFIG } from '../config.js';

export default class Storage extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'STORAGE', { 
            ...config, 
            color: CONFIG.BUILDINGS.STORAGE.COLOR 
        });

        // UI Text for storage amount
        this.amountText = scene.add.text(
            0, 
            0, 
            '0', 
            { fontSize: '14px', fill: '#ffffff', fontFamily: 'Share Tech Mono' }
        ).setOrigin(0.5);
        this.container.add(this.amountText);

        // 창고는 모든 아이템을 inputBuffer에 보관함
        // outputBuffer는 사용하지 않고, Unloader가 직접 inputBuffer에서 빼감
    }

    canAcceptItem(type) {
        // 1. 버퍼 꽉 찼는지 확인
        if (this.inputBuffer.length >= this.maxBufferSize) {
            return false;
        }

        // 2. 창고에 이미 다른 종류의 아이템이 있는지 확인 (한 종류만 보관 가능)
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

    onTick(tickCount) {
        // 텍스트 업데이트 (혹시 모를 동기화용)
        this.amountText.setText(this.inputBuffer.length.toString());
    }
}
