const router = require('express').Router();
const Table = require('../models/Table');
const Order = require('../models/Order');

router.get('/', async (req, res, next) => {
  try {
    const tables = await Table.find().sort({ room: 1, label: 1 }).lean();
    // attach current open/sent order summary per table
    const openOrders = await Order.find({ status: { $in: ['open', 'sent'] } })
      .select('table status subtotal lines updatedAt')
      .lean();
    const byTable = {};
    for (const o of openOrders) {
      if (!o.table) continue;
      const k = String(o.table);
      byTable[k] = byTable[k] || [];
      byTable[k].push(o);
    }
    const result = tables.map((t) => ({
      ...t,
      openOrders: byTable[String(t._id)] || [],
    }));
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const t = await Table.create(req.body);
    res.status(201).json(t);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const t = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (e) { next(e); }
});

// Bulk update positions (used by floor-plan editor on save)
router.post('/bulk-position', async (req, res, next) => {
  try {
    const updates = req.body.updates || [];
    await Promise.all(
      updates.map((u) =>
        Table.findByIdAndUpdate(u._id, {
          x: u.x, y: u.y, w: u.w, h: u.h, seats: u.seats, label: u.label, shape: u.shape, room: u.room, zone: u.zone,
        })
      )
    );
    res.json({ ok: true, count: updates.length });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Table.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Mark a table as free: cancel all of its open/sent (unpaid) orders.
router.post('/:id/free', async (req, res, next) => {
  try {
    const result = await Order.updateMany(
      { table: req.params.id, status: { $in: ['open', 'sent'] } },
      { $set: { status: 'cancelled' } }
    );
    res.json({ ok: true, cancelled: result.modifiedCount ?? result.nModified ?? 0 });
  } catch (e) { next(e); }
});

module.exports = router;
