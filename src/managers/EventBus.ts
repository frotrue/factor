import {
    PowerUpdateData,
    CoreDataEvent,
    HudSnapshot,
    TacticalPanelSnapshot,
    BuildConsoleSnapshot,
    SettingsModalSnapshot,
    TrainingLabSnapshot,
    ResearchPanelSnapshot,
    GameOverSnapshot,
    WaveResultSnapshot,
    ActivityLogSnapshot,
    TooltipSnapshot,
    TutorialPanelSnapshot,
    MobileActionSnapshot,
    MainMenuSnapshot,
    TrainingRewardPreference
} from '../types';
import type { WaveBriefing } from '../utils/waveSimulation';
import type { WaveResultSummary } from '../utils/waveResultSummary';
import type ModelTrainingLab from '../buildings/ModelTrainingLab';

export interface EventMap {
    'BUILDING_SELECTED': { type: string };
    'BUILDING_PLACED': { key: string; building: any; type: string };
    'BUILDING_REMOVED': { key: string };
    'BUILDING_DAMAGED': { key: string; building: any; amount: number; hp: number; maxHp: number };
    'BUILDING_DESTROYED': { key: string; building: any; type: string };
    'CABLE_CONNECTED': { fromKey: string; toKey: string; cableType: string };
    'POWER_UPDATED': PowerUpdateData;
    'CORE_DAMAGED': { amount: number };
    'CORE_DATA_RECEIVED': CoreDataEvent;
    'ENEMY_KILLED': { id: string; type: string; x: number; y: number; rewardSilicon: number };
    'GAME_OVER': void;
    'WAVE_STARTED': { wave: number; routes?: string[] };
    'WAVE_BRIEFING_UPDATED': WaveBriefing;
    'WAVE_UPDATE': { timer: number };
    'WAVE_ENDED': { wave: number };
    'GAME_SPEED_CHANGED': { speed: number };
    'SAVE_REQUESTED': void;
    'LOAD_REQUESTED': void;
    'RESEARCH_UNLOCKED': { id: string };
    'RESEARCH_OPEN_REQUESTED': void;
    'RESEARCH_CLOSE_REQUESTED': void;
    'RESEARCH_SELECT_REQUESTED': { id: string };
    'RESEARCH_SLOT_ASSIGN_REQUESTED': { id: string };
    'RESEARCH_PANEL_UPDATED': ResearchPanelSnapshot;
    'RESEARCH_PANEL_OPEN_CHANGED': { open: boolean };
    'RESEARCH_STATE_CHANGED': void;
    'SETTINGS_OPEN_REQUESTED': void;
    'TRAINING_LAB_OPEN_REQUESTED': { lab?: ModelTrainingLab; tab?: 'DEFENSE' | 'SYSTEM' };
    'LAB_JOB_PROGRESS': { id: string; progress: number; required: number };
    'MODEL_TRAINING_TARGET_SET': { targetType: string | null };
    'TUTORIAL_RESET': void;
    'AUDIO_SETTINGS_CHANGED': { masterVolume: number; muted: boolean };
    'BLOOM_SETTINGS_CHANGED': { enabled: boolean };
    'HUD_STATE_UPDATED': HudSnapshot;
    'HUD_SHELL_SYNC_REQUESTED': void;
    'TACTICAL_PANELS_UPDATED': TacticalPanelSnapshot;
    'TACTICAL_PANELS_REFRESH_REQUESTED': void;
    'BUILD_CONSOLE_REFRESH_REQUESTED': void;
    'BUILD_CONSOLE_UPDATED': BuildConsoleSnapshot;
    'BUILD_CATEGORY_SELECT_REQUESTED': { category: string };
    'BUILD_TOOL_SELECT_REQUESTED': { type: string };
    'UI_FRAME_REFRESH_REQUESTED': { itemCount: number };
    'SETTINGS_MODAL_UPDATED': SettingsModalSnapshot;
    'SETTINGS_MODAL_OPEN_CHANGED': { open: boolean };
    'SETTINGS_CLOSE_REQUESTED': void;
    'SETTINGS_SPEED_REQUESTED': { speed: number };
    'SETTINGS_FPS_REQUESTED': { fps: number };
    'SETTINGS_RENDER_RESOLUTION_REQUESTED': { preset: string };
    'SETTINGS_AUDIO_REQUESTED': { volume: number; muted: boolean };
    'SETTINGS_BLOOM_REQUESTED': { enabled: boolean };
    'SETTINGS_LANGUAGE_REQUESTED': { language: string };
    'SETTINGS_RESET_TUTORIAL_REQUESTED': void;
    'TRAINING_LAB_UPDATED': TrainingLabSnapshot;
    'TRAINING_LAB_RENDER_REQUESTED': void;
    'TRAINING_LAB_OPEN_CHANGED': { open: boolean };
    'TRAINING_LAB_CLOSE_REQUESTED': void;
    'TRAINING_LAB_TAB_REQUESTED': { tab: 'DEFENSE' | 'SYSTEM' };
    'TRAINING_LAB_AUTO_REQUESTED': { enabled: boolean };
    'TRAINING_LAB_JOB_SELECT_REQUESTED': { kind: 'DEFENSE' | 'SYSTEM'; id: string };
    'TRAINING_LAB_REWARD_REQUESTED': { type: string; reward: TrainingRewardPreference };
    'GAME_OVER_UPDATED': GameOverSnapshot;
    'GAME_OVER_ACTION_REQUESTED': { action: 'restart' | 'main-menu' };
    'WAVE_RESULT_SUMMARY_REQUESTED': WaveResultSummary;
    'WAVE_RESULT_UPDATED': WaveResultSnapshot;
    'WAVE_RESULT_CLOSE_REQUESTED': void;
    'ACTIVITY_LOG_ENTRY_REQUESTED': { message: string; isAlert?: boolean };
    'ACTIVITY_LOG_UPDATED': ActivityLogSnapshot;
    'TOOLTIP_SHOW_REQUESTED': { x: number; y: number; title: string; content: string };
    'TOOLTIP_UPDATED': TooltipSnapshot;
    'TOOLTIP_CLOSE_REQUESTED': void;
    'TUTORIAL_PANEL_UPDATED': TutorialPanelSnapshot;
    'TUTORIAL_SKIP_REQUESTED': void;
    'MOBILE_ACTION_UPDATED': MobileActionSnapshot;
    'MOBILE_ACTION_REQUESTED': { id: string };
    'MOBILE_ACTION_REFRESH_REQUESTED': void;
    'MOBILE_BUILD_SUMMARY_REFRESH_REQUESTED': void;
    'MOBILE_UI_REBUILD_REQUESTED': void;
    'MOBILE_ACTION_CANCEL_REQUESTED': void;
    'MOBILE_ACTION_STATUS_REQUESTED': { status: string | null };
    'MAIN_MENU_UPDATED': MainMenuSnapshot;
    'MAIN_MENU_DIFFICULTY_REQUESTED': { id: string };
    'MAIN_MENU_START_REQUESTED': { loadSave?: boolean };
}

