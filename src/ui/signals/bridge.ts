import { batch } from '@preact/signals';
import EventBus from '../../managers/EventBus';
import { getLanguage } from '../../i18n';
import type { HudSnapshot, PowerUpdateData, TacticalPanelSnapshot } from '../../types';
import { withSettingsModalOpenState } from '../settingsDisplay';
import {
    createPowerHudSnapshot,
    createScoreHudSnapshot,
    createTopHudLabelSnapshot,
    createWaveStartedHudSnapshot,
    createWaveTimerHudSnapshot
} from '../topHudDisplay';
import { withTrainingLabOpenState } from '../trainingLabDisplay';
import { withWaveResultOpenState } from '../waveResultDisplay';
import { buildConsole } from './buildState';
import * as gameState from './gameState';
import { mainMenu } from './menuState';
import { gameOverScreen, settingsModal, trainingLabModal } from './modalState';
import { mobileActions } from './mobileState';
import { activityLog, tooltip, waveResult, waveResultHistory } from './notificationState';
import { tutorialPanel } from './tutorialState';

const OWNER = 'PreactHudBridge';
let waveResultCloseTimer: ReturnType<typeof setTimeout> | null = null;
let activeDisconnect: (() => void) | null = null;

export function connectGameStateBridge(): () => void {
    activeDisconnect?.();
    EventBus.offAll(OWNER);
    const languageChangeHandler = () => {
        gameState.language.value = getLanguage();
        applyHudSnapshot(createTopHudLabelSnapshot());
    };
    window.addEventListener('languagechange', languageChangeHandler);

    EventBus.on('HUD_STATE_UPDATED', applyHudSnapshot, OWNER);
    EventBus.on('TACTICAL_PANELS_UPDATED', applyTacticalPanels, OWNER);
    EventBus.on('BUILD_CONSOLE_UPDATED', snapshot => {
        buildConsole.value = snapshot;
    }, OWNER);
    EventBus.on('SETTINGS_MODAL_UPDATED', snapshot => {
        settingsModal.value = snapshot;
    }, OWNER);
    EventBus.on('SETTINGS_MODAL_OPEN_CHANGED', ({ open }) => {
        settingsModal.value = withSettingsModalOpenState(settingsModal.value, open);
    }, OWNER);
    EventBus.on('TRAINING_LAB_UPDATED', snapshot => {
        trainingLabModal.value = snapshot;
    }, OWNER);
    EventBus.on('TRAINING_LAB_OPEN_CHANGED', ({ open }) => {
        trainingLabModal.value = withTrainingLabOpenState(trainingLabModal.value, open);
    }, OWNER);
    EventBus.on('GAME_OVER_UPDATED', snapshot => {
        gameOverScreen.value = snapshot;
    }, OWNER);
    EventBus.on('WAVE_RESULT_UPDATED', snapshot => {
        batch(() => {
            waveResult.value = snapshot;
            waveResultHistory.value = [
                snapshot,
                ...waveResultHistory.value.filter(entry => entry.token !== snapshot.token)
            ].slice(0, 5);
        });
        if (waveResultCloseTimer) clearTimeout(waveResultCloseTimer);
        waveResultCloseTimer = setTimeout(() => {
            if (waveResult.value.token === snapshot.token) {
                waveResult.value = withWaveResultOpenState(waveResult.value, false);
            }
        }, 7000);
    }, OWNER);
    EventBus.on('WAVE_RESULT_CLOSE_REQUESTED', () => {
        if (waveResultCloseTimer) clearTimeout(waveResultCloseTimer);
        waveResultCloseTimer = null;
        waveResult.value = withWaveResultOpenState(waveResult.value, false);
    }, OWNER);
    EventBus.on('ACTIVITY_LOG_UPDATED', snapshot => {
        activityLog.value = snapshot;
    }, OWNER);
    EventBus.on('TOOLTIP_UPDATED', snapshot => {
        tooltip.value = snapshot;
    }, OWNER);
    EventBus.on('TUTORIAL_PANEL_UPDATED', snapshot => {
        tutorialPanel.value = snapshot;
    }, OWNER);
    EventBus.on('MOBILE_ACTION_UPDATED', snapshot => {
        mobileActions.value = snapshot;
    }, OWNER);
    EventBus.on('MAIN_MENU_UPDATED', snapshot => {
        mainMenu.value = snapshot;
    }, OWNER);
    EventBus.on('CORE_DATA_RECEIVED', data => {
        applyHudSnapshot(createScoreHudSnapshot(data.total));
    }, OWNER);
    EventBus.on('POWER_UPDATED', data => {
        applyHudSnapshot(createPowerHudSnapshot(data));
    }, OWNER);
    EventBus.on('WAVE_STARTED', data => {
        applyHudSnapshot(createWaveStartedHudSnapshot(data.wave));
    }, OWNER);
    EventBus.on('WAVE_UPDATE', data => {
        applyHudSnapshot(createWaveTimerHudSnapshot(data.timer));
    }, OWNER);

    const disconnect = () => {
        if (activeDisconnect !== disconnect) return;
        EventBus.offAll(OWNER);
        window.removeEventListener('languagechange', languageChangeHandler);
        if (waveResultCloseTimer) clearTimeout(waveResultCloseTimer);
        waveResultCloseTimer = null;
        activeDisconnect = null;
    };
    activeDisconnect = disconnect;
    return disconnect;
}

function applyHudSnapshot(snapshot: HudSnapshot): void {
    batch(() => {
        if (typeof snapshot.score === 'number') gameState.score.value = snapshot.score;
        if (snapshot.labels) gameState.topHudLabels.value = snapshot.labels;
        if (typeof snapshot.silicon === 'number') gameState.silicon.value = snapshot.silicon;
        if (typeof snapshot.packets === 'number') gameState.packets.value = snapshot.packets;
        if (typeof snapshot.wave === 'number') gameState.wave.value = snapshot.wave;
        if (typeof snapshot.waveTimer === 'string') gameState.waveTimer.value = snapshot.waveTimer;
        if (snapshot.power) {
            applyPowerUpdate(snapshot.power);
        }
    });
}

function applyPowerUpdate(data: PowerUpdateData): void {
    batch(() => {
        gameState.powerProduction.value = data.production;
        gameState.powerConsumption.value = data.consumption;
        gameState.powerNet.value = data.net;
        gameState.powerNetworkCount.value = data.networks?.length ?? 0;
        gameState.isBlackout.value = data.isBlackout;
    });
}

function applyTacticalPanels(snapshot: TacticalPanelSnapshot): void {
    gameState.tacticalPanels.value = snapshot;
}
