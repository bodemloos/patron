const router = require('express').Router();
const Reservation = require('../models/Reservation');
const Order = require('../models/Order');
const Item = require('../models/Item');
const Category = require('../models/Category');
const Table = require('../models/Table');
const Settings = require('../models/Settings');
const Customer = require('../models/Customer');
const events = require('../lib/events');
const {
  OPENING_HOURS,
  SLOT_INTERVAL_MIN,
  DEFAULT_DURATION_MIN,
  buildSlotsForDate,
  findAvailableTable,
} = require('../lib/availability');

/**
 * Public-facing endpoints used by the embeddable booking widget.
 * No auth — these are intended to be called from a customer's browser
 * on a third-party website. CORS is wide open in server.js.
 *
 * Responses are intentionally minimal — they don't leak other customers'
 * names/contact info or per-table identity.
 */

// GET /api/public/reservations/availability?date=YYYY-MM-DD&partySize=N
router.get('/reservations/availability', async (req, res, next) => {
  try {
    const dateStr = req.query.date;
    const partySize = Math.max(1, Number(req.query.partySize) || 2);
    if (!dateStr) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    const result = await buildSlotsForDate(dateStr, partySize);
    res.json({
      date: dateStr,
      partySize,
      openingHours: result.openingHours,
      durationMinutes: result.durationMinutes,
      intervalMinutes: result.intervalMinutes,
      // Surface closure state so the widget can show a friendlier
      // empty-state ("Closed for staff training") instead of a generic
      // "Closed on this date." message.
      closed: result.closed,
      closureReason: result.closureReason,
      // Strip table counts to a boolean — public callers don't need a count.
      slots: (result.slots || []).map((s) => ({ time: s.time, startsAt: s.startsAt, available: s.available > 0 })),
    });
  } catch (e) { next(e); }
});

// POST /api/public/reservations
// Body: { name, email, phone, partySize, startsAt (ISO), notes }
// Response: { ok: true, reservation: { id, startsAt, partySize, status } }
router.post('/reservations', async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const partySize = Math.max(1, Number(body.partySize) || 2);
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (!name) return res.status(400).json({ error: 'Please enter a name.' });
    if (!startsAt || isNaN(startsAt.getTime())) {
      return res.status(400).json({ error: 'Please pick a valid time.' });
    }
    if (startsAt < new Date()) {
      return res.status(400).json({ error: 'Please pick a future time.' });
    }
    if (!body.email && !body.phone) {
      return res.status(400).json({ error: 'Please provide an email or phone so we can reach you.' });
    }

    const duration = DEFAULT_DURATION_MIN;
    const result = await findAvailableTable(startsAt, duration, partySize);
    if (result.closed) {
      return res.status(409).json({
        error: result.reason
          ? `Sorry, we're closed on that date — ${result.reason}.`
          : "Sorry, we're closed on that date.",
      });
    }
    if (!result.table) {
      return res.status(409).json({ error: 'Sorry, that time just got booked. Please pick another slot.' });
    }

    const reservation = await Reservation.create({
      name,
      email: String(body.email || '').trim(),
      phone: String(body.phone || '').trim(),
      partySize,
      startsAt,
      durationMinutes: duration,
      table: result.table._id,
      status: 'confirmed',
      notes: String(body.notes || '').slice(0, 500),
      source: 'widget',
    });

    // Auto-link customer record.
    const customer = await Customer.findOrCreate({
      name: reservation.name, email: reservation.email, phone: reservation.phone, notes: reservation.notes,
    });
    if (customer) {
      reservation.customer = customer._id;
      await reservation.save();
    }

    events.publish('reservation:created', { id: String(reservation._id) });
    res.status(201).json({
      ok: true,
      reservation: {
        id: reservation._id,
        startsAt: reservation.startsAt,
        partySize: reservation.partySize,
        status: reservation.status,
      },
    });
  } catch (e) { next(e); }
});

