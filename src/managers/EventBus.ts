type EventCallback = (...args: any[]) => void;

class EventBusClass {
    private events: Map<string, EventCallback[]> = new Map();

    on(event: string, callback: EventCallback): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(callback);
    }

    off(event: string, callback?: EventCallback): void {
        if (!callback) {
            this.events.delete(event);
            return;
        }
        const callbacks = this.events.get(event);
        if (callbacks) {
            this.events.set(event, callbacks.filter(cb => cb !== callback));
        }
    }

    emit(event: string, data?: any): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }
}

const EventBus = new EventBusClass();
export default EventBus;
