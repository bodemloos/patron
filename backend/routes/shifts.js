const router = require('express').Router();
const dayjs = require('dayjs');
const Shift = require('../models/Shift');
const Staff = require('../models/Staff');

router.get('/', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.staff) q.staff = req.query.staff;
    if (req.query.from || req.query.to) {
      q.clockIn = {};
      if (req.query.from) q.clockIn.$gte = new Date(req.query.from);
      if (req.query.to) q.clockIn.$lte = new Date(req.query.to);
    }
    const list = await Shift.find(q).populate('staff').sort({ clockIn: -1 }).limit(500);
    res.json(list);
  } catch (e) { next(e); }
});

// Clock in
router.post('/', async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.body.staff);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    const s = await Shift.create({
      staff: staff._id,
      clockIn: req.body.clockIn ? new Date(req.body.clockIn) : new Date(),
      clockOut: req.body.clockOut ? new Date(req.body.clockOut) : undefined,
      hourlyRateSnapshot: req.body.hourlyRateSnapshot ?? staff.hourlyRate,
      note: req.body.note || '',
    });
    res.status(201).json(await s.populate('staff'));
  } catch (e) { next(e); }
});

router.patch('/:id/clock-out', async (req, res, next) => {
  try {
    const s = await Shift.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found' });
    s.clockOut = req.body.clockOut ? new Date(req.body.clockOut) : new Date();
    await s.save();
    res.json(await s.populate('staff'));
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const s = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('staff');
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Shift.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Paycheck summary per staff member for a date range
router.get('/payroll/summary', async (req, res, next) => {
  try {
    const from = req.query.from ? dayjs(req.query.from) : dayjs().startOf('month');
    const to = req.query.to ? dayjs(req.query.to) : dayjs().endOf('month');
    const shifts = await Shift.find({
      clockIn: { $gte: from.toDate(), $lte: to.toDate() },
      clockOut: { $ne: null },
    }).populate('staff');
    const byStaff = new Map();
    for (const s of shifts) {
      if (!s.staff) continue;
      const key = String(s.staff._id);
      const prev = byStaff.get(key) || {
        staff: s.staff,
        hours: 0,
        pay: 0,
        shifts: 0,
      };
      const hours = (s.clockOut - s.clockIn) / 36e5;
      prev.hours += hours;
      prev.pay += hours * s.hourlyRateSnapshot;
      prev.shifts += 1;
      byStaff.set(key, prev);
    }
    res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      rows: Array.from(byStaff.values()),
    });
  } catch (e) { next(e); }
});

module.exports = router;
