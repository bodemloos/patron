const router = require('express').Router();
const Reservation = require('../models/Reservation');
const Customer = require('../models/Customer');
const events = require('../lib/events');
const {
  OPENING_HOURS,
  SLOT_INTERVAL_MIN,
  DEFAULT_DURATION_MIN,
  buildSlotsForDate,
  findAvailableTable,
} = require('../lib/availability');

// ----------------------------------------------------------------------
// Admin / Patron app routes
// ----------------------------------------------------------------------

// GET /api/reservations?from=ISO&to=ISO&status=confirmed
router.get('/', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.from || req.query.to) {
      q.startsAt = {};
      if (req.query.from) q.startsAt.$gte = new Date(req.query.from);
      if (req.query.to) q.startsAt.$lte = new Date(req.query.to);
    }
    if (req.query.status) q.status = req.query.status;
    const list = await Reservation.find(q)
      .populate('table', 'label seats room zone')
      .populate('customer', 'name vip')
      .sort({ startsAt: 1 })
      .lean({ virtuals: true });
    res.json(list);
  } catch (e) { next(e); }
});

// POST /api/reservations  — manual booking by staff
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.startsAt) return res.status(400).json({ error: 'startsAt required' });
    if (!body.name) return res.status(400).json({ error: 'name required' });
    const startsAt = new Date(body.startsAt);
    const duration = Number(body.durationMinutes) || DEFAULT_DURATION_MIN;
    const partySize = Math.max(1, Number(body.partySize) || 2);

    let tableId = body.table || null;
    // If staff didn't pre-select a table, auto-pick the smallest fit.
    if (!tableId) {
      const result = await findAvailableTable(startsAt, duration, partySize);
      if (result.closed) {
        return res.status(409).json({ error: result.reason
          ? `Closed on that date — ${result.reason}.`
          : 'Closed on that date.' });
      }
      if (!result.table) return res.status(409).json({ error: 'No tables available at that time for that party size.' });
      tableId = result.table._id;
    }

    // Auto-link / create customer record.
    const customer = await Customer.findOrCreate({
      name: body.name, email: body.email, phone: body.phone, notes: body.notes,
    });

    const created = await Reservation.create({
      name: String(body.name).trim(),
      email: body.email || '',
      phone: body.phone || '',
      partySize,
      startsAt,
      durationMinutes: duration,
      table: tableId,
      status: body.status || 'confirmed',
      notes: body.notes || '',
      source: body.source === 'widget' ? 'widget' : 'manual',
      customer: customer ? customer._id : null,
    });

    events.publish('reservation:created', { id: String(created._id) });

    const populated = await Reservation.findById(created._id)
      .populate('table', 'label seats room zone')
      .populate('customer', 'name vip')
      .lean({ virtuals: true });
    res.status(201).json(populated);
  } catch (e) { next(e); }
});

// PATCH /api/reservations/:id — update status / table / notes
router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['status', 'table', 'notes', 'name', 'email', 'phone', 'partySize', 'startsAt', 'durationMinutes'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    if (update.startsAt) update.startsAt = new Date(update.startsAt);

    const r = await Reservation.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('table', 'label seats room zone')
      .populate('customer', 'name vip')
      .lean({ virtuals: true });
    if (!r) return res.status(404).json({ error: 'Not found' });
    events.publish('reservation:updated', { id: String(r._id) });
    res.json(r);
  } catch (e) { next(e); }
});

// DELETE /api/reservations/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await Reservation.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// GET /api/reservations/availability?date=YYYY-MM-DD&partySize=N
// Admin-side helper — returns the same data as the public endpoint.
router.get('/availability', async (req, res, next) => {
  try {
    const dateStr = req.query.date;
    const partySize = Math.max(1, Number(req.query.partySize) || 2);
    if (!dateStr) return res.status(400).json({ error: 'date (YYYY-MM-DD) required' });
    const result = await buildSlotsForDate(dateStr, partySize);
    res.json({
      date: dateStr,
      partySize,
      openingHours: result.openingHours,
      intervalMinutes: result.intervalMinutes,
      durationMinutes: result.durationMinutes,
      closed: result.closed,
      closureReason: result.closureReason,
      slots: result.slots,
    });
  } catch (e) { next(e); }
});

module.exports = router;
