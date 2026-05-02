/**
 * Tiny in-process pub/sub used to broadcast Server-Sent Events to all
 * connected clients. Replaces the 8-second polling on the floor plan
 * and the 5-second polling in the kitchen view.
 *
 * Usage:
 *   const events = require('./lib/events');
 *   events.publish('order:updated', { orderId, status });
 *
 * The SSE route in routes/events.js attaches one subscriber per HTTP
 * connection and forwards every event over the wire.
 */

const subscribers = new Set();

function subscribe(handler) {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
}

function publish(type, payload) {
  const event = { type, payload, ts: Date.now() };
  for (const h of subscribers) {
    try {
      h(event);
    } catch (e) {
      // A misbehaving subscriber shouldn't take the loop down.
      // eslint-disable-next-line no-console
      console.error('[events] subscriber threw', e);
    }
  }
}

function size() { return subscribers.size; }

module.exports = { subscribe, publish, size };
