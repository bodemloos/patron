const mongoose = require('mongoose');

/**
 * Absence — registers a period during which a worker did not work.
 *
 * Most-common Belgian kinds:
 *   sick           — ziekte; the first 30 days are gewaarborgd loon
 *                    (employer-paid), after that the mutuality (ziekenfonds)
 *                    takes over. `paidByEmployer` flags whether the days
 *                    fall under that guaranteed-wage window.
 *   accident       — arbeidsongeval; covered by the work-accident insurer
 *                    from day 1, but still an employer-tracked absence.
 *   holiday        — wettelijk verlof / paid vacation.
 *   unpaid         — onbetaald verlof.
 *   family         — klein verlet / familiale omstandigheden.
 *   other          — any other reason (educatief verlof, tijdskrediet, …).
 *
 * The DmfA hours-batch picks these up so the RSZ payload reflects "X
 * worked days, Y sick days, Z holiday days" instead of just clocked hours.
 */
const KINDS = ['sick', 'accident', 'holiday', 'unpaid', 'family', 'other'];

const AbsenceSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    kind: { type: String, enum: KINDS, required: true, default: 'sick' },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    // For sick: gewaarborgd-loon flag. Defaults to true on `sick` and
    // `accident`, false on the rest. The payroll preview multiplies the
    // worker's hourly rate × an 8-hour day for paid absence days.
    paidByEmployer: { type: Boolean, default: false },
    hasMedicalCertificate: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

AbsenceSchema.statics.KINDS = KINDS;

// Number of days covered by the absence (inclusive of both endpoints).
AbsenceSchema.virtual('days').get(function () {
  if (!this.startsAt || !this.endsAt) return 0;
  const ms = new Date(this.endsAt).setHours(23, 59, 59, 999) -
             new Date(this.startsAt).setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(ms / 86400000));
});

AbsenceSchema.set('toJSON', { virtuals: true });
AbsenceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Absence', AbsenceSchema);
