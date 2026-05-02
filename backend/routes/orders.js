const router = require('express').Router();
const Order = require('../models/Order');
const Item = require('../models/Item');
const StockItem = require('../models/StockItem');
const Category = require('../models/Category');
const Settings = require('../models/Settings');
const Customer = require('../models/Customer');
const events = require('../lib/events');

// Resolve the effective tax rate for an item: explicit category rate
// (if non-negative) or the global Settings.defaultTaxRate.
async function resolveTaxRate(item, settings) {
  if (!item || !item.category) return settings.defaultTaxRate;
  let cat = item.category;
  if (cat && typeof cat === 'object' && 'taxRate' in cat) {
    return cat.taxRate >= 0 ? cat.taxRate : settings.defaultTaxRate;
  }
  // Lookup if we only have an ObjectId on the item.
  cat = await Category.findById(cat).lean();
  return cat && cat.taxRate >= 0 ? cat.taxRate : settings.defaultTaxRate;
}

// Heuristic: derive the kitchen course from the category name. The
// menu UI also lets a manager override per-line, but most items map
// cleanly from their category.
function courseForCategory(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('starter') || n.includes('appetizer')) return 'starter';
  if (n.includes('main')) return 'main';
  if (n.includes('dessert') || n.includes('desert')) return 'dessert';
  if (n.includes('drink') || n.includes('coffee') || n.includes('tea') || n.includes('bar')) return 'drink';
  return 'other';
}

// List orders with optional filters: status, table
router.get('/', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.table) q.table = req.query.table;
    const list = await Order.find(q)
      .populate('table')
      .populate('waiter')
      .sort({ updatedAt: -1 })
      .limit(Number(req.query.limit) || 200);
    res.json(list);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const o = await Order.findById(req.params.id).populate('table').populate('waiter');
    if (!o) return res.status(404).json({ error: 'Not found' });
    res.json(o);
  } catch (e) { next(e); }
});

// Create order on a table
router.post('/', async (req, res, next) => {
  try {
    const o = await Order.create({
      table: req.body.table || null,
      waiter: req.body.waiter || null,
      lines: [],
      status: 'open',
    });
    res.status(201).json(o);
  } catch (e) { next(e); }
});

// Add a line item (snapshotting price/name + modifiers)
router.post('/:id/lines', async (req, res, next) => {
  try {
    const { itemId, qty, note, modifiers, course } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const item = await Item.findById(itemId).populate('category');
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.available === false) {
      return res.status(409).json({ error: `${item.name} is currently unavailable.` });
    }

    const settings = await Settings.get();
    const taxRate = await resolveTaxRate(item, settings);
    const lineCourse = course || courseForCategory(item.category?.name);

    const cleanMods = Array.isArray(modifiers)
      ? modifiers
          .filter((m) => m && m.label)
          .map((m) => ({ label: String(m.label), priceDelta: Number(m.priceDelta) || 0 }))
      : [];
    const modDelta = cleanMods.reduce((s, m) => s + m.priceDelta, 0);
    const finalPrice = (item.price || 0) + modDelta;
    const modKey = cleanMods.map((m) => `${m.label}:${m.priceDelta}`).sort().join('|');

    // Merge with an identical pending line (same item + modifiers + note)
    const existing = order.lines.find((l) => {
      if (String(l.item) !== String(itemId)) return false;
      if ((l.note || '') !== (note || '')) return false;
      if (l.status !== 'pending') return false;
      const lKey = (l.modifiers || [])
        .map((m) => `${m.label}:${m.priceDelta}`)
        .sort()
        .join('|');
      return lKey === modKey;
    });

    if (existing) {
      existing.qty += Number(qty) || 1;
    } else {
      order.lines.push({
        item: item._id,
        name: item.name,
        basePrice: item.price,
        price: finalPrice,
        qty: Number(qty) || 1,
        modifiers: cleanMods,
        note: note || '',
        course: lineCourse,
        taxRate,
      });
    }
    order.recomputeSubtotal();
    await order.save();
    events.publish('order:updated', { orderId: String(order._id), tableId: order.table ? String(order.table) : null });
    res.json(order);
  } catch (e) { next(e); }
});

