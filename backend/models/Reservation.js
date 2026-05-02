const mongoose = require('mongoose');

/**
 * Reservation — a customer booking for a specific party size, date, and time.
 *
 * The booking flow auto-assigns the smallest available table that fits the
 * party. Reservations span `durationMinutes` from `startsAt`, and overlap
 * detection in the routes layer prevents double-booking the same table.
 */
const ReservationSchema = new mongoose.Schema(
  {
    // Customer details
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },

    // Booking
    partySize: { type: Number, required: true, min: 1, default: 2 },
    startsAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 90, min: 15 },

    // Assignment
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },

    // Lifecycle
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'seated', 'cancelled', 'no_show'],
      default: 'confirmed',
      index: true,
    },

    notes: { type: String, default: '' },

    // Where the booking originated.
    source: { type: String, enum: ['widget', 'manual'], default: 'manual' },

    // Loyalty link — auto-attached on save when email/phone match.
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },

    // Reminder tracking — set once the cron has fired the 24h-ahead reminder
    // for this reservation, so we don't double-send.
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for the availability query: "any reservation overlapping
// this time window for this table?" — uses table + startsAt narrow scan.
ReservationSchema.index({ table: 1, startsAt: 1 });
ReservationSchema.index({ startsAt: 1 });

// Convenience: end time = startsAt + durationMinutes.
ReservationSchema.virtual('endsAt').get(function () {
  return new Date(this.startsAt.getTime() + this.durationMinutes * 60 * 1000);
});

ReservationSchema.set('toJSON', { virtuals: true });
ReservationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Reservation', ReservationSchema);
