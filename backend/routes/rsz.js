const router = require('express').Router();
const RSZDeclaration = require('../models/RSZDeclaration');
const Shift = require('../models/Shift');
const Contract = require('../models/Contract');
const Staff = require('../models/Staff');
const events = require('../lib/events');

/**
 * RSZ dashboard + hours submission.
 *
 * Real submission goes through the RSZ's XML/SOAP webservices with
 * employer credentials and a certified certificate. Until those are
 * wired, this module:
 *   - Stores every would-be submission as an RSZDeclaration record
 *   - Logs the payload to the server console
 *   - Returns a fake confirmation number so the audit UI is complete
 */

// GET /api/rsz/declarations?type=&status=&from=&to=
router.get('/declarations', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.type) q.type = req.query.type;
    if (req.query.status) q.status = req.query.status;
    if (req.query.from || req.query.to) {
      q.createdAt = {};
      if (req.query.from) q.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) q.createdAt.$lte = new Date(req.query.to);
    }
    const list = await RSZDeclaration.find(q)
      .populate('staff', 'name nissNumber')
      .populate('contract', 'statute jobTitle startDate endDate')
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 200)
      .lean();
    res.json(list);
  } catch (e) { next(e); }
});

// POST /api/rsz/hours-batch  body: { from, to, staffIds? }
// Aggregates clocked Shift hours per staff for the period and stores a
// "would-be" DmfA-style payload as an RSZDeclaration.
router.post('/hours-batch', async (req, res, next) => {
  try {
    const from = new Date(req.body.from);
    const to = new Date(req.body.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ error: 'from and to (ISO dates) are required' });
    }

    const staffFilter = Array.isArray(req.body.staffIds) && req.body.staffIds.length
      ? { staff: { $in: req.body.staffIds } }
      : {};

    const shifts = await Shift.find({
      ...staffFilter,
      clockIn: { $gte: from, $lte: to },
      clockOut: { $ne: null },
    }).populate('staff').lean();

    // Aggregate hours per staff member.
    const byStaff = new Map();
    for (const s of shifts) {
      if (!s.staff) continue;
      const key = String(s.staff._id);
      const hours = (new Date(s.clockOut) - new Date(s.clockIn)) / 36e5;
      const cur = byStaff.get(key) || {
        staffId: key,
        name: s.staff.name,
        niss: (s.staff.nissNumber || '').replace(/\D/g, ''),
        hours: 0, gross: 0, shifts: 0,
      };
      cur.hours += hours;
      cur.gross += hours * (s.hourlyRateSnapshot || 0);
      cur.shifts += 1;
      byStaff.set(key, cur);
    }
    const workers = Array.from(byStaff.values()).map((w) => ({
      ...w,
      hours: round2(w.hours),
      gross: round2(w.gross),
    }));

    const payload = {
      Period: { From: from.toISOString().slice(0, 10), To: to.toISOString().slice(0, 10) },
      JointCommittee: '302',
      Workers: workers,
      Totals: {
        workerCount: workers.length,
        hours: round2(workers.reduce((a, w) => a + w.hours, 0)),
        gross: round2(workers.reduce((a, w) => a + w.gross, 0)),
      },
    };

    const dec = await RSZDeclaration.create({
      type: 'hours_batch',
      periodFrom: from,
      periodTo: to,
      payload,
      status: 'submitted',
      confirmationNumber: fakeConfirmation('hours'),
      submittedAt: new Date(),
    });

    // eslint-disable-next-line no-console
    console.log(`[rsz] (stub) Submitted hours batch — ${workers.length} workers, ${payload.Totals.hours}h, conf ${dec.confirmationNumber}`);
    events.publish('rsz:declaration', { id: String(dec._id) });

    res.status(201).json(dec);
  } catch (e) { next(e); }
});

// GET /api/rsz/hours-preview?from=&to=  — same aggregation, no save.
router.get('/hours-preview', async (req, res, next) => {
  try {
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ error: 'from and to (ISO dates) are required' });
    }
    const shifts = await Shift.find({
      clockIn: { $gte: from, $lte: to },
      clockOut: { $ne: null },
    }).populate('staff').lean();

    const byStaff = new Map();
    for (const s of shifts) {
      if (!s.staff) continue;
      const key = String(s.staff._id);
      const hours = (new Date(s.clockOut) - new Date(s.clockIn)) / 36e5;
      const cur = byStaff.get(key) || { staffId: key, name: s.staff.name, niss: s.staff.nissNumber || '', hours: 0, gross: 0, shifts: 0 };
      cur.hours += hours;
      cur.gross += hours * (s.hourlyRateSnapshot || 0);
      cur.shifts += 1;
      byStaff.set(key, cur);
    }
    res.json({
      from: req.query.from,
      to: req.query.to,
      workers: Array.from(byStaff.values()).map((w) => ({ ...w, hours: round2(w.hours), gross: round2(w.gross) })),
    });
  } catch (e) { next(e); }
});

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function fakeConfirmation(type) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${type === 'hours' ? 'DMFA' : 'RSZ'}-${stamp}-${rand}`;
}

module.exports = router;