type EventCallback<T = any> = (data: T) => void;
type TaggedCallback<T = any> = { owner: string; fn: EventCallback<T> };

class EventBusClass {
    private events: { [K in keyof EventMap]?: TaggedCallback<EventMap[K]>[] } = {};

    on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>, owner = 'global'): void {
        if (!this.events[event]) {
            this.events[event] = [] as any;
        }
        (this.events[event] as any).push({ owner, fn: callback });
    }

    off<K extends keyof EventMap>(event: K, callbackOrOwner?: EventCallback<EventMap[K]> | string): void {
        if (!callbackOrOwner) {
            console.warn(`EventBus.off("${String(event)}") ignored: pass an owner, callback, or use offAll(owner).`);
            return;
        }
        const listeners = this.events[event];
        if (!listeners) return;

        if (typeof callbackOrOwner === 'string') {
            this.events[event] = listeners.filter((listener: any) => listener.owner !== callbackOrOwner) as any;
        } else {
            this.events[event] = listeners.filter((listener: any) => listener.fn !== callbackOrOwner) as any;
        }
    }

    offAll(owner: string): void {
        (Object.keys(this.events) as (keyof EventMap)[]).forEach(event => {
            const listeners = this.events[event];
            if (listeners) {
                this.events[event] = listeners.filter((listener: any) => listener.owner !== owner) as any;
            }
        });
    }

    emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): void {
        const listeners = this.events[event];
        if (listeners) {
            listeners.slice().forEach(listener => listener.fn(data as EventMap[K]));
        }
    }
}

const EventBus = new EventBusClass();
export default EventBus;
