import { EventEmitter } from 'node:events';

class OrderEvents extends EventEmitter {
  async emitAsync(event, payload) {
    await Promise.all(this.listeners(event).map((listener) => listener(payload)));
  }
}

export const orderEvents = new OrderEvents();
