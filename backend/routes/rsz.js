const router = require('express').Router();
const RSZDeclaration = require('../models/RSZDeclaration');
const Shift = require('../models/Shift');
const Contract = require('../models/Contract');
const Staff = require('../models/Staff');
const Absence = require('../models/Absence');
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

    const [shifts, absences] = await Promise.all([
      Shift.find({
        ...staffFilter,
        clockIn: { $gte: from, $lte: to },
        clockOut: { $ne: null },
      }).populate('staff').lean(),
      Absence.find({
        ...staffFilter,
        startsAt: { $lte: to },
        endsAt: { $gte: from },
      }).populate('staff').lean(),
    ]);

    // Aggregate hours, mileage and meal vouchers per staff member.
    const byStaff = new Map();
    function workerFor(staff) {
      const key = String(staff._id);
      let cur = byStaff.get(key);
      if (!cur) {
        cur = {
          staffId: key,
          name: staff.name,
          niss: (staff.nissNumber || '').replace(/\D/g, ''),
          mutuality: staff.mutuality || '',
          hours: 0, gross: 0, shifts: 0,
          // Fringe benefits — visible on the DmfA payload so the
          // operator has the full picture even though the RSZ itself
          // doesn't book vouchers/mileage (those are payslip extras).
          mealVoucherDays: 0, mealVoucherEmployerEur: 0,
          kmTotal: 0, mileageEur: 0,
          // Absences split — the only fields actually relevant to
          // DmfA hours codes (CS01 = work, CS50 = sick, CS01 + CSXX
          // for holiday). We keep day counts here.
          sickDays: 0, holidayDays: 0, otherAbsenceDays: 0,
          paidAbsenceDays: 0, sickPayEur: 0,
        };
        byStaff.set(key, cur);
      }
      return cur;
    }

    for (const s of shifts) {
      if (!s.staff) continue;
      const w = workerFor(s.staff);
      const hours = (new Date(s.clockOut) - new Date(s.clockIn)) / 36e5;
      w.hours += hours;
      w.gross += hours * (s.hourlyRateSnapshot || 0);
      w.shifts += 1;

      if (hours >= 4 && s.staff.mealVouchersOptIn) {
        w.mealVoucherDays += 1;
        w.mealVoucherEmployerEur += Number(s.staff.mealVoucherEmployerEur) || 0;
      }
      const km = (Number(s.kmDriven) || 0) || (Number(s.staff.commuteKm) || 0);
      if (km > 0) {
        w.kmTotal += km;
        w.mileageEur += km * (Number(s.staff.kmAllowanceEurPerKm) || 0);
      }
    }

    for (const a of absences) {
      if (!a.staff) continue;
      const w = workerFor(a.staff);
      const days = clampOverlapDays(a.startsAt, a.endsAt, from, to);
      if (a.kind === 'sick' || a.kind === 'accident') w.sickDays += days;
      else if (a.kind === 'holiday') w.holidayDays += days;
      else w.otherAbsenceDays += days;
      if (a.paidByEmployer) {
        w.paidAbsenceDays += days;
        w.sickPayEur += days * 8 * (Number(a.staff.hourlyRate) || 0);
      }
    }

    const workers = Array.from(byStaff.values()).map((w) => ({
      ...w,
      hours: round2(w.hours),
      gross: round2(w.gross),
      mealVoucherEmployerEur: round2(w.mealVoucherEmployerEur),
      kmTotal: round2(w.kmTotal),
      mileageEur: round2(w.mileageEur),
      sickPayEur: round2(w.sickPayEur),
    }));

    const payload = {
      Period: { From: from.toISOString().slice(0, 10), To: to.toISOString().slice(0, 10) },
      JointCommittee: '302',
      Workers: workers,
      Totals: {
        workerCount: workers.length,
        hours: round2(workers.reduce((a, w) => a + w.hours, 0)),
        gross: round2(workers.reduce((a, w) => a + w.gross, 0)),
        sickDays: workers.reduce((a, w) => a + w.sickDays, 0),
        holidayDays: workers.reduce((a, w) => a + w.holidayDays, 0),
        mealVoucherEmployerEur: round2(workers.reduce((a, w) => a + w.mealVoucherEmployerEur, 0)),
        mileageEur: round2(workers.reduce((a, w) => a + w.mileageEur, 0)),
        sickPayEur: round2(workers.reduce((a, w) => a + w.sickPayEur, 0)),
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
    const [shifts, absences] = await Promise.all([
      Shift.find({
        clockIn: { $gte: from, $lte: to },
        clockOut: { $ne: null },
      }).populate('staff').lean(),
      Absence.find({
        startsAt: { $lte: to },
        endsAt: { $gte: from },
      }).populate('staff').lean(),
    ]);

    const byStaff = new Map();
    function workerFor(staff) {
      const key = String(staff._id);
      let cur = byStaff.get(key);
      if (!cur) {
        cur = {
          staffId: key,
          name: staff.name,
          niss: staff.nissNumber || '',
          mutuality: staff.mutuality || '',
          hours: 0, gross: 0, shifts: 0,
          mealVoucherDays: 0, mealVoucherEmployerEur: 0,
          kmTotal: 0, mileageEur: 0,
          sickDays: 0, holidayDays: 0, otherAbsenceDays: 0,
          paidAbsenceDays: 0, sickPayEur: 0,
        };
        byStaff.set(key, cur);
      }
      return cur;
    }

    for (const s of shifts) {
      if (!s.staff) continue;
      const w = workerFor(s.staff);
      const hours = (new Date(s.clockOut) - new Date(s.clockIn)) / 36e5;
      w.hours += hours;
      w.gross += hours * (s.hourlyRateSnapshot || 0);
      w.shifts += 1;
      if (hours >= 4 && s.staff.mealVouchersOptIn) {
        w.mealVoucherDays += 1;
        w.mealVoucherEmployerEur += Number(s.staff.mealVoucherEmployerEur) || 0;
      }
      const km = (Number(s.kmDriven) || 0) || (Number(s.staff.commuteKm) || 0);
      if (km > 0) {
        w.kmTotal += km;
        w.mileageEur += km * (Number(s.staff.kmAllowanceEurPerKm) || 0);
      }
    }

    for (const a of absences) {
      if (!a.staff) continue;
      const w = workerFor(a.staff);
      const days = clampOverlapDays(a.startsAt, a.endsAt, from, to);
      if (a.kind === 'sick' || a.kind === 'accident') w.sickDays += days;
      else if (a.kind === 'holiday') w.holidayDays += days;
      else w.otherAbsenceDays += days;
      if (a.paidByEmployer) {
        w.paidAbsenceDays += days;
        w.sickPayEur += days * 8 * (Number(a.staff.hourlyRate) || 0);
      }
    }

    res.json({
      from: req.query.from,
      to: req.query.to,
      workers: Array.from(byStaff.values()).map((w) => ({
        ...w,
        hours: round2(w.hours),
        gross: round2(w.gross),
        mealVoucherEmployerEur: round2(w.mealVoucherEmployerEur),
        kmTotal: round2(w.kmTotal),
        mileageEur: round2(w.mileageEur),
        sickPayEur: round2(w.sickPayEur),
      })),
    });
  } catch (e) { next(e); }
});

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

function clampOverlapDays(absStart, absEnd, winStart, winEnd) {
  const s = new Date(absStart), e = new Date(absEnd);
  const start = new Date(Math.max(new Date(s).setHours(0, 0, 0, 0), winStart.getTime()));
  const end = new Date(Math.min(new Date(e).setHours(23, 59, 59, 999), winEnd.getTime()));
  if (end < start) return 0;
  return Math.max(1, Math.round((end - start) / 86400000));
}
function fakeConfirmation(type) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${type === 'hours' ? 'DMFA' : 'RSZ'}-${stamp}-${rand}`;
}

module.exports = router;
