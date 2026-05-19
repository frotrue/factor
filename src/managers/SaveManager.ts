import MainScene from '../scenes/MainScene';
import { SaveData, SavedBuilding, SavedItem, SavedEnemy } from '../types';
import EventBus from './EventBus';
import Core from '../buildings/Core';
import { CONFIG } from '../config';
import { getLanguage, setLanguage } from '../i18n';
import BaseEnemy from '../enemies/BaseEnemy';
import { CURRENT_SAVE_VERSION, migrateSaveData } from '../utils/saveMigration';

export default class SaveManager {
    scene: MainScene;
    autoSaveInterval: number;
    autoSaveTimer: number;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.autoSaveInterval = CONFIG.TIMING.AUTO_SAVE_INTERVAL_MS;
        this.autoSaveTimer = 0;

        EventBus.on('SAVE_REQUESTED', () => {
            this.saveGame();
            this.scene.uiManager.logMessage(this.scene.uiManager.getText('log.saved'));
        }, 'SaveManager');
        EventBus.on('LOAD_REQUESTED', () => this.loadGame(), 'SaveManager');
    }

    update(delta: number): void {
        this.autoSaveTimer += delta;
        if (this.autoSaveTimer >= this.autoSaveInterval) {
            this.saveGame();
            this.autoSaveTimer = 0;
            this.scene.uiManager.logMessage('System: Auto-saved successfully.');
        }
    }

    saveGame(): void {
        const buildings: SavedBuilding[] = [];
        this.scene.buildingManager.forEach(b => {
            if (b.type === 'CORE') return;
            let customState: any = undefined;
            if ((b as any).getCustomState) {
                customState = (b as any).getCustomState();
            } else if (b.type === 'NEURAL_TRAINER') {
                customState = { recipe: (b as any).recipe.OUTPUT };
            }
            buildings.push({
                x: b.x,
                y: b.y,
                type: b.type,
                rotation: b.rotation,
                inputBuffer: [...b.inputBuffer],
                outputBuffer: [...b.outputBuffer],
                customState
            });
        });

        const items: SavedItem[] = [];
        this.scene.itemManager.getItems().forEach(item => {
            items.push({
                x: item.gridX,
                y: item.gridY,
                type: item.type
            });
        });

        const cables = Array.from(this.scene.cableManager.cables.values()).map(c => ({
            fromKey: c.fromKey,
            toKey: c.toKey,
            cableType: c.cableType,
            queue: [...c.queue]
        }));

        const enemies: SavedEnemy[] = [];
        this.scene.waveManager.enemies.forEach(e => {
            enemies.push({
                id: e.id,
                type: e.type,
                x: e.x,
                y: e.y,
                hp: e.hp
            });
        });

        const resourceMapArray: { key: string; type: string }[] = [];
        this.scene.mapManager.getResourceMap().forEach((type, key) => {
            resourceMapArray.push({ key, type });
        });

        const coreBuilding = this.scene.buildingManager.get(`0,0`) as Core | null;
        const audioSettings = this.scene.soundManager?.getSettings?.() ?? { masterVolume: 0.6, muted: false };
        
        const saveData: SaveData = {
            version: CURRENT_SAVE_VERSION,
            timestamp: Date.now(),
            wave: {
                currentWave: this.scene.waveManager.currentWave,
                waveTimer: this.scene.waveManager.waveTimer,
                enemiesSpawned: this.scene.waveManager.enemiesSpawned,
                enemiesToSpawn: this.scene.waveManager.enemiesToSpawn,
                enemies,
                hpMultiplier: this.scene.waveManager.hpMultiplier,
                enemyIdCounter: this.scene.waveManager.enemyIdCounter
            },
            core: {
                hp: coreBuilding ? coreBuilding.hp : 1000,
                totalDataReceived: coreBuilding ? coreBuilding.totalDataReceived : 0,
                confidenceScore: coreBuilding ? coreBuilding.confidenceScore : 0
            },
            buildings,
            defenseModelStates: this.scene.defenseModelStates,
            items,
            cables,
            settings: {
                gameSpeed: this.scene.gameSpeed,
                showPowerGrid: this.scene.showPowerGrid,
                showDefenseRange: this.scene.showDefenseRange,
                difficulty: this.scene.difficultyId,
                language: getLanguage(),
                masterVolume: audioSettings.masterVolume,
                muted: audioSettings.muted,
                tutorialCompleted: this.scene.tutorialManager?.isCompleted?.() ?? false,
                tutorialStep: this.scene.tutorialManager?.getSavedStep?.() ?? 0
            },
            resourceMap: resourceMapArray,
            research: this.scene.researchManager.getUnlockedResearch()
        };

        localStorage.setItem('neural_factory_save', JSON.stringify(saveData));
    }

    loadGame(): boolean {
        const saveString = localStorage.getItem('neural_factory_save');
        if (!saveString) return false;

        try {
            const data: SaveData = this.migrate(JSON.parse(saveString));

            // Clean up existing state
            this.scene.buildingManager.forEach(b => b.destroy());
            this.scene.buildingManager.buildings.clear();
            
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
                this.scene.gridRenderer.draw(true);
            }

            // Load Core
            const core = this.scene.buildingManager.place(0, 0, 'CORE', 0, { skipCost: true }) as Core;
            if (core) {
                core.hp = data.core.hp;
                core.totalDataReceived = data.core.totalDataReceived;
                core.confidenceScore = data.core.confidenceScore;
                core.drawHpBar();
                EventBus.emit('CORE_DATA_RECEIVED', { 
                    type: 'LOAD', 
                    score: core.confidenceScore, 
                    total: core.totalDataReceived 
                });
            }

            // Load Research
            if (data.research) {
                this.scene.researchManager.loadUnlockedResearch(data.research);
            } else {
                this.scene.researchManager.loadUnlockedResearch([]);
            }

            this.scene.initializeDefenseModelStates();
            if (data.defenseModelStates) {
                Object.entries(data.defenseModelStates).forEach(([type, state]) => {
                    this.scene.defenseModelStates[type] = {
                        modelConfidence: Math.max(0, Math.min(100, state.modelConfidence ?? 35)),
                        modelVersion: Math.max(1, state.modelVersion ?? 1),
                        inferenceCharge: Math.max(0, state.inferenceCharge ?? 0)
                    };
                });
            } else {
                data.buildings.forEach(b => {
                    if (!CONFIG.BUILDINGS[b.type]?.DEFENSE || !b.customState) return;
                    this.scene.defenseModelStates[b.type] = {
                        modelConfidence: Math.max(0, Math.min(100, b.customState.modelConfidence ?? 35)),
                        modelVersion: Math.max(1, b.customState.modelVersion ?? 1),
                        inferenceCharge: Math.max(0, b.customState.inferenceCharge ?? 0)
                    };
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
                    if (this.scene.cableManager.connect(c.fromKey, c.toKey, cableType)) {
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
                const enemy = new BaseEnemy(this.scene, e.type, e.x, e.y, 1, e.id, this.scene.buildingManager);
                enemy.maxHp = CONFIG.ENEMIES[e.type].BASE_HP * data.wave.hpMultiplier;
                enemy.hp = e.hp;
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
