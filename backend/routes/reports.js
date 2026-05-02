const router = require('express').Router();
const dayjs = require('dayjs');
const Order = require('../models/Order');
const Shift = require('../models/Shift');

// Range presets
function getRange(rangeKey) {
  const now = dayjs();
  switch (rangeKey) {
    case 'day':
      return { from: now.startOf('day'), to: now.endOf('day'), bucket: 'hour' };
    case 'week':
      return { from: now.startOf('week'), to: now.endOf('week'), bucket: 'day' };
    case 'month':
      return { from: now.startOf('month'), to: now.endOf('month'), bucket: 'day' };
    case 'year':
      return { from: now.startOf('year'), to: now.endOf('year'), bucket: 'month' };
    default:
      return { from: now.startOf('month'), to: now.endOf('month'), bucket: 'day' };
  }
}

function bucketKey(date, bucket) {
  const d = dayjs(date);
  switch (bucket) {
    case 'hour':  return d.format('YYYY-MM-DD HH:00');
    case 'day':   return d.format('YYYY-MM-DD');
    case 'month': return d.format('YYYY-MM');
    default:      return d.format('YYYY-MM-DD');
  }
}

// GET /api/reports/pnl?range=day|week|month|year
router.get('/pnl', async (req, res, next) => {
  try {
    const { from, to, bucket } = getRange(req.query.range || 'month');
    const orders = await Order.find({
      status: 'paid',
      paidAt: { $gte: from.toDate(), $lte: to.toDate() },
    }).select('subtotal cogs paidAt');
    const shifts = await Shift.find({
      clockIn: { $gte: from.toDate(), $lte: to.toDate() },
      clockOut: { $ne: null },
    }).select('clockIn clockOut hourlyRateSnapshot');

    const buckets = new Map();
    function ensure(key) {
      if (!buckets.has(key)) {
        buckets.set(key, { key, revenue: 0, cogs: 0, payroll: 0, profit: 0, orders: 0 });
      }
      return buckets.get(key);
    }

    for (const o of orders) {
      const k = bucketKey(o.paidAt, bucket);
      const b = ensure(k);
      b.revenue += o.subtotal;
      b.cogs += o.cogs;
      b.orders += 1;
    }
    for (const s of shifts) {
      const hours = (s.clockOut - s.clockIn) / 36e5;
      const pay = hours * s.hourlyRateSnapshot;
      const k = bucketKey(s.clockIn, bucket);
      const b = ensure(k);
      b.payroll += pay;
    }

    const series = Array.from(buckets.values())
      .map((b) => ({ ...b, profit: b.revenue - b.cogs - b.payroll }))
      .sort((a, b) => a.key.localeCompare(b.key));

    const totals = series.reduce(
      (a, c) => ({
        revenue: a.revenue + c.revenue,
        cogs: a.cogs + c.cogs,
        payroll: a.payroll + c.payroll,
        profit: a.profit + c.profit,
        orders: a.orders + c.orders,
      }),
      { revenue: 0, cogs: 0, payroll: 0, profit: 0, orders: 0 }
    );

    res.json({
      range: req.query.range || 'month',
      from: from.toISOString(),
      to: to.toISOString(),
      bucket,
      series,
      totals,
    });
  } catch (e) { next(e); }
});

// Top items for the range
router.get('/top-items', async (req, res, next) => {
  try {
    const { from, to } = getRange(req.query.range || 'month');
    const orders = await Order.find({
      status: 'paid',
      paidAt: { $gte: from.toDate(), $lte: to.toDate() },
    }).select('lines');
    const map = new Map();
    for (const o of orders) {
      for (const l of o.lines) {
        const prev = map.get(l.name) || { name: l.name, qty: 0, revenue: 0 };
        prev.qty += l.qty;
        prev.revenue += l.qty * l.price;
        map.set(l.name, prev);
      }
    }
    res.json(
      Array.from(map.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
    );
  } catch (e) { next(e); }
});

// Z-report — end-of-day closeout. Defaults to today; pass ?date=YYYY-MM-DD
// to pull any other day's totals.
router.get('/z-report', async (req, res, next) => {
  try {
    const dateStr = req.query.date;
    const day = dateStr ? dayjs(dateStr) : dayjs();
    const from = day.startOf('day');
    const to = day.endOf('day');

    const orders = await Order.find({
      status: 'paid',
      paidAt: { $gte: from.toDate(), $lte: to.toDate() },
    }).populate('waiter').lean();

    const totals = {
      orders: orders.length,
      subtotal: 0,
      taxAmount: 0,
      tip: 0,
      total: 0,
      cogs: 0,
      paymentMethods: { card: 0, cash: 0, other: 0 },
      taxByRate: new Map(),
      tipsByWaiter: new Map(),
    };
    for (const o of orders) {
      totals.subtotal += o.subtotal || 0;
      totals.taxAmount += o.taxAmount || 0;
      totals.tip += o.tip || 0;
      totals.total += o.total || ((o.subtotal || 0) + (o.taxAmount || 0) + (o.tip || 0));
      totals.cogs += o.cogs || 0;
      const m = (o.paymentMethod || 'other').toLowerCase();
      totals.paymentMethods[m] = (totals.paymentMethods[m] || 0) + (o.total || o.subtotal || 0);
      for (const tb of (o.taxBreakdown || [])) {
        const cur = totals.taxByRate.get(tb.rate) || { rate: tb.rate, net: 0, tax: 0 };
        cur.net += tb.net; cur.tax += tb.tax;
        totals.taxByRate.set(tb.rate, cur);
      }
      if (o.waiter && o.tip) {
        const k = String(o.waiter._id);
        const cur = totals.tipsByWaiter.get(k) || { staff: o.waiter.name, tip: 0 };
        cur.tip += o.tip;
        totals.tipsByWaiter.set(k, cur);
      }
    }

    res.json({
      date: day.format('YYYY-MM-DD'),
      orders: totals.orders,
      subtotal: round(totals.subtotal),
      taxAmount: round(totals.taxAmount),
      tip: round(totals.tip),
      total: round(totals.total),
      cogs: round(totals.cogs),
      paymentMethods: {
        card: round(totals.paymentMethods.card || 0),
        cash: round(totals.paymentMethods.cash || 0),
        other: round(totals.paymentMethods.other || 0),
      },
      taxByRate: Array.from(totals.taxByRate.values())
        .map((b) => ({ rate: b.rate, net: round(b.net), tax: round(b.tax) }))
        .sort((a, b) => a.rate - b.rate),
      tipsByWaiter: Array.from(totals.tipsByWaiter.values())
        .map((t) => ({ ...t, tip: round(t.tip) }))
        .sort((a, b) => b.tip - a.tip),
    });
  } catch (e) { next(e); }
});

function round(n) { return Math.round((Number(n) || 0) * 100) / 100; }

module.exports = router;
