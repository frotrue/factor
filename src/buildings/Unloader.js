import BaseBuilding from './BaseBuilding.js';
import { CONFIG } from '../config.js';

export default class Unloader extends BaseBuilding {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'UNLOADER', { 
            ...config, 
            color: CONFIG.BUILDINGS.UNLOADER.COLOR 
        });

        // TODO: UI에서 출력할 아이템 종류를 선택하게 만들어야 함. 현재는 창고의 첫 번째 아이템을 무조건 빼냄.
        this.selectedType = null; 
    }

    canAcceptItem() {
        return false; // 하역기는 외부 입력을 받지 않음
    }

    onTick(tickCount, occupiedPositions) {
        // 출력 방향 확인
        const dir = CONFIG.DIRECTIONS[this.rotation];
        
        // 반대 방향(입력 방향)이 창고인지 확인
        const backX = this.x - dir.x * CONFIG.GRID_SIZE;
        const backY = this.y - dir.y * CONFIG.GRID_SIZE;
        const backBuilding = this.scene.buildingManager.get(`${backX},${backY}`);

        // 앞에 자리가 비었는지 확인 (TickSystem의 output로직 활용을 위해 outputBuffer 사용)
        if (backBuilding && backBuilding.type === 'STORAGE') {
            if (this.outputBuffer.length === 0) {
                // 창고에서 아이템 빼기
                if (backBuilding.inputBuffer.length > 0) {
                    let indexToExtract = 0;

                    if (this.selectedType) {
                        indexToExtract = backBuilding.inputBuffer.indexOf(this.selectedType);
                    }

                    if (indexToExtract !== -1) {
                        const itemType = backBuilding.inputBuffer.splice(indexToExtract, 1)[0];
                        this.outputBuffer.push(itemType);
                        backBuilding.amountText.setText(backBuilding.inputBuffer.length.toString());
                    }
                }
            }
        }
    }
}
