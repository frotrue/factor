import { CORE_KEY } from '../config';
import { getBuildingName, t } from '../i18n';
import Core from '../buildings/Core';
import EventBus, { type EventMap } from '../managers/EventBus';
import { createWaveResultSummary } from '../utils/waveResultSummary';
import type MainScene from './MainScene';

const OWNER = 'MainScene';

const SHUTDOWN_EVENT_OWNERS = [
    OWNER,
    'CableManager',
    'Core',
    'BaseEnemyPathCache',
    'BuildConsoleController',
    'InputController',
    'ItemManager',
    'GameOverController',
    'HudShellController',
    'HudLocalizationController',
    'NotificationController',
    'PowerManager',
    'SaveManager',
    'SettingsController',
    'SoundManager',
    'TacticalPanelController',
    'TopHudController',
    'MobileActionController',
    'TutorialManager',
    'WaveManager'
];

export default class MainSceneRuntimeEvents {
    constructor(private readonly scene: MainScene) {}

    setup(): void {
        EventBus.offAll(OWNER);

        EventBus.on('BUILDING_SELECTED', ({ type }: EventMap['BUILDING_SELECTED']) => {
            this.scene.selectedBuildingType = type;
            this.scene.updateCursorGraphics();
        }, OWNER);

        EventBus.on('POWER_UPDATED', () => {
            this.scene.markPowerStateDirty();
        }, OWNER);

        EventBus.on('BUILDING_PLACED', ({ building, type }: EventMap['BUILDING_PLACED']) => {
            this.scene.effectsManager.playBuildOnline(building, type);
            EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', {
                message: t('log.buildingOnline', { name: getBuildingName(type) })
            });
            this.scene.defenseRangeDirty = true;
        }, OWNER);

        EventBus.on('BUILDING_REMOVED', ({ key }: EventMap['BUILDING_REMOVED']) => {
            const [x, y] = key.split(',').map(Number);
            this.scene.effectsManager.playBuildingRemoved(x, y);
            EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', {
                message: `System: Unit disconnected at [${x}, ${y}].`,
                isAlert: true
            });
            this.scene.defenseRangeDirty = true;
        }, OWNER);

        EventBus.on('BUILDING_DAMAGED', ({ key, building }: EventMap['BUILDING_DAMAGED']) => {
            this.scene.effectsManager.playBuildingDamaged(building);
            this.scene.currentWaveStats?.buildingsDamaged.add(key);
        }, OWNER);

        EventBus.on('BUILDING_DESTROYED', ({ key }: EventMap['BUILDING_DESTROYED']) => {
            this.scene.currentWaveStats?.buildingsDestroyed.add(key);
        }, OWNER);

        EventBus.on('WAVE_STARTED', ({ wave, routes }: EventMap['WAVE_STARTED']) => {
            const core = this.scene.buildingManager.get(CORE_KEY) as Core | null;
            this.scene.currentWaveStats = {
                wave,
                enemiesDestroyed: 0,
                coreHpBefore: core?.hp ?? 0,
                dataBefore: core?.totalDataReceived ?? 0,
                buildingsDamaged: new Set<string>(),
                buildingsDestroyed: new Set<string>()
            };
            this.scene.effectsManager.playWaveStart(routes);
        }, OWNER);

        EventBus.on('ENEMY_KILLED', ({ x, y }: EventMap['ENEMY_KILLED']) => {
            if (this.scene.currentWaveStats) this.scene.currentWaveStats.enemiesDestroyed++;
            this.scene.effectsManager.playEnemyKilled(x, y);
        }, OWNER);

        EventBus.on('WAVE_ENDED', () => {
            this.emitWaveResultSummary();
        }, OWNER);

        this.scene.events.on('shutdown', this.handleShutdown);
    }

    private emitWaveResultSummary(): void {
        if (!this.scene.currentWaveStats) return;
        const core = this.scene.buildingManager.get(CORE_KEY) as Core | null;
        const summary = createWaveResultSummary({
            wave: this.scene.currentWaveStats.wave,
            enemiesDestroyed: this.scene.currentWaveStats.enemiesDestroyed,
            coreHpBefore: this.scene.currentWaveStats.coreHpBefore,
            coreHpAfter: core?.hp ?? 0,
            coreMaxHp: core?.maxHp ?? 1,
            dataBefore: this.scene.currentWaveStats.dataBefore,
            dataAfter: core?.totalDataReceived ?? this.scene.currentWaveStats.dataBefore,
            buildingsDamaged: this.scene.currentWaveStats.buildingsDamaged.size,
            buildingsDestroyed: this.scene.currentWaveStats.buildingsDestroyed.size
        });
        EventBus.emit('WAVE_RESULT_SUMMARY_REQUESTED', summary);
        this.scene.currentWaveStats = null;
    }

    private readonly handleShutdown = (): void => {
        this.scene.events.off('shutdown', this.handleShutdown);
        SHUTDOWN_EVENT_OWNERS.forEach(owner => EventBus.offAll(owner));
        if ((window as any).__GRADIUM_PERF__ === this.scene.performanceStats) {
            delete (window as any).__GRADIUM_PERF__;
        }
    };
}
