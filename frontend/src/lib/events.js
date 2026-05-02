/**
 * Tiny SSE client.
 *
 *   const off = subscribe(['order:updated', 'order:paid'], () => refresh());
 *   off(); // tear down on unmount
 *
 * Internally maintains a single EventSource shared across all subscribers
 * — that way switching pages doesn't open/close socket-equivalents on
 * every navigation.
 */

// Optional override for SSE in production. Edge rewrites (vercel.json)
// don't keep long-lived connections open reliably, so when the frontend
// is on Vercel and the backend on Render, set VITE_API_BASE to the
// Render origin and the EventSource will skip the proxy.
const API_BASE = (import.meta.env?.VITE_API_BASE || '').replace(/\/$/, '');

let source = null;
const listeners = new Map(); // type → Set<handler>

function ensureSource() {
  if (source) return source;
  source = new EventSource(API_BASE + '/api/events');
  // Wire each known type once. A new subscription that arrives later
  // adds itself to the per-type listener set; the type-listener forwards
  // to whichever handlers are registered at the time of the event.
  source.onerror = () => {
    // EventSource auto-reconnects, no action needed. Keeping this
    // hook to suppress noisy console errors during dev.
  };
  return source;
}

function attachType(type) {
  const s = ensureSource();
  // EventSource ignores `addEventListener('open')` etc. issues — fine.
  if (!attachType._wired) attachType._wired = new Set();
  if (attachType._wired.has(type)) return;
  attachType._wired.add(type);
  s.addEventListener(type, (e) => {
    const set = listeners.get(type);
    if (!set) return;
    let payload;
    try { payload = e.data ? JSON.parse(e.data) : null; } catch { payload = e.data; }
    for (const fn of set) {
      try { fn(payload, type); } catch (err) { /* swallow */ }
    }
  });
}

export function subscribe(types, handler) {
  const list = Array.isArray(types) ? types : [types];
  for (const t of list) {
    attachType(t);
    if (!listeners.has(t)) listeners.set(t, new Set());
    listeners.get(t).add(handler);
  }
  return () => {
    for (const t of list) {
      listeners.get(t)?.delete(handler);
    }
  };
}
