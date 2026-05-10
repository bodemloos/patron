const router = require('express').Router();
const dayjs = require('dayjs');
const Shift = require('../models/Shift');
const Staff = require('../models/Staff');
const Absence = require('../models/Absence');

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

// Paycheck summary per staff member for a date range.
//
// On top of clocked hours and gross pay this also returns the Belgian
// fringe-benefit lines a payroll manager wants to see in a glance:
//   • mealVoucherDays / mealVoucherEmployerEur — vouchers earned per
//     qualifying day (≥4h worked) for staff opted-in.
//   • kmTotal / mileageEur — kilometers driven (per-shift `kmDriven`
//     overrides the staff `commuteKm` default) × `kmAllowanceEurPerKm`.
//   • absenceDays / sickDays / paidAbsenceDays / sickPayEur — absences
//     overlapping the period, with a separate sub-total for the days
//     paid under gewaarborgd loon (8h × hourlyRate).
router.get('/payroll/summary', async (req, res, next) => {
  try {
    const from = req.query.from ? dayjs(req.query.from) : dayjs().startOf('month');
    const to = req.query.to ? dayjs(req.query.to) : dayjs().endOf('month');
    const fromDate = from.toDate();
    const toDate = to.toDate();
    const [shifts, absences] = await Promise.all([
      Shift.find({
        clockIn: { $gte: fromDate, $lte: toDate },
        clockOut: { $ne: null },
      }).populate('staff'),
      Absence.find({
        // Overlap with the requested window.
        startsAt: { $lte: toDate },
        endsAt: { $gte: fromDate },
      }).populate('staff'),
    ]);

    const byStaff = new Map();
    function rowFor(staff) {
      const key = String(staff._id);
      let row = byStaff.get(key);
      if (!row) {
        row = {
          staff,
          hours: 0,
          pay: 0,
          shifts: 0,
          // fringe benefits
          mealVoucherDays: 0,
          mealVoucherEmployerEur: 0,
          kmTotal: 0,
          mileageEur: 0,
          // absences
          absenceDays: 0,
          sickDays: 0,
          paidAbsenceDays: 0,
          sickPayEur: 0,
        };
        byStaff.set(key, row);
      }
      return row;
    }

    for (const s of shifts) {
      if (!s.staff) continue;
      const row = rowFor(s.staff);
      const hours = (s.clockOut - s.clockIn) / 36e5;
      row.hours += hours;
      row.pay += hours * s.hourlyRateSnapshot;
      row.shifts += 1;

      // Maaltijdcheques: ≥4h worked + opted-in.
      if (hours >= 4 && s.staff.mealVouchersOptIn) {
        row.mealVoucherDays += 1;
        row.mealVoucherEmployerEur += Number(s.staff.mealVoucherEmployerEur) || 0;
      }
      // Kilometervergoeding: shift-level km wins over staff default.
      const km = (Number(s.kmDriven) || 0) || (Number(s.staff.commuteKm) || 0);
      if (km > 0) {
        const rate = Number(s.staff.kmAllowanceEurPerKm) || 0;
        row.kmTotal += km;
        row.mileageEur += km * rate;
      }
    }

    for (const a of absences) {
      if (!a.staff) continue;
      const row = rowFor(a.staff);
      const days = clampOverlapDays(a.startsAt, a.endsAt, fromDate, toDate);
      row.absenceDays += days;
      if (a.kind === 'sick' || a.kind === 'accident') row.sickDays += days;
      if (a.paidByEmployer) {
        row.paidAbsenceDays += days;
        // Gewaarborgd loon — 8-hour day at the staff hourly rate.
        row.sickPayEur += days * 8 * (Number(a.staff.hourlyRate) || 0);
      }
    }

    // Round monetary fields to 2 decimals so the UI doesn't render
    // floating-point noise like "126.31000000000002".
    const rows = Array.from(byStaff.values()).map((r) => ({
      ...r,
      hours: round2(r.hours),
      pay: round2(r.pay),
      mealVoucherEmployerEur: round2(r.mealVoucherEmployerEur),
      mileageEur: round2(r.mileageEur),
      kmTotal: round2(r.kmTotal),
      sickPayEur: round2(r.sickPayEur),
    }));

    res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      rows,
    });
  } catch (e) { next(e); }
});

// Number of full days (inclusive) where the absence overlaps the window.
function clampOverlapDays(absStart, absEnd, winStart, winEnd) {
  const start = new Date(Math.max(new Date(absStart).setHours(0, 0, 0, 0), winStart.getTime()));
  const end = new Date(Math.min(new Date(absEnd).setHours(23, 59, 59, 999), winEnd.getTime()));
  if (end < start) return 0;
  return Math.max(1, Math.round((end - start) / 86400000));
}

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

module.exports = router;
