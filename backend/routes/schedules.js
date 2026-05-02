const router = require('express').Router();
const ScheduledShift = require('../models/ScheduledShift');
const events = require('../lib/events');

// GET /api/schedules?from=ISO&to=ISO
router.get('/', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.from || req.query.to) {
      q.startsAt = {};
      if (req.query.from) q.startsAt.$gte = new Date(req.query.from);
      if (req.query.to) q.startsAt.$lte = new Date(req.query.to);
    }
    const list = await ScheduledShift.find(q)
      .populate('staff', 'name role hourlyRate')
      .sort({ startsAt: 1 })
      .lean({ virtuals: true });
    res.json(list);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const s = await ScheduledShift.create({
      staff: req.body.staff,
      startsAt: new Date(req.body.startsAt),
      endsAt: new Date(req.body.endsAt),
      role: req.body.role || '',
      note: req.body.note || '',
      published: !!req.body.published,
    });
    events.publish('schedule:updated', { id: String(s._id) });
    res.status(201).json(s);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const update = {};
    for (const k of ['staff', 'role', 'note', 'published']) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    if (req.body.startsAt) update.startsAt = new Date(req.body.startsAt);
    if (req.body.endsAt) update.endsAt = new Date(req.body.endsAt);
    const s = await ScheduledShift.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!s) return res.status(404).json({ error: 'Not found' });
    events.publish('schedule:updated', { id: String(s._id) });
    res.json(s);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await ScheduledShift.findByIdAndDelete(req.params.id);
    events.publish('schedule:updated', { id: String(req.params.id) });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
