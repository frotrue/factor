import { PowerUpdateData, CoreDataEvent } from '../types';
import type { WaveBriefing } from '../utils/waveSimulation';

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
    'RESEARCH_OPENED': void;
    'MODEL_TRAINING_TARGET_SET': { targetType: string | null };
    'TUTORIAL_RESET': void;
    'AUDIO_SETTINGS_CHANGED': { masterVolume: number; muted: boolean };
    'BLOOM_SETTINGS_CHANGED': { enabled: boolean };
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
