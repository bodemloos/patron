const router = require('express').Router();
const Order = require('../models/Order');
const Shift = require('../models/Shift');

/**
 * Bookkeeping CSV export.
 *
 *   GET /api/exports/orders.csv?from=ISO&to=ISO
 *   GET /api/exports/shifts.csv?from=ISO&to=ISO
 *
 * Returns plain CSV text — easy to drop into accounting software.
 */

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  // Quote if it contains a comma, quote, or newline.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function csvRow(cells) { return cells.map(csvCell).join(',') + '\n'; }

router.get('/orders.csv', async (req, res, next) => {
  try {
    const q = { status: 'paid' };
    if (req.query.from) q.paidAt = { ...(q.paidAt || {}), $gte: new Date(req.query.from) };
    if (req.query.to)   q.paidAt = { ...(q.paidAt || {}), $lte: new Date(req.query.to) };
    const orders = await Order.find(q).populate('table waiter customer').sort({ paidAt: 1 }).lean();

    let out = csvRow([
      'paidAt', 'orderId', 'table', 'waiter', 'customer',
      'subtotal', 'taxAmount', 'tip', 'total', 'cogs', 'paymentMethod', 'taxBreakdown',
    ]);
    for (const o of orders) {
      out += csvRow([
        o.paidAt && o.paidAt.toISOString(),
        String(o._id),
        o.table?.label || '',
        o.waiter?.name || '',
        o.customer?.name || '',
        (o.subtotal ?? 0).toFixed(2),
        (o.taxAmount ?? 0).toFixed(2),
        (o.tip ?? 0).toFixed(2),
        (o.total ?? (o.subtotal + (o.taxAmount || 0) + (o.tip || 0))).toFixed(2),
        (o.cogs ?? 0).toFixed(2),
        o.paymentMethod || '',
        (o.taxBreakdown || []).map((b) => `${b.rate}%:${b.net.toFixed(2)}/${b.tax.toFixed(2)}`).join(' | '),
      ]);
    }
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send(out);
  } catch (e) { next(e); }
});

router.get('/shifts.csv', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.from) q.clockIn = { ...(q.clockIn || {}), $gte: new Date(req.query.from) };
    if (req.query.to)   q.clockIn = { ...(q.clockIn || {}), $lte: new Date(req.query.to) };
    const shifts = await Shift.find(q).populate('staff').sort({ clockIn: 1 }).lean({ virtuals: true });

    let out = csvRow(['staff', 'role', 'clockIn', 'clockOut', 'hours', 'rate', 'pay', 'note']);
    for (const s of shifts) {
      const hours = s.clockOut ? (new Date(s.clockOut) - new Date(s.clockIn)) / 36e5 : 0;
      const pay = hours * (s.hourlyRateSnapshot || 0);
      out += csvRow([
        s.staff?.name || '',
        s.staff?.role || '',
        new Date(s.clockIn).toISOString(),
        s.clockOut ? new Date(s.clockOut).toISOString() : '',
        hours.toFixed(2),
        (s.hourlyRateSnapshot || 0).toFixed(2),
        pay.toFixed(2),
        s.note || '',
      ]);
    }
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="shifts.csv"');
    res.send(out);
  } catch (e) { next(e); }
});

module.exports = router;
