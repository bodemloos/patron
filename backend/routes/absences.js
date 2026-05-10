const router = require('express').Router();
const Absence = require('../models/Absence');

// GET /api/absences?staff=&kind=&from=&to=
router.get('/', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.staff) q.staff = req.query.staff;
    if (req.query.kind) q.kind = req.query.kind;
    if (req.query.from || req.query.to) {
      // Match overlap with [from, to]: NOT (endsAt < from || startsAt > to).
      const from = req.query.from ? new Date(req.query.from) : null;
      const to = req.query.to ? new Date(req.query.to) : null;
      const ranges = [];
      if (from) ranges.push({ endsAt: { $gte: from } });
      if (to) ranges.push({ startsAt: { $lte: to } });
      if (ranges.length) q.$and = ranges;
    }
    const list = await Absence.find(q)
      .populate('staff', 'name role')
      .sort({ startsAt: -1 })
      .limit(Number(req.query.limit) || 200)
      .lean({ virtuals: true });
    res.json(list);
  } catch (e) { next(e); }
});

router.get('/kinds', (req, res) => res.json(Absence.KINDS));

router.post('/', async (req, res, next) => {
  try {
    const kind = req.body.kind || 'sick';
    // Default paidByEmployer when caller didn't specify.
    const paidByEmployer = req.body.paidByEmployer !== undefined
      ? !!req.body.paidByEmployer
      : (kind === 'sick' || kind === 'accident' || kind === 'holiday');
    const a = await Absence.create({
      staff: req.body.staff,
      kind,
      startsAt: new Date(req.body.startsAt),
      endsAt: new Date(req.body.endsAt || req.body.startsAt),
      paidByEmployer,
      hasMedicalCertificate: !!req.body.hasMedicalCertificate,
      notes: req.body.notes || '',
    });
    res.status(201).json(await a.populate('staff', 'name role'));
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const update = { ...req.body };
    if (update.startsAt) update.startsAt = new Date(update.startsAt);
    if (update.endsAt) update.endsAt = new Date(update.endsAt);
    const a = await Absence.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('staff', 'name role')
      .lean({ virtuals: true });
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json(a);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Absence.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
