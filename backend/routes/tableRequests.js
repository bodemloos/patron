const router = require('express').Router();
const TableRequest = require('../models/TableRequest');
const events = require('../lib/events');

/**
 * Staff-side routes for service-request inbox. The customer creates
 * requests via the public POST in routes/public.js; this is what the
 * floor plan polls / subscribes to so a waiter can ack them.
 */

// GET /api/table-requests?status=pending — list, newest first.
router.get('/', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    const list = await TableRequest.find(q)
      .populate('table', 'label room zone seats')
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 100);
    res.json(list);
  } catch (e) { next(e); }
});

// PATCH /api/table-requests/:id — body: { status: 'acknowledged', acknowledgedBy?: string }
router.patch('/:id', async (req, res, next) => {
  try {
    const r = await TableRequest.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (req.body.status === 'acknowledged' && r.status !== 'acknowledged') {
      r.status = 'acknowledged';
      r.acknowledgedAt = new Date();
      r.acknowledgedBy = String(req.body.acknowledgedBy || '');
    }
    await r.save();
    events.publish('table-request:updated', { id: String(r._id), status: r.status });
    res.json(r);
  } catch (e) { next(e); }
});

// DELETE /api/table-requests/:id — hard remove (hides false alarms).
router.delete('/:id', async (req, res, next) => {
  try {
    await TableRequest.findByIdAndDelete(req.params.id);
    events.publish('table-request:updated', { id: req.params.id, status: 'deleted' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