// Update line: qty / status / note / course. DELETE-style if qty=0.
router.patch('/:id/lines/:lineId', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const line = order.lines.id(req.params.lineId);
    if (!line) return res.status(404).json({ error: 'Line not found' });
    if (req.body.qty !== undefined) line.qty = Number(req.body.qty);
    if (req.body.status !== undefined) line.status = req.body.status;
    if (req.body.note !== undefined) line.note = req.body.note;
    if (req.body.course !== undefined) line.course = req.body.course;
    if (line.qty <= 0) line.deleteOne();
    order.recomputeSubtotal();
    await order.save();
    events.publish('order:updated', { orderId: String(order._id), tableId: order.table ? String(order.table) : null });
    if (req.body.status === 'ready') {
      events.publish('kitchen:ready', { orderId: String(order._id), lineId: req.params.lineId });
    }
    res.json(order);
  } catch (e) { next(e); }
});

// Mark all pending lines as 'preparing' = "send to kitchen"
router.post('/:id/send', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    for (const l of order.lines) {
      if (l.status === 'pending') l.status = 'preparing';
    }
    if (order.status === 'open') order.status = 'sent';
    await order.save();
    events.publish('order:sent', { orderId: String(order._id), tableId: order.table ? String(order.table) : null });
    res.json(order);
  } catch (e) { next(e); }
});

// Pay order: decrement stock, compute COGS, capture tip + customer, mark paid
router.post('/:id/pay', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: 'lines.item',
      populate: { path: 'recipe.stockItem' },
    });
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (order.status === 'paid') return res.json(order);

    let cogs = 0;
    for (const l of order.lines) {
      const recipe = (l.item && l.item.recipe) || [];
      for (const r of recipe) {
        if (!r.stockItem) continue;
        cogs += (r.stockItem.costPerUnit || 0) * r.qty * l.qty;
        await StockItem.findByIdAndUpdate(r.stockItem._id, {
          $inc: { quantity: -r.qty * l.qty },
        });
      }
      if (l.status !== 'served') l.status = 'served';
    }

    order.cogs = cogs;
    order.status = 'paid';
    order.paidAt = new Date();
    order.paymentMethod = req.body.paymentMethod || 'card';
    order.tip = Math.max(0, Number(req.body.tip) || 0);
    order.recomputeSubtotal();

    // Loyalty link — auto-attach a customer record if the caller passed
    // contact info (e.g. from the QR ordering flow or a reservation).
    if (req.body.customer) {
      const c = await Customer.findOrCreate(req.body.customer);
      if (c) order.customer = c._id;
    }

    await order.save();

    // Update the linked customer aggregates.
    if (order.customer) {
      await Customer.findByIdAndUpdate(order.customer, {
        $inc: { visits: 1, lifetimeSpend: order.total },
        $set: { lastVisitAt: order.paidAt },
      });
    }

    events.publish('order:paid', { orderId: String(order._id), tableId: order.table ? String(order.table) : null });
    res.json(order);
  } catch (e) { next(e); }
});

// Cancel
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (order) events.publish('order:cancelled', { orderId: String(order._id) });
    res.json(order);
  } catch (e) { next(e); }
});

// Live ticket queue.
//   /api/orders/kitchen/queue → food (anything that isn't a drink)
//   /api/orders/bar/queue     → drinks only
//
// Both share the same shape so the kitchen and bar pages can reuse
// rendering. The split is by `line.course` — set when the line is
// created, derived from the item's category (see courseHeuristic).
async function buildQueue(predicate) {
  const orders = await Order.find({ status: { $in: ['sent', 'open'] } })
    .populate('table')
    .sort({ updatedAt: 1 });
  const queue = [];
  for (const o of orders) {
    for (const l of o.lines) {
      if (l.status !== 'preparing' && l.status !== 'pending') continue;
      if (!predicate(l)) continue;
      queue.push({
        orderId: o._id,
        table: o.table ? o.table.label : null,
        line: l,
      });
    }
  }
  return queue;
}

router.get('/kitchen/queue', async (req, res, next) => {
  try {
    res.json(await buildQueue((l) => l.course !== 'drink'));
  } catch (e) { next(e); }
});

router.get('/bar/queue', async (req, res, next) => {
  try {
    res.json(await buildQueue((l) => l.course === 'drink'));
  } catch (e) { next(e); }
});

module.exports = router;
