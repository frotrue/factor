import MainScene from '../scenes/MainScene';
import { SaveData, SavedBuilding, SavedItem, SavedEnemy, SavedCable } from '../types';
import EventBus from './EventBus';
import Core from '../buildings/Core';
import { CONFIG, CORE_KEY, CORE_PIXEL_X, CORE_PIXEL_Y } from '../config';
import { getLanguage, setLanguage } from '../i18n';
import BaseEnemy from '../enemies/BaseEnemy';
import { CURRENT_SAVE_VERSION, migrateSaveData } from '../utils/saveMigration';
import { getRestoredEnemyHp } from '../utils/enemyRestore';
import { normalizeDefenseModelState } from '../utils/modelTrainingProgress';

export default class SaveManager {
    scene: MainScene;
    autoSaveInterval: number;
    autoSaveTimer: number;
    private saveDirty: boolean;
    private autoSavePending: boolean;
    private autoSaveHandle: number | null;
    private autoSaveHandleIsIdle: boolean;
    private autoSaveToken: number;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.autoSaveInterval = CONFIG.TIMING.AUTO_SAVE_INTERVAL_MS;
        this.autoSaveTimer = 0;
        this.saveDirty = true;
        this.autoSavePending = false;
        this.autoSaveHandle = null;
        this.autoSaveHandleIsIdle = false;
        this.autoSaveToken = 0;

