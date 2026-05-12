import { PowerUpdateData, CoreDataEvent } from '../types';

export interface EventMap {
    'BUILDING_SELECTED': { type: string };
    'BUILDING_PLACED': { key: string; building: any; type: string };
    'BUILDING_REMOVED': { key: string };
    'CABLE_CONNECTED': { fromKey: string; toKey: string; cableType: string };
    'POWER_UPDATED': PowerUpdateData;
    'CORE_DAMAGED': { amount: number };
    'CORE_DATA_RECEIVED': CoreDataEvent;
    'ENEMY_KILLED': { id: string; type: string; x: number; y: number; rewardSilicon: number };
    'GAME_OVER': void;
    'WAVE_STARTED': { wave: number };
    'WAVE_UPDATE': { timer: number };
    'WAVE_ENDED': { wave: number };
    'GAME_SPEED_CHANGED': { speed: number };
    'SAVE_REQUESTED': void;
    'LOAD_REQUESTED': void;
    'RESEARCH_UNLOCKED': { id: string };
    'RESEARCH_OPENED': void;
    'TUTORIAL_RESET': void;
    'AUDIO_SETTINGS_CHANGED': { masterVolume: number; muted: boolean };
}

type EventCallback<T = any> = (data: T) => void;

class EventBusClass {
    private events: { [K in keyof EventMap]?: EventCallback<EventMap[K]>[] } = {};

    on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): void {
        if (!this.events[event]) {
            this.events[event] = [] as any;
        }
        (this.events[event] as any).push(callback);
    }

    off<K extends keyof EventMap>(event: K, callback?: EventCallback<EventMap[K]>): void {
        if (!callback) {
            delete this.events[event];
            return;
        }
        const callbacks = this.events[event];
        if (callbacks) {
            this.events[event] = callbacks.filter((cb: any) => cb !== callback) as any;
        }
    }

    emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): void {
        const callbacks = this.events[event];
        if (callbacks) {
            callbacks.forEach(cb => cb(data as EventMap[K]));
        }
    }
}

const EventBus = new EventBusClass();
export default EventBus;
