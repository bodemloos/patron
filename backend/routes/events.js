const router = require('express').Router();
const events = require('../lib/events');

/**
 * GET /api/events — Server-Sent Events stream.
 *
 * Clients open one EventSource and receive every state change in the
 * app: order updates, new reservations, table layout changes, etc.
 */
router.get('/', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    // Disable proxy buffering — important behind nginx etc.
    'X-Accel-Buffering': 'no',
  });
  // Some browsers won't fire `onopen` until they see at least one byte.
  res.write(': hello\n\n');
  res.flushHeaders?.();

  const send = (event) => {
    try {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event.payload || {})}\n\n`);
    } catch (e) { /* connection probably closed */ }
  };
  const unsubscribe = events.subscribe(send);

  // Keep-alive ping every 25s to defeat idle proxies.
  const ping = setInterval(() => res.write(': ping\n\n'), 25 * 1000);

  req.on('close', () => {
    clearInterval(ping);
    unsubscribe();
  });
});

module.exports = router;