// ----------------------------------------------------------------------
// QR table-side ordering — a customer scans the QR pinned to their
// table, browses the menu, and places lines straight onto the table's
// open order. The waiter still finalises payment.
// ----------------------------------------------------------------------

// GET /api/public/menu/:tableId — table info + menu (categories + items),
// stripped of admin-only fields.
router.get('/menu/:tableId', async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.tableId).lean();
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const settings = await Settings.get();
    const [items, categories] = await Promise.all([
      Item.find({ available: { $ne: false } })
        .populate('category', 'name color sortOrder taxRate')
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
      Category.find().sort({ sortOrder: 1 }).lean(),
    ]);

    res.json({
      restaurant: { name: settings.restaurantName, currency: settings.currency },
      table: { id: String(table._id), label: table.label, seats: table.seats, room: table.room, zone: table.zone },
      categories: categories.map((c) => ({ id: String(c._id), name: c.name, color: c.color })),
      items: items.map((i) => ({
        id: String(i._id),
        name: i.name,
        description: i.description,
        price: i.price,
        category: i.category ? { id: String(i.category._id), name: i.category.name, color: i.category.color } : null,
        sizes: (i.sizes || []).map((s) => ({ label: s.label, priceDelta: s.priceDelta })),
      })),
    });
  } catch (e) { next(e); }
});

// POST /api/public/menu/:tableId/order
// Body: { lines: [{ itemId, qty, sizeLabel, note }], customerName?, customerEmail?, customerPhone? }
// Adds lines to the table's open order (creating a new order if needed).
router.post('/menu/:tableId/order', async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.tableId);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const inputLines = Array.isArray(req.body.lines) ? req.body.lines : [];
    if (!inputLines.length) return res.status(400).json({ error: 'No items in order.' });

    // Find or create an open order for this table.
    let order = await Order.findOne({ table: table._id, status: { $in: ['open', 'sent'] } });
    if (!order) {
      order = await Order.create({ table: table._id, status: 'open', source: 'qr' });
    }

    const settings = await Settings.get();
    for (const ln of inputLines) {
      const item = await Item.findById(ln.itemId).populate('category');
      if (!item || item.available === false) continue;
      const sizeMod = item.sizes?.find((s) => s.label === ln.sizeLabel);
      const modifiers = sizeMod ? [{ label: `Size: ${sizeMod.label}`, priceDelta: Number(sizeMod.priceDelta) || 0 }] : [];
      const modDelta = modifiers.reduce((s, m) => s + m.priceDelta, 0);
      const finalPrice = (item.price || 0) + modDelta;
      const taxRate = (item.category?.taxRate >= 0 ? item.category.taxRate : settings.defaultTaxRate);
      order.lines.push({
        item: item._id,
        name: item.name,
        basePrice: item.price,
        price: finalPrice,
        qty: Math.max(1, Number(ln.qty) || 1),
        modifiers,
        note: String(ln.note || '').slice(0, 280),
        course: courseHeuristic(item.category?.name),
        taxRate,
        status: 'pending',
      });
    }
    order.recomputeSubtotal();

    // Optional customer auto-link.
    if (req.body.customerEmail || req.body.customerPhone) {
      const c = await Customer.findOrCreate({
        name: req.body.customerName || 'Guest',
        email: req.body.customerEmail,
        phone: req.body.customerPhone,
      });
      if (c) order.customer = c._id;
    }

    await order.save();
    events.publish('order:updated', { orderId: String(order._id), tableId: String(table._id), source: 'qr' });

    res.status(201).json({
      ok: true,
      orderId: String(order._id),
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      total: order.total,
      lines: order.lines.length,
    });
  } catch (e) { next(e); }
});

function courseHeuristic(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('starter') || n.includes('appetizer')) return 'starter';
  if (n.includes('main')) return 'main';
  if (n.includes('dessert') || n.includes('desert')) return 'dessert';
  if (n.includes('drink') || n.includes('coffee') || n.includes('tea') || n.includes('bar')) return 'drink';
  return 'other';
}

module.exports = router;
