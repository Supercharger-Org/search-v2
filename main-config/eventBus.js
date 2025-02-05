// eventBus.js
import { Logger } from './logger.js';

export default class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  // Register a listener for a specific event type
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    Logger.log(`Listener added for event: ${eventType}`);
  }

  // Emit an event with data payload
  emit(eventType, data) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
    Logger.log(`Event emitted: ${eventType}`, data);
  }
}