        EventBus.on('SAVE_REQUESTED', () => {
            this.cancelScheduledAutoSave();
            if (this.saveGame()) {
                this.scene.uiManager.logMessage(this.scene.uiManager.getText('log.saved'));
            }
        }, 'SaveManager');
        EventBus.on('LOAD_REQUESTED', () => this.loadGame(), 'SaveManager');
        [
            'BUILDING_PLACED',
            'BUILDING_REMOVED',
            'BUILDING_DAMAGED',
            'BUILDING_DESTROYED',
            'CABLE_CONNECTED',
            'CORE_DAMAGED',
            'CORE_DATA_RECEIVED',
            'ENEMY_KILLED',
            'GAME_SPEED_CHANGED',
            'MODEL_TRAINING_TARGET_SET',
            'RESEARCH_UNLOCKED',
            'WAVE_STARTED',
            'WAVE_ENDED'
        ].forEach(event => {
            EventBus.on(event as any, () => this.markDirty(), 'SaveManager');
        });
    }

    update(delta: number): void {
        if (this.autoSavePending) return;

        this.autoSaveTimer += delta;
        if (this.autoSaveTimer >= this.autoSaveInterval) {
            this.autoSaveTimer = 0;
            if (this.shouldAutoSave()) {
                this.scheduleAutoSave();
            } else {
                this.scene.performanceStats?.increment('autosaveSkipped');
            }
        }
    }

    saveGame(): boolean {
        if (this.scene.mode === 'tutorial') {
            return false;
        }

        const saveData = this.createSaveData(this.collectSavePayloadSync());

        localStorage.setItem('gradium_save', JSON.stringify(saveData));
        this.scene.performanceStats?.increment('saveWrites');
        this.saveDirty = false;
        return true;
    }

    markDirty(): void {
        this.saveDirty = true;
    }

    private shouldAutoSave(): boolean {
        if (this.saveDirty) return true;
        if (this.scene.waveManager.waveActive || this.scene.waveManager.enemies.size > 0) return true;
        if (this.scene.itemManager.getItems().length > 0) return true;

        for (const cable of this.scene.cableManager.cables.values()) {
            if (cable.queue.length > 0) return true;
        }
        return false;
    }

    private scheduleAutoSave(): void {
        if (this.autoSavePending) return;
        this.autoSavePending = true;
        const token = ++this.autoSaveToken;

        const runSave = async () => {
            this.autoSaveHandle = null;
            try {
                const saved = await this.saveGameChunked(token);
                if (token !== this.autoSaveToken) return;
                this.autoSavePending = false;
                if (saved) {
                    this.scene.uiManager.logMessage('System: Auto-saved successfully.');
                }
            } catch (error) {
                if (token === this.autoSaveToken) {
                    this.autoSavePending = false;
                }
                console.error('Failed to auto-save', error);
            }
        };

        this.autoSaveHandleIsIdle = false;
        this.autoSaveHandle = window.setTimeout(runSave, 0);
    }

    private cancelScheduledAutoSave(): void {
        this.autoSaveToken++;
        if (this.autoSaveHandle === null) return;

        if (this.autoSaveHandleIsIdle) {
            (window as any).cancelIdleCallback?.(this.autoSaveHandle);
        } else {
            window.clearTimeout(this.autoSaveHandle);
        }
        this.autoSaveHandle = null;
        this.autoSavePending = false;
    }

    private async saveGameChunked(token: number): Promise<boolean> {
        if (this.scene.mode === 'tutorial') {
            return false;
        }

        const payload = await this.collectSavePayloadChunked(token);
        if (!payload || token !== this.autoSaveToken) return false;

        const saveData = this.createSaveData(payload);
        if (!await this.waitForIdle(token)) return false;

        localStorage.setItem('gradium_save', JSON.stringify(saveData));
        this.scene.performanceStats?.increment('saveWrites');
        this.saveDirty = false;
        return true;
    }

    private collectSavePayloadSync() {
        const buildings: SavedBuilding[] = [];
        this.scene.buildingManager.getUniqueBuildings().forEach(building => {
            const saved = this.serializeBuilding(building);
            if (saved) buildings.push(saved);
        });

        const items: SavedItem[] = this.scene.itemManager.getItems().map(item => ({
            x: item.gridX,
            y: item.gridY,
            type: item.type
        }));

        const cables: SavedCable[] = Array.from(this.scene.cableManager.cables.values()).map(cable => ({
            fromKey: cable.fromKey,
            toKey: cable.toKey,
            cableType: cable.cableType,
            queue: [...cable.queue],
            costPaid: cable.costPaid
        }));

        const enemies: SavedEnemy[] = Array.from(this.scene.waveManager.enemies.values()).map(enemy => ({
            id: enemy.id,
            type: enemy.type,
            x: enemy.x,
            y: enemy.y,
            hp: enemy.hp
        }));

        const resourceMap: { key: string; type: string }[] = [];
        this.scene.mapManager.getResourceMap().forEach((type, key) => resourceMap.push({ key, type }));

        const terrainMap: { key: string; type: string }[] = [];
        this.scene.mapManager.getTerrainMap().forEach((type, key) => terrainMap.push({ key, type }));

        return { buildings, items, cables, enemies, resourceMap, terrainMap };
    }

    private async collectSavePayloadChunked(token: number): Promise<ReturnType<SaveManager['collectSavePayloadSync']> | null> {
        const buildings = await this.collectChunked(
            this.scene.buildingManager.getUniqueBuildings(),
            250,
            building => this.serializeBuilding(building),
            token
        );
        if (!buildings) return null;

        const items = await this.collectChunked(
            this.scene.itemManager.getItems(),
            250,
            item => ({ x: item.gridX, y: item.gridY, type: item.type }),
            token
        );
        if (!items) return null;

        const cables = await this.collectChunked(
            this.scene.cableManager.cables.values(),
            250,
            cable => ({
                fromKey: cable.fromKey,
                toKey: cable.toKey,
                cableType: cable.cableType,
                queue: [...cable.queue],
                costPaid: cable.costPaid
            }),
            token
        );
        if (!cables) return null;

        const enemies = await this.collectChunked(
            this.scene.waveManager.enemies.values(),
            250,
            enemy => ({
                id: enemy.id,
                type: enemy.type,
                x: enemy.x,
                y: enemy.y,
                hp: enemy.hp
            }),
            token
        );
        if (!enemies) return null;

        const resourceMap = await this.collectChunked(
            this.scene.mapManager.getResourceMap().entries(),
            2000,
            ([key, type]) => ({ key, type }),
            token
        );
        if (!resourceMap) return null;

        const terrainMap = await this.collectChunked(
            this.scene.mapManager.getTerrainMap().entries(),
            2000,
            ([key, type]) => ({ key, type }),
            token
        );
        if (!terrainMap) return null;

        return { buildings, items, cables, enemies, resourceMap, terrainMap };
    }

    private async collectChunked<T, U>(
        source: Iterable<T>,
        chunkSize: number,
        mapItem: (item: T) => U | null,
        token: number
    ): Promise<U[] | null> {
        const result: U[] = [];
        let processed = 0;

        for (const item of source) {
            if (token !== this.autoSaveToken) return null;

            const mapped = mapItem(item);
            if (mapped) result.push(mapped);
            processed++;

            if (processed >= chunkSize) {
                processed = 0;
                this.scene.performanceStats?.increment('autosaveChunks');
                if (!await this.waitForIdle(token)) return null;
            }
        }

        return result;
    }

    private waitForIdle(token: number): Promise<boolean> {
        if (token !== this.autoSaveToken) return Promise.resolve(false);

        return new Promise(resolve => {
            const complete = () => {
                if (this.autoSaveHandle !== null) {
                    this.autoSaveHandle = null;
                }
                resolve(token === this.autoSaveToken);
            };
            this.autoSaveHandleIsIdle = false;
            this.autoSaveHandle = window.setTimeout(complete, 0);
        });
    }

    private serializeBuilding(building: any): SavedBuilding | null {
        if (building.type === 'CORE') return null;

        let customState: any = undefined;
        if (building.getCustomState) {
            customState = building.getCustomState();
        } else if (building.type === 'NEURAL_TRAINER') {
            customState = { recipe: building.recipe.OUTPUT };
        }

        return {
            x: building.x,
            y: building.y,
            type: building.type,
            rotation: building.rotation,
            inputBuffer: [...building.inputBuffer],
            outputBuffer: [...building.outputBuffer],
            hp: building.hp,
            customState
        };
    }

    private createSaveData(payload: ReturnType<SaveManager['collectSavePayloadSync']>): SaveData {
        const coreBuilding = this.scene.buildingManager.get(CORE_KEY) as Core | null;
        const audioSettings = this.scene.soundManager?.getSettings?.() ?? { masterVolume: 0.6, muted: false };

        return {
            version: CURRENT_SAVE_VERSION,
            timestamp: Date.now(),
            wave: {
                currentWave: this.scene.waveManager.currentWave,
                waveTimer: this.scene.waveManager.waveTimer,
                enemiesSpawned: this.scene.waveManager.enemiesSpawned,
                enemiesToSpawn: this.scene.waveManager.enemiesToSpawn,
                enemies: payload.enemies,
                hpMultiplier: this.scene.waveManager.hpMultiplier,
                enemyIdCounter: this.scene.waveManager.enemyIdCounter
            },
            core: {
                hp: coreBuilding ? coreBuilding.hp : 1000,
                totalDataReceived: coreBuilding ? coreBuilding.totalDataReceived : 0
            },
            buildings: payload.buildings,
            defenseModelStates: this.scene.defenseModelStates,
            labJobProgress: this.scene.researchManager.getSavedJobProgress(),
            trainingPlanner: this.scene.trainingPlanner.getState(),
            items: payload.items,
            cables: payload.cables,
            settings: {
                gameSpeed: this.scene.gameSpeed,
                showPowerGrid: this.scene.showPowerGrid,
                showDefenseRange: this.scene.showDefenseRange,
                bloomEnabled: this.scene.bloomEnabled,
                difficulty: this.scene.difficultyId,
                language: getLanguage(),
                masterVolume: audioSettings.masterVolume,
                muted: audioSettings.muted,
                tutorialCompleted: this.scene.tutorialManager?.isCompleted?.() ?? false,
                tutorialStep: this.scene.tutorialManager?.getSavedStep?.() ?? 0,
                mapType: this.scene.mapManager.mapType,
                mapPresetId: this.scene.mapManager.mapPresetId,
                mapSeed: this.scene.mapManager.mapSeed ?? undefined
            },
            resourceMap: payload.resourceMap,
            terrainMap: payload.terrainMap,
            research: this.scene.researchManager.getUnlockedResearch()
        };
    }

    loadGame(): boolean {
        if (this.scene.mode === 'tutorial') return false;
        this.cancelScheduledAutoSave();

        const saveString = localStorage.getItem('gradium_save');
        if (!saveString) return false;

        try {
            const data: SaveData = this.migrate(JSON.parse(saveString));

            // Clean up existing state
            this.scene.buildingManager.forEach(b => b.destroy());
            this.scene.buildingManager.clear();

            this.scene.itemManager.getItems().forEach(item => item.sprite.destroy());
            this.scene.itemManager.items = [];

            this.scene.waveManager.enemies.forEach(e => {
                if (e.sprite) e.sprite.destroy();
                if (e.hpBar) e.hpBar.destroy();
                if ((e as any).statusGraphics) (e as any).statusGraphics.destroy();
                if ((e as any).auraGraphics) (e as any).auraGraphics.destroy();
            });
            this.scene.waveManager.enemies.clear();

            this.scene.cableManager.cables.clear();
            this.scene.cableManager.apConnections.clear();
            this.scene.cableManager.graphics.clear();

            // Load Resource Map
            if (data.resourceMap) {
                this.scene.mapManager.resourceMap.clear();
                data.resourceMap.forEach(r => {
                    this.scene.mapManager.resourceMap.set(r.key, r.type);
                });
            }
            this.scene.mapManager.mapType = data.settings?.mapType ?? 'random';
            this.scene.mapManager.mapPresetId = data.settings?.mapPresetId ?? 'standard';
            this.scene.mapManager.mapSeed = data.settings?.mapSeed ?? null;
            this.scene.mapManager.terrainMap.clear();
            if (data.terrainMap && data.terrainMap.length > 0) {
                data.terrainMap.forEach(r => {
                    this.scene.mapManager.terrainMap.set(r.key, r.type);
                });
            } else {
                this.scene.mapManager.addEarlyLaneBlockers();
            }
            this.scene.gridRenderer.draw(true);

            // Load Core
            const core = this.scene.buildingManager.place(CORE_PIXEL_X, CORE_PIXEL_Y, 'CORE', 0, { skipCost: true }) as Core;
            if (core) {
                core.hp = data.core.hp;
                core.totalDataReceived = data.core.totalDataReceived;
                core.drawHpBar();
                EventBus.emit('CORE_DATA_RECEIVED', {
                    type: 'LOAD',
                    score: core.totalDataReceived,
                    total: core.totalDataReceived
                });
            }

            // Load Research
            if (data.research) {
                this.scene.researchManager.loadUnlockedResearch(data.research);
            } else {
                this.scene.researchManager.loadUnlockedResearch([]);
            }
            this.scene.researchManager.loadJobProgress(data.labJobProgress || {});
            this.scene.trainingPlanner.loadState(data.trainingPlanner || {});

            this.scene.initializeDefenseModelStates();
            if (data.defenseModelStates) {
                Object.entries(data.defenseModelStates).forEach(([type, state]) => {
                    this.scene.defenseModelStates[type] = normalizeDefenseModelState(state as any);
                });
            } else {
                data.buildings.forEach(b => {
                    if (!CONFIG.BUILDINGS[b.type]?.DEFENSE || !b.customState) return;
                    this.scene.defenseModelStates[b.type] = normalizeDefenseModelState(b.customState);
                });
            }

            // Load Buildings
            data.buildings.forEach(b => {
                const placed = this.scene.buildingManager.place(b.x, b.y, b.type, b.rotation, {
                    customState: b.customState,
                    skipCost: true
                });
                if (placed) {
                    placed.inputBuffer = b.inputBuffer || [];
                    placed.outputBuffer = b.outputBuffer || [];
                    if (typeof b.hp === 'number') {
                        placed.hp = Math.max(0, Math.min(placed.maxHp, b.hp));
                        placed.ensureHpBar();
                        placed.drawHpBar();
                    }
                    if (placed.type === 'NEURAL_TRAINER' && b.customState && b.customState.recipe) {
                        const recipeKey = Object.keys(CONFIG.RECIPES).find(k => CONFIG.RECIPES[k].OUTPUT === b.customState.recipe);
                        if (recipeKey) {
                            (placed as any).recipe = CONFIG.RECIPES[recipeKey];
                        }
                    }
                }
            });

            // Load Items
            data.items.forEach(i => {
                this.scene.itemManager.spawn(i.x, i.y, i.type);
            });

            // Load Cables
            if (data.cables) {
                data.cables.forEach(c => {
                    const cableType = c.cableType === 'FIBER' ? 'FIBER' : 'BASIC';
                    const fallbackCost = typeof c.costPaid === 'number'
                        ? c.costPaid
                        : this.scene.cableManager.getCableCost(c.fromKey, c.toKey, cableType);
                    if (this.scene.cableManager.connect(c.fromKey, c.toKey, cableType, { skipValidation: true, costPaid: fallbackCost })) {
                        const id = this.scene.cableManager.makeCableId(c.fromKey, c.toKey);
                        const cable = this.scene.cableManager.cables.get(id);
                        if (cable) {
                            cable.queue = (c.queue || []).map(packet =>
                                this.scene.cableManager.normalizeQueuedPacket(packet, cable.flowDirection || 'FORWARD')
                            );
                        }
                    }
                });
                this.scene.cableManager.dirty = true;
                this.scene.cableManager.apDirty = true;
            }

            // Load Wave
            this.scene.waveManager.currentWave = data.wave.currentWave;
            this.scene.difficultyId = data.settings?.difficulty || this.scene.difficultyId || 'NORMAL';
            this.scene.waveManager.setDifficulty(this.scene.difficultyId);
            this.scene.waveManager.waveTimer = data.wave.waveTimer;
            this.scene.waveManager.enemiesSpawned = data.wave.enemiesSpawned;
            this.scene.waveManager.enemiesToSpawn = data.wave.enemiesToSpawn;
            this.scene.waveManager.hpMultiplier = data.wave.hpMultiplier;
            this.scene.waveManager.enemyIdCounter = data.wave.enemyIdCounter;

            if (data.wave.currentWave > 0 && data.wave.enemiesSpawned < data.wave.enemiesToSpawn) {
                this.scene.waveManager.waveActive = true;
                EventBus.emit('WAVE_STARTED', { wave: data.wave.currentWave });
            }

            data.wave.enemies.forEach(e => {
                const enemy = new BaseEnemy(this.scene, e.type, e.x, e.y, this.scene.waveManager.getEffectiveHpMultiplier(), e.id, this.scene.buildingManager);
                const restoredHp = getRestoredEnemyHp(e.type, e.hp, this.scene.waveManager.getEffectiveHpMultiplier());
                enemy.maxHp = restoredHp.maxHp;
                enemy.hp = restoredHp.hp;
                enemy.drawHpBar();
                this.scene.waveManager.enemies.set(e.id, enemy);
            });

            // Load Settings
            if (data.settings) {
                this.scene.setGameSpeed(data.settings.gameSpeed || 1);

                this.scene.showPowerGrid = data.settings.showPowerGrid;
                this.scene.powerGridDirty = true;

                this.scene.showDefenseRange = data.settings.showDefenseRange;
                this.scene.defenseRangeDirty = true;

                this.scene.setBloomEnabled(typeof data.settings.bloomEnabled === 'boolean' ? data.settings.bloomEnabled : true);

                this.scene.soundManager?.setSettings?.(
                    typeof data.settings.masterVolume === 'number' ? data.settings.masterVolume : 0.6,
                    Boolean(data.settings.muted)
                );
                if (data.settings.language) {
                    setLanguage(data.settings.language);
                }
                this.scene.tutorialManager?.loadState?.(
                    Boolean(data.settings.tutorialCompleted),
                    data.settings.tutorialStep
                );
            }

            this.scene.uiManager.createBuildingButtons();
            this.scene.powerManager.updatePowerGrid();
            this.scene.powerGridDirty = true;
            this.scene.defenseRangeDirty = true;
            this.scene.uiManager.logMessage(this.scene.uiManager.getText('log.loaded'));
            return true;
        } catch (e) {
            console.error('Failed to load save', e);
            this.scene.uiManager.logMessage(this.scene.uiManager.getText('log.corrupted'), true);
            return false;
        }
    }

    migrate(rawData: any): SaveData {
        return migrateSaveData(rawData, this.scene.difficultyId ?? 'NORMAL');
    }
}
