const mongoose = require('mongoose');

/**
 * ScheduledShift — a planned/published shift on the schedule calendar.
 * Distinct from Shift (which is the actual clock-in/out record).
 * Once a staff member clocks in, the manager can optionally link the
 * resulting Shift back to a ScheduledShift via `attachedShift` to
 * compare planned vs actual hours.
 */
const ScheduledShiftSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    role: { type: String, default: '' },
    note: { type: String, default: '' },
    published: { type: Boolean, default: false },
    attachedShift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
  },
  { timestamps: true }
);

ScheduledShiftSchema.index({ startsAt: 1 });
ScheduledShiftSchema.index({ staff: 1, startsAt: 1 });

ScheduledShiftSchema.virtual('hours').get(function () {
  return Math.max(0, (this.endsAt - this.startsAt) / 36e5);
});
ScheduledShiftSchema.set('toJSON', { virtuals: true });
ScheduledShiftSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ScheduledShift', ScheduledShiftSchema);
