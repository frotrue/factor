import Phaser from 'phaser';
import { CONFIG } from '../config';
import type MainScene from '../scenes/MainScene';
import AbstractProcessor from '../buildings/AbstractProcessor';
import AccessPoint from '../buildings/AccessPoint';
import DefenseTower from '../buildings/DefenseTower';
import ModelTrainingLab from '../buildings/ModelTrainingLab';
import NeuralTrainer from '../buildings/NeuralTrainer';

export default class InputController {
    constructor(private scene: MainScene) {}

    setup(): void {
        const { scene } = this;
        scene.input.mouse!.disableContextMenu();
        scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (scene.isMobileLayout && pointer.leftButtonDown()) {
                scene.mobilePointerStartedOverUI = this.isPointerOverDomUI(pointer);
                if (scene.mobilePointerStartedOverUI) {
                    scene.mobileTouchStart = null;
                    return;
                }
                if (scene.input.pointer2?.isDown) {
                    scene.mobileMultiTouchActive = true;
                }
                scene.mobileTouchStart = { x: pointer.x, y: pointer.y, time: scene.time.now };
                return;
            }
            this.handlePointerAction(pointer, pointer.rightButtonDown() ? 'secondary' : 'primary');
        });
        scene.input.on('pointermove', () => {
            if (scene.isMobileLayout && scene.input.pointer2?.isDown) {
                scene.mobileMultiTouchActive = true;
            }
        });
        scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (!scene.isMobileLayout || !scene.mobileTouchStart) return;

            const moved = Phaser.Math.Distance.Between(pointer.x, pointer.y, scene.mobileTouchStart.x, scene.mobileTouchStart.y);
            const duration = scene.time.now - scene.mobileTouchStart.time;
            const endedOverUI = this.isPointerOverDomUI(pointer);
            scene.mobileTouchStart = null;

            if (scene.mobilePointerStartedOverUI || endedOverUI || scene.mobileMultiTouchActive || scene.input.pointer2?.isDown) {
                scene.mobilePointerStartedOverUI = false;
                if (!scene.input.pointer1?.isDown && !scene.input.pointer2?.isDown) {
                    scene.mobileMultiTouchActive = false;
                }
                return;
            }

            if (moved <= 8 && duration <= 250) {
                this.handlePointerAction(pointer, 'primary');
            } else if (moved <= 10 && duration >= 500) {
                const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
                const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
                const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
                if (!scene.buildingManager.get(`${snappedX},${snappedY}`)) {
                    this.cancelCurrentAction();
                }
            }
        });
        scene.input.keyboard!.on('keydown-R', () => this.rotateCursor());
        scene.input.keyboard!.on('keydown-F2', () => scene.togglePowerGrid());
        scene.input.keyboard!.on('keydown-F1', () => scene.toggleDefenseRange());
    }

    isPointerOverDomUI(pointer: Phaser.Input.Pointer): boolean {
        const element = document.elementFromPoint(pointer.x, pointer.y);
        if (!element) return false;

        return Boolean(element.closest([
            '#bottom-ui-container',
            '#ui-overlay',
            '#ui-tabs',
            '#top-actions',
            '#settings-modal',
            '#research-modal',
            '#training-lab-modal',
            '#game-over-screen',
            '#mobile-action-bar',
            '#mobile-cable-menu',
            '#mobile-build-summary',
            '#mobile-info-sheet',
            '#activity-log',
            '#tutorial-panel',
            '.build-btn',
            '.tab-btn',
            '.mobile-action-btn',
            '.mobile-cable-option',
            '.training-target-row'
        ].join(',')));
    }

    setupCursor(): void {
        const { scene } = this;
        scene.powerGridGraphics = scene.add.graphics();
        scene.powerGridGraphics.setDepth(10);

        scene.defenseRangeGraphics = scene.add.graphics();
        scene.defenseRangeGraphics.setDepth(11);

        scene.cableDraftGraphics = scene.add.graphics();
        scene.cableDraftGraphics.setDepth(14);

        scene.cursorContainer = scene.add.container(0, 0);
        scene.ghostGraphics = scene.add.graphics();
        scene.cursorArrow = scene.add.triangle(
            CONFIG.GRID_SIZE / 2, CONFIG.GRID_SIZE / 2,
            12, 0, 0, 12, 0, -12, 0xffffff, 1
        );
        scene.cursorArrow.setAngle(CONFIG.DIRECTIONS[scene.currentRotation].angle);
        scene.cursorContainer.add([scene.ghostGraphics, scene.cursorArrow]);
        scene.cursorContainer.setDepth(100);
        scene.cursorContainer.setAlpha(0.6);
        scene.updateCursorGraphics();
    }

    rotateCursor(): void {
        const { scene } = this;
        scene.currentRotation = (scene.currentRotation + 1) % 4;
        scene.cursorArrow.setAngle(CONFIG.DIRECTIONS[scene.currentRotation].angle);
    }

    cancelCurrentAction(): void {
        const { scene } = this;
        const wasCablePending = scene.cableState === 'CABLE_START';
        scene.cableState = 'IDLE';
        scene.cableStartKey = null;
        scene.cableDraftGraphics?.clear();
        if (wasCablePending) {
            scene.uiManager.logMessage('System: Cable connection cancelled.');
        }
        scene.uiManager.setMobileActionStatus(null);
        scene.uiManager.cancelMobileAction();
    }

    updateCursorPosition(): void {
        const { scene } = this;
        const pointer = scene.input.activePointer;
        const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        scene.cursorContainer.setPosition(snappedX, snappedY);

        const key = `${snappedX},${snappedY}`;
        const mode = scene.uiManager.getSelectedBuildingType();

        if (
            !scene.isMobileLayout &&
            pointer.leftButtonDown() &&
            !this.isPointerOverDomUI(pointer) &&
            (mode === 'CONVEYOR' || mode === 'FAST_LINK')
        ) {
            const bConfig = CONFIG.BUILDINGS[mode];
            const w = bConfig?.WIDTH || 1;
            const h = bConfig?.HEIGHT || 1;
            const isUnlocked = !bConfig.UNLOCK_REQUIRED || scene.researchManager.isUnlocked(bConfig.UNLOCK_REQUIRED);

            if (isUnlocked && !scene.isBlocked(snappedX, snappedY, w, h)) {
                scene.buildingManager.place(snappedX, snappedY, mode, scene.currentRotation);
            }
        }

        const existingBuilding = scene.buildingManager.get(key);

        if (mode !== 'REMOVE') {
            if (mode === 'BASIC' || mode === 'FIBER') {
                const cConfig = CONFIG.CABLES[mode];
                const isUnlocked = !cConfig.UNLOCK_REQUIRED || scene.researchManager.isUnlocked(cConfig.UNLOCK_REQUIRED);
                if (!isUnlocked) {
                    scene.ghostGraphics.clear();
                    scene.ghostGraphics.fillStyle(0xff0000, 0.5);
                    scene.ghostGraphics.fillRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
                } else {
                    scene.updateCursorGraphics();
                }
            } else {
                const bConfig = CONFIG.BUILDINGS[mode];
                if (bConfig) {
                    const w = bConfig.WIDTH || 1;
                    const h = bConfig.HEIGHT || 1;
                    const isUnlocked = !bConfig.UNLOCK_REQUIRED || scene.researchManager.isUnlocked(bConfig.UNLOCK_REQUIRED);

                    if (!isUnlocked || scene.isBlocked(snappedX, snappedY, w, h)) {
                        scene.ghostGraphics.clear();
                        scene.ghostGraphics.fillStyle(0xff0000, 0.5);
                        scene.ghostGraphics.fillRect(0, 0, CONFIG.GRID_SIZE * w, CONFIG.GRID_SIZE * h);
                    } else {
                        scene.updateCursorGraphics();
                    }
                }
            }
        }

        if (existingBuilding) {
            const bConfig = CONFIG.BUILDINGS[existingBuilding.type];
            let content = `Type: ${existingBuilding.type}`;

            if (bConfig.POWER) {
                if (bConfig.POWER.CONSUMPTION > 0) {
                    content += `\nPower: ${existingBuilding.hasPower ? 'OK' : 'OUTAGE'}`;
                }
                const network = scene.powerManager.getNetworkForBuilding(`${existingBuilding.x},${existingBuilding.y}`);
                if (network) {
                    content += `\nPower Network: #${network.id}`;
                    content += `\nNetwork Power: ${network.production} / ${network.consumption} W`;
                } else if (bConfig.POWER.CONSUMPTION > 0 || bConfig.POWER.PRODUCTION > 0 || (bConfig.POWER.RANGE || 0) > 0) {
                    content += `\nPower Network: None`;
                }
            }
            if (existingBuilding.inputBuffer) {
                content += `\nInput Buffer: ${existingBuilding.inputBuffer.length} / ${existingBuilding.maxBufferSize}`;
            }
            if (existingBuilding.outputBuffer) {
                content += `\nOutput Buffer: ${existingBuilding.outputBuffer.length} / ${existingBuilding.maxBufferSize}`;
            }
            if (existingBuilding instanceof AbstractProcessor) {
                content += `\nStatus: ${existingBuilding.isProcessing ? 'Processing' : 'Idle'}`;
                content += `\nRecipe: ${existingBuilding.recipe?.OUTPUT}`;
            }
            if (existingBuilding instanceof NeuralTrainer) {
                content += `\n[Left Click to Cycle Recipe]`;
            }
            if (existingBuilding instanceof ModelTrainingLab) {
                const targetType = existingBuilding.targetType;
                const targetState = targetType ? scene.getDefenseModelState(targetType) : null;
                const targetName = targetType ? CONFIG.BUILDINGS[targetType]?.NAME.split('(')[0].trim() || targetType : 'None';
                content += `\nTraining Target: ${targetName}`;
                if (targetState) {
                    content += `\nShared Confidence: ${Math.round(targetState.modelConfidence)}%`;
                    content += `\nShared Version: v${targetState.modelVersion}`;
                }
                content += `\nAuto Train: ${existingBuilding.autoTrain ? 'ON' : 'OFF'}`;
                content += `\n[Left Click to Select Model Type]`;
            }
            if (existingBuilding instanceof AccessPoint) {
                const rangeBonus = scene.researchManager.getEffectValue('AP_RANGE_BONUS', 0);
                content += `\nRelay Sessions: ${existingBuilding.bandwidth} / tick`;
                content += `\nRelayed this tick: ${existingBuilding.relaysThisTick}`;
                content += `\nWireless Range: ${existingBuilding.range + rangeBonus} tiles`;
                content += `\nMode: Session Relay`;
                content += `\nRelays: producer output to nearby receivers`;
            }
            if (existingBuilding.type === 'SOLAR_PANEL') {
                content += `\nMode: Standalone (covers self only)`;
                content += `\nDoes NOT connect to power network`;
            }
            if (bConfig.DEFENSE) {
                const damageMultiplier = scene.researchManager.getEffectValue('TOWER_DAMAGE_MULTIPLIER', 1);
                const rangeBonus = scene.researchManager.getEffectValue('TOWER_RANGE_BONUS', 0);
                const fireRateMultiplier = scene.researchManager.getEffectValue('TOWER_FIRE_RATE_MULTIPLIER', 1);
                const effectiveDamage = bConfig.DEFENSE.DAMAGE * damageMultiplier;
                const effectiveRange = bConfig.DEFENSE.RANGE + rangeBonus;
                const effectiveFireRate = Math.max(1, Math.round(bConfig.DEFENSE.FIRE_RATE * fireRateMultiplier));
                const tower = existingBuilding instanceof DefenseTower ? existingBuilding : null;
                const modelConfidence = tower?.modelConfidence ?? 35;
                const confidenceFactor = 0.6 + modelConfidence / 125;
                content += `\nModel Confidence: ${Math.round(modelConfidence)}%`;
                content += `\nModel Version: v${tower?.modelVersion ?? 1}`;
                content += `\nInference Charge: ${tower?.inferenceCharge ?? 0}`;
                content += `\nDamage: ${(effectiveDamage * confidenceFactor).toFixed(1)}`;
                content += `\nRange: ${effectiveRange} tiles`;
                content += `\nFire Rate: ${effectiveFireRate} ticks`;
                content += `\nAttack Input: Model Confidence`;
            }

            scene.uiManager.showTooltip(pointer.x, pointer.y, bConfig.NAME, content);
        } else {
            const resourceType = scene.mapManager.getResourceAt(snappedX, snappedY);
            if (resourceType) {
                const resourceName = CONFIG.ITEMS[resourceType]?.NAME || resourceType;
                scene.uiManager.showTooltip(pointer.x, pointer.y, resourceName, `Type: ${resourceType}`);
            } else {
                scene.uiManager.hideTooltip();
            }
        }
    }

    handlePointerAction(pointer: Phaser.Input.Pointer, button: 'primary' | 'secondary'): void {
        const { scene } = this;
        if (pointer.middleButtonDown()) return;
        if (this.isPointerOverDomUI(pointer)) return;

        const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const snappedX = Math.floor(worldPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(worldPoint.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const key = `${snappedX},${snappedY}`;
        const normalizedKey = scene.cableManager.normalizeKey(key, scene.buildingManager);
        const mode = scene.uiManager.getSelectedBuildingType();

        if (button === 'primary') {
            if (mode === 'REMOVE') {
                if (scene.buildingManager.has(key)) {
                    const cables = scene.cableManager.getCablesForBuilding(normalizedKey);
                    if (cables.length > 0) {
                        cables.forEach(c => scene.cableManager.disconnect(c.id));
                        scene.uiManager.logMessage(`System: ${cables.length} cable(s) disconnected.`);
                    } else {
                        scene.buildingManager.remove(key);
                    }
                }
            } else if (mode === 'BASIC' || mode === 'FIBER') {
                const cConfig = CONFIG.CABLES[mode];
                const isUnlocked = !cConfig.UNLOCK_REQUIRED || scene.researchManager.isUnlocked(cConfig.UNLOCK_REQUIRED);

                if (isUnlocked && scene.buildingManager.has(key)) {
                    if (scene.cableState === 'IDLE') {
                        scene.cableState = 'CABLE_START';
                        scene.cableStartKey = normalizedKey;
                        scene.uiManager.setMobileActionStatus('Cable: select endpoint');
                        scene.uiManager.logMessage('System: Cable start selected. Choose an endpoint.');
                    } else if (scene.cableState === 'CABLE_START') {
                        if (scene.cableStartKey === normalizedKey) {
                            scene.uiManager.logMessage('System: Select a different building for the cable endpoint.', true);
                            return;
                        }
                        if (scene.cableStartKey !== normalizedKey) {
                            const costPerTile = cConfig.COST_PER_TILE || 0;
                            if (costPerTile > 0) {
                                const canAfford = scene.inventoryManager.canAfford([{ resource: 'SILICON', amount: costPerTile }]);
                                if (!canAfford) {
                                    scene.cableState = 'IDLE';
                                    scene.cableStartKey = null;
                                    scene.uiManager.setMobileActionStatus(null);
                                    scene.uiManager.logMessage(`System: Not enough Silicon for cable. Need: ${costPerTile}`, true);
                                    return;
                                }
                            }
                            if (scene.cableManager.connect(scene.cableStartKey!, normalizedKey, mode)) {
                                if (costPerTile > 0) {
                                    scene.inventoryManager.spend([{ resource: 'SILICON', amount: costPerTile }]);
                                }
                                scene.uiManager.logMessage(`System: Cable connected.`);
                            } else {
                                scene.uiManager.logMessage(`System: Cable connection already exists.`, true);
                            }
                        }
                        scene.cableState = 'IDLE';
                        scene.cableStartKey = null;
                        scene.uiManager.setMobileActionStatus(null);
                    }
                } else if (scene.cableState === 'CABLE_START') {
                    scene.cableState = 'IDLE';
                    scene.cableStartKey = null;
                    scene.uiManager.setMobileActionStatus(null);
                    scene.uiManager.logMessage('System: Cable cancelled. Endpoint must be a building.', true);
                } else if (!isUnlocked) {
                    scene.uiManager.logMessage(`System: ${cConfig.NAME} is not unlocked.`, true);
                } else {
                    scene.uiManager.logMessage('System: Select a building to start the cable.', true);
                }
            } else {
                scene.cableState = 'IDLE';
                scene.cableStartKey = null;
                scene.uiManager.setMobileActionStatus(null);

                const existingBuilding = scene.buildingManager.get(key);
                if (existingBuilding instanceof ModelTrainingLab) {
                    scene.uiManager.openTrainingLab(existingBuilding);
                    return;
                }
                if (existingBuilding instanceof NeuralTrainer) {
                    existingBuilding.cycleRecipe();
                    return;
                }

                const bConfig = CONFIG.BUILDINGS[mode];
                if (!bConfig) return;
                const w = bConfig.WIDTH || 1;
                const h = bConfig.HEIGHT || 1;
                const isUnlocked = !bConfig.UNLOCK_REQUIRED || scene.researchManager.isUnlocked(bConfig.UNLOCK_REQUIRED);

                if (isUnlocked && !scene.isBlocked(snappedX, snappedY, w, h)) {
                    scene.buildingManager.place(snappedX, snappedY, mode, scene.currentRotation);
                }
            }
        } else if (button === 'secondary') {
            scene.cableState = 'IDLE';
            scene.cableStartKey = null;
            scene.uiManager.setMobileActionStatus(null);

            if ((mode === 'BASIC' || mode === 'FIBER') && scene.buildingManager.has(key)) {
                const cables = scene.cableManager.getCablesForBuilding(normalizedKey);
                if (cables.length > 0) {
                    cables.forEach(c => scene.cableManager.disconnect(c.id));
                    scene.uiManager.logMessage(`System: ${cables.length} cable(s) disconnected.`);
                }
            } else if (scene.buildingManager.has(key)) {
                scene.buildingManager.remove(key);
            }
        }
    }
}
