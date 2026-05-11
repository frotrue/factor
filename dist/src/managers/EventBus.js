class EventBusClass {
    constructor() {
        this.events = {};
    }
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    off(event, callback) {
        if (!callback) {
            delete this.events[event];
            return;
        }
        const callbacks = this.events[event];
        if (callbacks) {
            this.events[event] = callbacks.filter((cb) => cb !== callback);
        }
    }
    emit(event, data) {
        const callbacks = this.events[event];
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }
}
const EventBus = new EventBusClass();
export default EventBus;
//# sourceMappingURL=EventBus.js.map