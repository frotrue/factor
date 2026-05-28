import Phaser from 'phaser';
import { CONFIG } from '../config';
import type MainScene from '../scenes/MainScene';
import AbstractProcessor from '../buildings/AbstractProcessor';
import AccessPoint from '../buildings/AccessPoint';
import DefenseTower from '../buildings/DefenseTower';
import ModelTrainingLab from '../buildings/ModelTrainingLab';
import NeuralTrainer from '../buildings/NeuralTrainer';
import { getBuildingName, getCableName, getItemName, t, textForKey } from '../i18n';
import { getSquareCoverageOffsets } from '../utils/powerPreview';
import { VISUAL_THEME } from '../visuals/visualTheme';

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
        scene.cursorContainer.add(scene.ghostGraphics);
        scene.cursorContainer.setDepth(100);
        scene.cursorContainer.setAlpha(0.6);
        scene.updateCursorGraphics();
    }

    rotateCursor(): void {
        const { scene } = this;
        scene.currentRotation = (scene.currentRotation + 1) % 4;
        scene.updateCursorGraphics();
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
                    scene.ghostGraphics.fillStyle(VISUAL_THEME.overlays.invalid, 0.34);
                    scene.ghostGraphics.fillRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
                    scene.ghostGraphics.lineStyle(2, VISUAL_THEME.overlays.invalid, 0.9);
                    scene.ghostGraphics.strokeRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
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
                        scene.ghostGraphics.fillStyle(VISUAL_THEME.overlays.invalid, 0.28);
                        scene.ghostGraphics.fillRect(0, 0, CONFIG.GRID_SIZE * w, CONFIG.GRID_SIZE * h);
                        scene.ghostGraphics.lineStyle(2, VISUAL_THEME.overlays.invalid, 0.9);
                        scene.ghostGraphics.strokeRect(0, 0, CONFIG.GRID_SIZE * w, CONFIG.GRID_SIZE * h);
                    } else {
                        scene.updateCursorGraphics();
                        this.drawPlacementRangePreview(mode, w, h);
                    }
                }
            }
        }

        if (existingBuilding) {
            const bConfig = CONFIG.BUILDINGS[existingBuilding.type];
            let content = `${textForKey('tooltip.type')}: ${existingBuilding.type}`;

            if (bConfig.POWER) {
                if (bConfig.POWER.CONSUMPTION > 0) {
                    content += `\n${textForKey('tooltip.power')}: ${existingBuilding.hasPower ? textForKey('tooltip.powerOk') : textForKey('tooltip.powerOutage')}`;
                }
                const network = scene.powerManager.getNetworkForBuilding(`${existingBuilding.x},${existingBuilding.y}`);
                if (network) {
                    content += `\n${textForKey('tooltip.powerNetwork')}: #${network.id}`;
                    content += `\n${textForKey('tooltip.networkPower')}: ${network.production} / ${network.consumption} W`;
                } else if (bConfig.POWER.CONSUMPTION > 0 || bConfig.POWER.PRODUCTION > 0 || (bConfig.POWER.RANGE || 0) > 0) {
                    content += `\n${textForKey('tooltip.powerNetwork')}: ${textForKey('tooltip.none')}`;
                }
            }
            if (existingBuilding.inputBuffer) {
                content += `\n${textForKey('tooltip.inputBuffer')}: ${existingBuilding.inputBuffer.length} / ${existingBuilding.maxBufferSize}`;
            }
            if (existingBuilding.outputBuffer) {
                content += `\n${textForKey('tooltip.outputBuffer')}: ${existingBuilding.outputBuffer.length} / ${existingBuilding.maxBufferSize}`;
            }
            if (existingBuilding instanceof AbstractProcessor) {
                content += `\n${textForKey('tooltip.status')}: ${existingBuilding.isProcessing ? textForKey('tooltip.processing') : textForKey('tooltip.idle')}`;
                content += `\n${textForKey('tooltip.recipe')}: ${existingBuilding.recipe?.OUTPUT}`;
            }
            if (existingBuilding instanceof NeuralTrainer) {
                content += `\n${textForKey('tooltip.leftClickCycleRecipe')}`;
            }
            if (existingBuilding instanceof ModelTrainingLab) {
                const targetType = existingBuilding.targetType;
                const targetState = targetType ? scene.getDefenseModelState(targetType) : null;
                const targetName = targetType ? getBuildingName(targetType) : textForKey('tooltip.none');
                content += `\n${textForKey('tooltip.trainingTarget')}: ${targetName}`;
                if (targetState) {
                    content += `\n${textForKey('tooltip.modelAccuracy')}: ${Math.round(targetState.modelAccuracy)}%`;
                    content += `\n${textForKey('tooltip.damageBonus')}: +${Math.round(targetState.damageBonus)}%`;
                    content += `\n${textForKey('tooltip.sharedVersion')}: v${targetState.modelVersion}`;
                }
                content += `\n${textForKey('tooltip.autoTrain')}: ${existingBuilding.autoTrain ? textForKey('tooltip.on') : textForKey('tooltip.off')}`;
                content += `\n${textForKey('tooltip.leftClickSelectModel')}`;
            }
            if (existingBuilding instanceof AccessPoint) {
                const rangeBonus = scene.researchManager.getEffectValue('AP_RANGE_BONUS', 0);
                content += `\n${textForKey('tooltip.relaySessions')}: ${existingBuilding.bandwidth} / tick`;
                content += `\n${textForKey('tooltip.relayedThisTick')}: ${existingBuilding.relaysThisTick}`;
                content += `\n${textForKey('tooltip.wirelessRange')}: ${existingBuilding.range + rangeBonus} tiles`;
                content += `\n${textForKey('tooltip.mode')}: Session Relay`;
                content += `\n${textForKey('tooltip.relays')}: producer output to nearby receivers`;
            }
            if (existingBuilding.type === 'SOLAR_PANEL') {
                content += `\n${textForKey('tooltip.solarStandalone')}`;
                content += `\n${textForKey('tooltip.solarNoNetwork')}`;
            }
            if (bConfig.DEFENSE) {
                const damageMultiplier = scene.researchManager.getEffectValue('TOWER_DAMAGE_MULTIPLIER', 1);
                const rangeBonus = scene.researchManager.getEffectValue('TOWER_RANGE_BONUS', 0);
                const fireRateMultiplier = scene.researchManager.getEffectValue('TOWER_FIRE_RATE_MULTIPLIER', 1);
                const effectiveDamage = bConfig.DEFENSE.DAMAGE * damageMultiplier;
                const effectiveRange = bConfig.DEFENSE.RANGE + rangeBonus;
                const effectiveFireRate = Math.max(1, Math.round(bConfig.DEFENSE.FIRE_RATE * fireRateMultiplier));
                const tower = existingBuilding instanceof DefenseTower ? existingBuilding : null;
                const modelConfidence = tower?.modelConfidence ?? CONFIG.MODEL_TRAINING.BASE_ACCURACY;
                const damageBonus = tower?.damageBonus ?? 0;
                const confidenceFactor = 0.6 + modelConfidence / 125;
                const modelDamageMultiplier = 1 + damageBonus / 100;
                content += `\n${textForKey('tooltip.modelAccuracy')}: ${Math.round(modelConfidence)}%`;
                content += `\n${textForKey('tooltip.damageBonus')}: +${Math.round(damageBonus)}%`;
                content += `\n${textForKey('tooltip.modelVersion')}: v${tower?.modelVersion ?? 1}`;
                content += `\n${textForKey('tooltip.inferenceCharge')}: ${tower?.inferenceCharge ?? 0}`;
                content += `\n${textForKey('tooltip.damage')}: ${(effectiveDamage * confidenceFactor * modelDamageMultiplier).toFixed(1)}`;
                content += `\n${textForKey('tooltip.range')}: ${effectiveRange} tiles`;
                content += `\n${textForKey('tooltip.fireRate')}: ${effectiveFireRate} ticks`;
                content += `\n${textForKey('tooltip.attackInput')}: ${textForKey('tooltip.modelAccuracy')}`;
            }

            scene.uiManager.showTooltip(pointer.x, pointer.y, getBuildingName(existingBuilding.type), content);
        } else {
            const resourceType = scene.mapManager.getResourceAt(snappedX, snappedY);
            const terrainType = scene.mapManager.getTerrainAt(snappedX, snappedY);
            if (resourceType) {
                const resourceName = getItemName(resourceType);
                scene.uiManager.showTooltip(pointer.x, pointer.y, resourceName, `${textForKey('tooltip.type')}: ${resourceType}`);
            } else if (terrainType === 'BLOCKER') {
                const title = textForKey('terrain.BLOCKER.name');
                const content = `${textForKey('tooltip.type')}: ${textForKey('tooltip.terrain')}\n${textForKey('tooltip.blockerDescription')}`;
                scene.uiManager.showTooltip(pointer.x, pointer.y, title, content);
            } else {
                scene.uiManager.hideTooltip();
            }
        }
    }

    private drawPlacementRangePreview(type: string, width: number, height: number): void {
        const { scene } = this;
        const bConfig = CONFIG.BUILDINGS[type];
        if (!bConfig) return;

        let range = 0;
        let color: number = VISUAL_THEME.overlays.valid;
        if (bConfig.DEFENSE?.RANGE) {
            range = bConfig.DEFENSE.RANGE + scene.researchManager.getEffectValue('TOWER_RANGE_BONUS', 0);
            color = VISUAL_THEME.overlays.defense;
        } else if ((bConfig.POWER?.RANGE || 0) > 0) {
            range = bConfig.POWER.RANGE || 0;
            color = VISUAL_THEME.overlays.power;
            this.drawSquareCoveragePreview(range, color);
            return;
        } else if (type === 'ACCESS_POINT') {
            range = CONFIG.ACCESS_POINT.RANGE + scene.researchManager.getEffectValue('AP_RANGE_BONUS', 0);
            color = VISUAL_THEME.cables.wireless;
        }

        if (range <= 0) return;

        const centerX = (CONFIG.GRID_SIZE * width) / 2;
        const centerY = (CONFIG.GRID_SIZE * height) / 2;
        const radius = range * CONFIG.GRID_SIZE;
        scene.ghostGraphics.fillStyle(color, 0.08);
        scene.ghostGraphics.fillCircle(centerX, centerY, radius);
        scene.ghostGraphics.lineStyle(2, color, 0.52);
        scene.ghostGraphics.strokeCircle(centerX, centerY, radius);
    }

    private drawSquareCoveragePreview(range: number, color: number): void {
        const { scene } = this;
        scene.ghostGraphics.fillStyle(color, 0.12);
        scene.ghostGraphics.lineStyle(1, color, 0.5);
        getSquareCoverageOffsets(range).forEach(({ dx, dy }) => {
            scene.ghostGraphics.fillRect(dx * CONFIG.GRID_SIZE, dy * CONFIG.GRID_SIZE, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            scene.ghostGraphics.strokeRect(dx * CONFIG.GRID_SIZE, dy * CONFIG.GRID_SIZE, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
        });
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
                        scene.uiManager.setMobileActionStatus(t('action.cableEndpoint'));
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
                    scene.uiManager.logMessage(t('log.cableLocked', { name: getCableName(mode) }), true);
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
