/**
 * Availability + slot computation for the reservation system.
 *
 * Reads opening hours, slot interval, default duration, and exceptional
 * closure periods from the Settings singleton — so a manager can edit
 * the schedule and the widget reflects it on the next request.
 *
 * Compatibility: the constants exported below are kept for callers that
 * imported them in earlier versions of the code, but the live values
 * always come from Settings inside the helpers.
 */
const Table = require('../models/Table');
const Reservation = require('../models/Reservation');
const Settings = require('../models/Settings');

// Defaults, used when Settings hasn't been initialised yet.
const OPENING_HOURS = { open: '12:00', close: '22:00' };
const SLOT_INTERVAL_MIN = 30;
const DEFAULT_DURATION_MIN = 90;

// Parse "HH:MM" → minutes since midnight.
function parseHM(s) {
  const [h, m] = (s || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function dateAtMinutes(yyyyMmDd, minutes) {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  dt.setMinutes(minutes);
  return dt;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Decide if a given date (server-local Date or YYYY-MM-DD) falls inside
// any closure period. Returns { closed, reason } so the caller can
// short-circuit slot generation and tell the customer *why*.
function closureFor(dateOrStr, settings) {
  const dt = (dateOrStr instanceof Date)
    ? dateOrStr
    : dateAtMinutes(dateOrStr, 12 * 60); // mid-day so DST swings don't bite
  for (const c of (settings?.closures || [])) {
    const from = new Date(c.from);
    const to = new Date(c.to);
    // Treat closures as inclusive on both ends — the manager picks
    // calendar days, not millisecond boundaries.
    const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    if (dt >= fromStart && dt <= toEnd) return { closed: true, reason: c.reason || '' };
  }
  return { closed: false, reason: '' };
}

// Pull the per-weekday opening hours from Settings; falls back to the
// hardcoded default if the document is missing or the day is marked
// closed in the regular-hours config.
function hoursForDate(yyyyMmDd, settings) {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 = Sun … 6 = Sat
  const dayCfg = settings?.openingHours?.[dow];
  if (!dayCfg) return { ...OPENING_HOURS, closed: false };
  if (dayCfg.closed) return { open: dayCfg.open, close: dayCfg.close, closed: true };
  return { open: dayCfg.open || OPENING_HOURS.open, close: dayCfg.close || OPENING_HOURS.close, closed: false };
}

/**
 * Find the smallest available table that seats `partySize` and isn't
 * reserved during [startsAt, startsAt + durationMinutes].
 *
 * Returns { table, closed, reason } — table is the lean Table doc, or
 * null if either no table fits or the date is closed.
 */
async function findAvailableTable(startsAt, durationMinutes, partySize) {
  const settings = await Settings.get();

  // Closure check first — saves a useless table query.
  const cl = closureFor(startsAt, settings);
  if (cl.closed) return { table: null, closed: true, reason: cl.reason };

  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  const candidates = await Table.find({ seats: { $gte: partySize } })
    .sort({ seats: 1, label: 1 })
    .lean();
  if (!candidates.length) return { table: null, closed: false, reason: '' };

  const earliestPossibleStart = new Date(startsAt.getTime() - 6 * 60 * 60 * 1000);
  const live = await Reservation.find({
    status: { $in: ['pending', 'confirmed', 'seated'] },
    startsAt: { $gte: earliestPossibleStart, $lt: endsAt },
  })
    .select('table startsAt durationMinutes')
    .lean();

  const blocked = new Set();
  for (const r of live) {
    if (!r.table) continue;
    const rStart = new Date(r.startsAt);
    const rEnd = new Date(rStart.getTime() + (r.durationMinutes || DEFAULT_DURATION_MIN) * 60 * 1000);
    if (overlaps(startsAt, endsAt, rStart, rEnd)) blocked.add(String(r.table));
  }

  return {
    table: candidates.find((t) => !blocked.has(String(t._id))) || null,
    closed: false,
    reason: '',
  };
}

/**
 * Build the list of bookable time slots for a given date + party size.
 *
 * Returns:
 *   {
 *     slots: [{ time, startsAt, available }],
 *     openingHours: { open, close },
 *     closed: boolean,
 *     closureReason: string,        // when `closed` and a reason was supplied
 *     intervalMinutes, durationMinutes,
 *   }
 *
 * If the date is inside a closure period or the weekday is marked
 * closed in opening hours, slots is [] and `closed` is true.
 */
async function buildSlotsForDate(yyyyMmDd, partySize) {
  const settings = await Settings.get();
  const interval = settings.reservationSlotMinutes || SLOT_INTERVAL_MIN;
  const duration = settings.reservationDurationMinutes || DEFAULT_DURATION_MIN;

  const hours = hoursForDate(yyyyMmDd, settings);
  const cl = closureFor(yyyyMmDd, settings);
  if (cl.closed) {
    return {
      slots: [], closed: true, closureReason: cl.reason,
      openingHours: { open: hours.open, close: hours.close },
      intervalMinutes: interval, durationMinutes: duration,
    };
  }
  if (hours.closed) {
    return {
      slots: [], closed: true, closureReason: '', // weekday closure (no per-row reason)
      openingHours: { open: hours.open, close: hours.close },
      intervalMinutes: interval, durationMinutes: duration,
      weeklyClosed: true,
    };
  }

  const openMin = parseHM(hours.open);
  const closeMin = parseHM(hours.close);
  const lastSlotMin = closeMin - duration;

  const slotMinutes = [];
  for (let m = openMin; m <= lastSlotMin; m += interval) slotMinutes.push(m);
  if (!slotMinutes.length) {
    return {
      slots: [], closed: true, closureReason: '',
      openingHours: { open: hours.open, close: hours.close },
      intervalMinutes: interval, durationMinutes: duration,
    };
  }

  const candidates = await Table.find({ seats: { $gte: partySize } })
    .select('_id seats')
    .lean();

  const empty = !candidates.length;
  const dayStart = dateAtMinutes(yyyyMmDd, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const queryFrom = new Date(dayStart.getTime() - 6 * 60 * 60 * 1000);
  const queryTo = new Date(dayEnd.getTime() + 6 * 60 * 60 * 1000);

  const live = empty ? [] : await Reservation.find({
    status: { $in: ['pending', 'confirmed', 'seated'] },
    startsAt: { $gte: queryFrom, $lt: queryTo },
  })
    .select('table startsAt durationMinutes')
    .lean();

  const candidateIds = candidates.map((c) => String(c._id));

  const slots = slotMinutes.map((m) => {
    const slotStart = dateAtMinutes(yyyyMmDd, m);
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
    if (empty) {
      return {
        time: hhmm(m), startsAt: slotStart.toISOString(), available: 0,
      };
    }
    const blocked = new Set();
    for (const r of live) {
      if (!r.table) continue;
      const id = String(r.table);
      if (!candidateIds.includes(id)) continue;
      const rStart = new Date(r.startsAt);
      const rEnd = new Date(rStart.getTime() + (r.durationMinutes || duration) * 60 * 1000);
      if (overlaps(slotStart, slotEnd, rStart, rEnd)) blocked.add(id);
    }
    return {
      time: hhmm(m), startsAt: slotStart.toISOString(),
      available: candidateIds.filter((id) => !blocked.has(id)).length,
    };
  });

  return {
    slots,
    closed: false,
    closureReason: '',
    openingHours: { open: hours.open, close: hours.close },
    intervalMinutes: interval,
    durationMinutes: duration,
  };
}

function hhmm(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

module.exports = {
  OPENING_HOURS,
  SLOT_INTERVAL_MIN,
  DEFAULT_DURATION_MIN,
  buildSlotsForDate,
  findAvailableTable,
  closureFor,
};
