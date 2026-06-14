import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG, CORE_KEY, CORE_PIXEL_X, CORE_PIXEL_Y } from '../config';
import { CURRENT_SAVE_VERSION } from '../utils/saveMigration';
import EventBus from './EventBus';
import SaveManager from './SaveManager';

vi.mock('phaser', () => ({
    default: {
        Scene: class {}
    }
}));

type StoredValue = Record<string, string>;

function installBrowserStorage() {
    const store: StoredValue = {};
    const storage = {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            Object.keys(store).forEach(key => delete store[key]);
        })
    };
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {
        localStorage: storage,
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
        dispatchEvent: vi.fn()
    });
    return { storage, store };
}

function createBuilding(type: string, x = 0, y = 0): any {
    return {
        type,
        x,
        y,
        rotation: 0,
        inputBuffer: [],
        outputBuffer: [],
        hp: CONFIG.BUILDINGS[type]?.HP ?? 100,
        maxHp: CONFIG.BUILDINGS[type]?.HP ?? 100,
        totalDataReceived: 0,
        destroy: vi.fn(),
        drawHpBar: vi.fn(),
        ensureHpBar: vi.fn()
    };
}

function createScene(overrides: Partial<any> = {}) {
    const buildings = new Map<string, any>();
    const placedTypes: string[] = [];
    const scene: any = {
        mode: 'campaign',
        difficultyId: 'NORMAL',
        gameSpeed: 1,
        showPowerGrid: false,
        showDefenseRange: false,
        bloomEnabled: true,
        defenseModelStates: {},
        buildingManager: {
            getUniqueBuildings: () => Array.from(buildings.values()),
            forEach: (callback: (building: any) => void) => Array.from(buildings.values()).forEach(callback),
            clear: () => buildings.clear(),
            get: (key: string) => buildings.get(key) ?? null,
            place: vi.fn((x: number, y: number, type: string) => {
                placedTypes.push(type);
                const building = createBuilding(type, x, y);
                buildings.set(`${x},${y}`, building);
                return building;
            })
        },
        itemManager: {
            items: [],
            getItems: () => [],
            spawn: vi.fn()
        },
        waveManager: {
            currentWave: 0,
            waveTimer: CONFIG.TIMING.INITIAL_WAVE_DELAY_MS,
            enemiesSpawned: 0,
            enemiesToSpawn: 0,
            hpMultiplier: 1,
            enemyIdCounter: 0,
            waveActive: false,
            enemies: new Map(),
            setDifficulty: vi.fn(),
            getEffectiveHpMultiplier: () => 1
        },
        cableManager: {
            cables: new Map(),
            apConnections: new Map(),
            graphics: { clear: vi.fn() },
            getCableCost: vi.fn(() => 1),
            connect: vi.fn(() => false),
            makeCableId: (fromKey: string, toKey: string) => `${fromKey}->${toKey}`,
            normalizeQueuedPacket: (packet: any) => packet
        },
        mapManager: {
            mapType: 'random',
            mapPresetId: 'standard',
            mapSeed: null,
            resourceMap: new Map(),
            terrainMap: new Map([['999,999', 'BLOCKER']]),
            getResourceMap: () => scene.mapManager.resourceMap,
            getTerrainMap: () => scene.mapManager.terrainMap,
            addEarlyLaneBlockers: vi.fn()
        },
        gridRenderer: { draw: vi.fn() },
        researchManager: {
            getSavedJobProgress: vi.fn(() => ({})),
            getSavedState: vi.fn(() => ({
                completed: [],
                activeSlots: [],
                progressById: {},
                insightBuffers: { material: 0, tactical: 0, system: 0 },
                unlockedSlots: 1
            })),
            getUnlockedResearch: vi.fn(() => []),
            loadState: vi.fn()
        },
        trainingPlanner: {
            getState: vi.fn(() => ({})),
            loadState: vi.fn()
        },
        initializeDefenseModelStates: vi.fn(),
        setGameSpeed: vi.fn((speed: number) => {
            scene.gameSpeed = speed;
        }),
        setBloomEnabled: vi.fn((enabled: boolean) => {
            scene.bloomEnabled = enabled;
        }),
        soundManager: {
            getSettings: vi.fn(() => ({ masterVolume: 0.6, muted: false })),
            setSettings: vi.fn()
        },
        powerManager: { updatePowerGrid: vi.fn() },
        performanceStats: { increment: vi.fn() },
        __buildings: buildings,
        __placedTypes: placedTypes
    };

    buildings.set(CORE_KEY, createBuilding('CORE', CORE_PIXEL_X, CORE_PIXEL_Y));
    Object.assign(scene, overrides);
    return scene;
}

