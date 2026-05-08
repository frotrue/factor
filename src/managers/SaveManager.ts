import MainScene from '../scenes/MainScene';
import { SaveData, SavedBuilding, SavedItem, SavedEnemy } from '../types';
import EventBus from './EventBus';
import Core from '../buildings/Core';
import { CONFIG } from '../config';
import BaseEnemy from '../enemies/BaseEnemy';

export default class SaveManager {
    scene: MainScene;
    autoSaveInterval: number;
    autoSaveTimer: number;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.autoSaveInterval = 60000;
        this.autoSaveTimer = 0;

        EventBus.on('SAVE_REQUESTED', () => {
            this.saveGame();
            this.scene.uiManager.logMessage('System: State saved successfully.');
        });
        EventBus.on('LOAD_REQUESTED', () => this.loadGame());
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
        
        const saveData: SaveData = {
            version: '1.0.0',
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
            items,
            settings: {
                gameSpeed: this.scene.gameSpeed,
                showPowerGrid: this.scene.showPowerGrid,
                showDefenseRange: this.scene.showDefenseRange,
                masterVolume: 1.0
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
            const data: SaveData = JSON.parse(saveString);

            // Clean up existing state
            this.scene.buildingManager.forEach(b => b.destroy());
            this.scene.buildingManager.buildings.clear();
            
            this.scene.itemManager.getItems().forEach(item => item.sprite.destroy());
            this.scene.itemManager.items = [];
            
            this.scene.waveManager.enemies.forEach(e => {
                if (e.sprite) e.sprite.destroy();
                if (e.hpBar) e.hpBar.destroy();
            });
            this.scene.waveManager.enemies.clear();

            // Load Resource Map
            if (data.resourceMap) {
                this.scene.mapManager.resourceMap.clear();
                data.resourceMap.forEach(r => {
                    this.scene.mapManager.resourceMap.set(r.key, r.type);
                });
                this.scene.gridRenderer.draw(true);
            }

            // Load Core
            const core = this.scene.buildingManager.place(0, 0, 'CORE', 0) as Core;
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

            // Load Buildings
            data.buildings.forEach(b => {
                const placed = this.scene.buildingManager.place(b.x, b.y, b.type, b.rotation, { customState: b.customState });
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

            // Load Wave
            this.scene.waveManager.currentWave = data.wave.currentWave;
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
            }

            this.scene.uiManager.createBuildingButtons();
            this.scene.uiManager.logMessage('System: Save file loaded successfully.');
            return true;
        } catch (e) {
            console.error('Failed to load save', e);
            this.scene.uiManager.logMessage('System: Save file corrupted.', true);
            return false;
        }
    }
}
