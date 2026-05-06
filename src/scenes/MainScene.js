import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import Miner from '../buildings/Miner.js';
import Conveyor from '../buildings/Conveyor.js';
import ItemManager from '../managers/ItemManager.js';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        
        // --- 설정 ---
        this.gridSize = CONFIG.GRID_SIZE;
        this.tickRate = CONFIG.TICK_RATE;
        
        // --- 데이터 관리 ---
        this.buildings = new Map();
        this.resourceMap = new Map(); // key: "x,y", value: 'RAW_DATA' | 'SILICON' | 'ENERGY'
        this.itemManager = null;
        
        // --- 상태 ---
        this.lastTickTime = 0;
        this.currentTick = 0;
        this.currentRotation = 0;
        this.selectedBuildingType = 'MINER';
        
        // 렌더링 최적화 상태 (3.1 전략)
        this.lastCameraState = { x: 0, y: 0, zoom: 0 };
        
        this.directions = [
            { x: 1, y: 0, angle: 0 },
            { x: 0, y: 1, angle: 90 },
            { x: -1, y: 0, angle: 180 },
            { x: 0, y: -1, angle: 270 }
        ];
    }

    create() {
        this.itemManager = new ItemManager(this);
        
        // 자원 매립지 생성
        this.generateResourcePatches();

        this.setupUI();
        this.setupCamera();

        this.gridGraphics = this.add.graphics();
        this.gridGraphics.setDepth(0);

        this.setupCursor();

        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', this.handlePointerDown, this);
        
        this.input.keyboard.on('keydown-R', () => {
            this.rotateCursor();
        });

        this.uiText = this.add.text(10, 10, '', {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 5, y: 5 }
        }).setScrollFactor(0).setDepth(200);

        // 초기 그리드 그리기
        this.drawInfiniteGrid(true);
    }

    generateResourcePatches() {
        // 간단한 자원 매립지 생성 로직 (클러스터 형태)
        const addPatch = (startX, startY, size, type) => {
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    const x = (startX + i) * this.gridSize;
                    const y = (startY + j) * this.gridSize;
                    this.resourceMap.set(`${x},${y}`, type);
                }
            }
        };

        // 초기 자원들 배치 (시작 지점 근처)
        addPatch(2, 2, 4, 'RAW_DATA');
        addPatch(-6, 3, 3, 'SILICON');
        addPatch(4, -5, 3, 'ENERGY');
    }

    setupUI() {
        const btnMiner = document.getElementById('btn-miner');
        const btnConveyor = document.getElementById('btn-conveyor');

        if (btnMiner && btnConveyor) {
            btnMiner.onclick = () => {
                this.selectedBuildingType = 'MINER';
                btnMiner.classList.add('active');
                btnConveyor.classList.remove('active');
            };
            btnConveyor.onclick = () => {
                this.selectedBuildingType = 'CONVEYOR';
                btnConveyor.classList.add('active');
                btnMiner.classList.remove('active');
            };
        }
    }

    update(time, delta) {
        this.updateCursorPosition();
        
        // 카메라 변화 감지 후 필요한 경우에만 그리드 다시 그리기 (최적화 3.1)
        this.drawInfiniteGrid();

        // UI 업데이트 (데이터 기반 명칭 사용 3.2)
        const count = this.itemManager.getItems().length;
        const bName = CONFIG.BUILDINGS[this.selectedBuildingType].NAME;
        this.uiText.setText(`패킷: ${count}\n모드: ${bName}`);

        if (time > this.lastTickTime + this.tickRate) {
            this.lastTickTime = time;
            this.runTick();
        }
    }

    setupCamera() {
        const camera = this.cameras.main;
        camera.setZoom(CONFIG.CAMERA.DEFAULT_ZOOM);
        
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            let newZoom = camera.zoom + (deltaY > 0 ? -0.1 : 0.1);
            camera.zoom = Phaser.Math.Clamp(newZoom, CONFIG.CAMERA.MIN_ZOOM, CONFIG.CAMERA.MAX_ZOOM);
        });

        this.input.on('pointermove', (pointer) => {
            if (pointer.middleButtonDown()) {
                camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom;
                camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom;
            }
        });
    }

    setupCursor() {
        this.cursorContainer = this.add.container(0, 0);
        const box = this.add.graphics();
        box.lineStyle(2, 0xffff00, 0.8);
        box.strokeRect(0, 0, this.gridSize, this.gridSize);
        
        this.cursorArrow = this.add.triangle(
            this.gridSize / 2, this.gridSize / 2,
            10, 0, 0, 10, 0, -10,
            0xffff00, 0.8
        );
        this.cursorArrow.setAngle(this.directions[this.currentRotation].angle);
        
        this.cursorContainer.add([box, this.cursorArrow]);
        this.cursorContainer.setDepth(100);
    }

    rotateCursor() {
        this.currentRotation = (this.currentRotation + 1) % 4;
        this.cursorArrow.setAngle(this.directions[this.currentRotation].angle);
    }

    updateCursorPosition() {
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / this.gridSize) * this.gridSize;
        const snappedY = Math.floor(worldPoint.y / this.gridSize) * this.gridSize;
        this.cursorContainer.setPosition(snappedX, snappedY);
    }

    drawInfiniteGrid(force = false) {
        const camera = this.cameras.main;
        
        // 이전 카메라 상태와 비교하여 변화가 없으면 리턴 (최적화)
        if (!force && 
            Math.abs(this.lastCameraState.x - camera.scrollX) < CONFIG.OPTIMIZATION.GRID_REDRAW_THRESHOLD &&
            Math.abs(this.lastCameraState.y - camera.scrollY) < CONFIG.OPTIMIZATION.GRID_REDRAW_THRESHOLD &&
            this.lastCameraState.zoom === camera.zoom) {
            return;
        }

        // 상태 업데이트
        this.lastCameraState.x = camera.scrollX;
        this.lastCameraState.y = camera.scrollY;
        this.lastCameraState.zoom = camera.zoom;

        const zoom = camera.zoom;
        const width = camera.width / zoom;
        const height = camera.height / zoom;
        const startX = camera.scrollX;
        const startY = camera.scrollY;

        this.gridGraphics.clear();
        
        // 1. 자원 매립지 그리기 (최적화: 화면 내의 자원만 그리기)
        const gridStartX = Math.floor(startX / this.gridSize);
        const gridStartY = Math.floor(startY / this.gridSize);
        const gridWidth = Math.ceil(width / this.gridSize) + 1;
        const gridHeight = Math.ceil(height / this.gridSize) + 1;

        for (let i = gridStartX; i < gridStartX + gridWidth; i++) {
            for (let j = gridStartY; j < gridStartY + gridHeight; j++) {
                const x = i * this.gridSize;
                const y = j * this.gridSize;
                const type = this.resourceMap.get(`${x},${y}`);
                if (type) {
                    const color = CONFIG.RESOURCE_PATCHES[type];
                    this.gridGraphics.fillStyle(color, 0.2);
                    this.gridGraphics.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
                }
            }
        }

        // 2. 그리드 선 그리기
        this.gridGraphics.lineStyle(1, 0x444444, 0.3);

        const offsetX = startX % this.gridSize;
        const offsetY = startY % this.gridSize;

        for (let x = startX - offsetX; x < startX + width + this.gridSize; x += this.gridSize) {
            this.gridGraphics.moveTo(x, startY);
            this.gridGraphics.lineTo(x, startY + height);
        }
        for (let y = startY - offsetY; y < startY + height + this.gridSize; y += this.gridSize) {
            this.gridGraphics.moveTo(startX, y);
            this.gridGraphics.lineTo(startX + width, y);
        }
        this.gridGraphics.strokePath();
    }

    handlePointerDown(pointer) {
        if (pointer.middleButtonDown()) return;

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / this.gridSize) * this.gridSize;
        const snappedY = Math.floor(worldPoint.y / this.gridSize) * this.gridSize;
        const key = `${snappedX},${snappedY}`;

        if (pointer.leftButtonDown()) {
            if (!this.buildings.has(key)) {
                this.placeBuilding(snappedX, snappedY, this.selectedBuildingType);
            }
        } else if (pointer.rightButtonDown()) {
            if (this.buildings.has(key)) {
                this.removeBuilding(key);
            }
        }
    }

    placeBuilding(x, y, type) {
        let building;
        const config = { rotation: this.currentRotation };

        if (type === 'MINER') {
            building = new Miner(this, x, y, config);
        } else if (type === 'CONVEYOR') {
            building = new Conveyor(this, x, y, config);
        }

        if (building) {
            this.buildings.set(`${x},${y}`, building);
        }
    }

    removeBuilding(key) {
        const building = this.buildings.get(key);
        if (building) {
            building.destroy();
            this.buildings.delete(key);
        }
    }

    runTick() {
        this.currentTick++;
        const items = this.itemManager.getItems();
        const occupiedPositions = new Set();
        items.forEach(item => occupiedPositions.add(`${item.gridX},${item.gridY}`));

        const nextMoves = new Map();
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const building = this.buildings.get(`${item.gridX},${item.gridY}`);
            
            if (building) {
                const dir = this.directions[building.rotation];
                const nextX = item.gridX + dir.x * this.gridSize;
                const nextY = item.gridY + dir.y * this.gridSize;
                const nextKey = `${nextX},${nextY}`;
                
                const nextBuilding = this.buildings.get(nextKey);
                const isNextOccupied = occupiedPositions.has(nextKey);

                if (nextBuilding && !isNextOccupied) {
                    nextMoves.set(item, { x: nextX, y: nextY });
                    occupiedPositions.add(nextKey);
                    occupiedPositions.delete(`${item.gridX},${item.gridY}`);
                }
            }
        }

        nextMoves.forEach((pos, item) => {
            item.gridX = pos.x;
            item.gridY = pos.y;
            this.tweens.add({
                targets: item.sprite,
                x: item.gridX + this.gridSize / 2,
                y: item.gridY + this.gridSize / 2,
                duration: this.tickRate,
                ease: 'Linear'
            });
        });

        this.buildings.forEach(building => {
            building.onTick(this.currentTick, occupiedPositions);
        });
    }

    tryProduceItem(miner, occupiedPositions) {
        const key = `${miner.x},${miner.y}`;
        const resourceType = this.resourceMap.get(key);

        // 해당 위치에 자원이 있을 때만 생산
        if (resourceType && !occupiedPositions.has(key)) {
            this.itemManager.spawn(miner.x, miner.y, resourceType);
            occupiedPositions.add(key);
        }
    }
}