describe('SaveManager', () => {
    beforeEach(() => {
        vi.useRealTimers();
        EventBus.offAll('SaveManager');
        installBrowserStorage();
    });

    afterEach(() => {
        EventBus.offAll('SaveManager');
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('does not write campaign save data while in tutorial mode', () => {
        const scene = createScene({ mode: 'tutorial' });
        const manager = new SaveManager(scene);

        expect(manager.saveGame()).toBe(false);
        expect(localStorage.getItem('gradium_save')).toBeNull();
    });

    it('skips removed physical transport buildings when loading legacy saves', () => {
        const scene = createScene();
        const manager = new SaveManager(scene);
        const saveData = {
            version: CURRENT_SAVE_VERSION,
            buildings: [
                { x: 32, y: 0, type: 'CONVEYOR', rotation: 0, inputBuffer: [], outputBuffer: [], hp: 100 },
                { x: 64, y: 0, type: 'FAST_LINK', rotation: 0, inputBuffer: [], outputBuffer: [], hp: 100 },
                { x: 96, y: 0, type: 'UNLOADER', rotation: 0, inputBuffer: [], outputBuffer: [], hp: 100 },
                { x: 128, y: 0, type: 'STORAGE', rotation: 0, inputBuffer: ['SILICON'], outputBuffer: [], hp: 150 }
            ],
            wave: {
                currentWave: 0,
                waveTimer: CONFIG.TIMING.INITIAL_WAVE_DELAY_MS,
                enemiesSpawned: 0,
                enemiesToSpawn: 0,
                enemies: [],
                hpMultiplier: 1,
                enemyIdCounter: 0
            },
            core: { hp: 900, totalDataReceived: 12 },
            items: [],
            cables: [],
            settings: { difficulty: 'NORMAL', gameSpeed: 1, showPowerGrid: false, showDefenseRange: false, bloomEnabled: true },
            research: [],
            resourceMap: [],
            terrainMap: [{ key: '999,999', type: 'BLOCKER' }]
        };
        localStorage.setItem('gradium_save', JSON.stringify(saveData));

        expect(manager.loadGame()).toBe(true);

        expect(scene.__placedTypes).toEqual(['CORE', 'STORAGE']);
        expect(scene.buildingManager.place).not.toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'CONVEYOR', expect.any(Number), expect.any(Object));
        expect(scene.buildingManager.place).not.toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'FAST_LINK', expect.any(Number), expect.any(Object));
        expect(scene.buildingManager.place).not.toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'UNLOADER', expect.any(Number), expect.any(Object));
    });

    it('cancels a pending autosave before servicing a manual save request', async () => {
        vi.useFakeTimers();
        const scene = createScene();
        scene.__buildings.set('128,0', createBuilding('STORAGE', 128, 0));
        const manager = new SaveManager(scene);
        const setItem = vi.mocked(localStorage.setItem);

        manager.update(CONFIG.TIMING.AUTO_SAVE_INTERVAL_MS);
        expect((manager as any).autoSavePending).toBe(true);

        EventBus.emit('SAVE_REQUESTED');
        await vi.runAllTimersAsync();

        const saveWrites = setItem.mock.calls.filter(([key]) => key === 'gradium_save');
        expect(saveWrites).toHaveLength(1);
        expect((manager as any).autoSavePending).toBe(false);
    });
});
