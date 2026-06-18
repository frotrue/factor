import EventBus from '../managers/EventBus';
import type MainScene from '../scenes/MainScene';
import {
    createPacketsHudDisplayPayload,
    createPowerHudDisplayPayload,
    createScoreHudDisplayPayload,
    createSiliconHudDisplayPayload,
    createWaveStartedHudDisplayPayload,
    createWaveTimerHudDisplayPayload
} from './topHudDisplay';
import {
    updateLegacyPackets,
    updateLegacyPower,
    updateLegacyScore,
    updateLegacySilicon,
    updateLegacyWave,
    updateLegacyWaveTimer,
    type LegacyTopHudRefs
} from './legacyTopHud';

const OWNER = 'TopHudController';
const SILICON_RENDER_INTERVAL_MS = 250;

export default class TopHudController {
    private lastItemCount = -1;
    private lastScore = -1;
    private lastSiliconCount = -1;
    private lastSiliconRenderAt = Number.NEGATIVE_INFINITY;

    constructor(
        private readonly scene: MainScene,
        private readonly refs: LegacyTopHudRefs
    ) {}

    setupEvents(): void {
        EventBus.offAll(OWNER);
        this.scene.events.once('shutdown', () => this.teardown());
        EventBus.on('CORE_DATA_RECEIVED', data => {
            const display = createScoreHudDisplayPayload(data.total);
            if (this.lastScore !== data.total) {
                this.lastScore = data.total;
                updateLegacyScore(this.refs, display.legacyValue);
            }
            EventBus.emit('HUD_STATE_UPDATED', display.snapshot);
        }, OWNER);

        EventBus.on('POWER_UPDATED', data => {
            const display = createPowerHudDisplayPayload(data);
            updateLegacyPower(this.refs, display.legacyPower);
            EventBus.emit('HUD_STATE_UPDATED', display.snapshot);
        }, OWNER);

        EventBus.on('WAVE_STARTED', ({ wave }) => {
            const display = createWaveStartedHudDisplayPayload(wave);
            updateLegacyWave(this.refs, display.legacyWave);
            updateLegacyWaveTimer(this.refs, display.legacyWaveTimer);
            EventBus.emit('HUD_STATE_UPDATED', display.snapshot);
        }, OWNER);

        EventBus.on('WAVE_UPDATE', ({ timer }) => {
            const display = createWaveTimerHudDisplayPayload(timer);
            updateLegacyWaveTimer(this.refs, display.legacyWaveTimer);
            EventBus.emit('HUD_STATE_UPDATED', display.snapshot);
        }, OWNER);

        EventBus.on('UI_FRAME_REFRESH_REQUESTED', ({ itemCount }) => {
            this.updateFrame(itemCount);
        }, OWNER);
    }

    private updateFrame(itemCount: number): void {
        if (this.lastItemCount !== itemCount) {
            this.lastItemCount = itemCount;
            const display = createPacketsHudDisplayPayload(itemCount);
            updateLegacyPackets(this.refs, display.legacyValue);
            EventBus.emit('HUD_STATE_UPDATED', display.snapshot);
        }

        const now = this.getUiTime();
        if (now - this.lastSiliconRenderAt < SILICON_RENDER_INTERVAL_MS) return;

        this.lastSiliconRenderAt = now;
        if (!this.scene.inventoryManager) return;

        const siliconCount = this.scene.inventoryManager.getResourceCount('SILICON');
        if (this.lastSiliconCount === siliconCount) return;

        this.lastSiliconCount = siliconCount;
        const display = createSiliconHudDisplayPayload(siliconCount);
        updateLegacySilicon(this.refs, display.legacyValue);
        EventBus.emit('HUD_STATE_UPDATED', display.snapshot);
    }

    private getUiTime(): number {
        return this.scene.time?.now ?? globalThis.performance?.now?.() ?? Date.now();
    }

    private teardown(): void {
        EventBus.offAll(OWNER);
    }
}
