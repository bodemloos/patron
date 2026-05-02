/**
 * Reservation reminder cron — runs every 5 minutes, finds reservations
 * that start within the configured reminder window and haven't been
 * reminded yet, and "sends" a reminder.
 *
 * For now the actual delivery is a console.log + a stamp on the
 * reservation. Wiring up real email (Resend, Postmark, SendGrid) or SMS
 * (Twilio, MessageBird) is a one-line swap inside `sendReminder()`.
 */
const Reservation = require('../models/Reservation');
const Settings = require('../models/Settings');

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const LOOKAHEAD_GRACE_MS = 30 * 60 * 1000; // catch ones we may have missed

let timer = null;

async function tick() {
  try {
    const settings = await Settings.get();
    if (!settings.reservationRemindersEnabled) return;

    const hours = settings.reservationReminderHoursAhead || 24;
    const now = Date.now();
    const target = new Date(now + hours * 3600 * 1000);
    const windowStart = new Date(target.getTime() - LOOKAHEAD_GRACE_MS);
    const windowEnd = new Date(target.getTime() + LOOKAHEAD_GRACE_MS);

    const due = await Reservation.find({
      status: { $in: ['pending', 'confirmed'] },
      startsAt: { $gte: windowStart, $lte: windowEnd },
      reminderSentAt: null,
    });

    for (const r of due) {
      await sendReminder(r, settings);
      r.reminderSentAt = new Date();
      await r.save();
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[reminders] tick failed', e);
  }
}

async function sendReminder(reservation, settings) {
  const when = reservation.startsAt.toLocaleString();
  // eslint-disable-next-line no-console
  console.log(
    `[reminders] (stub) Would remind ${reservation.name} ` +
    `<${reservation.email || reservation.phone || 'no contact'}> ` +
    `about ${settings.restaurantName} on ${when}.`
  );
  // TODO: swap for a real transactional sender. Example with Resend:
  //   await resend.emails.send({ from, to: reservation.email, subject, html });
}

function start() {
  if (timer) return;
  // First tick after 30s so the server isn't slammed at boot.
  setTimeout(tick, 30 * 1000);
  timer = setInterval(tick, POLL_INTERVAL_MS);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, tick };
