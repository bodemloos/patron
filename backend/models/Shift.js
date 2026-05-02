const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    clockIn: { type: Date, required: true, default: Date.now },
    clockOut: { type: Date },
    hourlyRateSnapshot: { type: Number, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

ShiftSchema.virtual('hours').get(function () {
  if (!this.clockOut) return 0;
  return (this.clockOut - this.clockIn) / 36e5;
});
ShiftSchema.virtual('pay').get(function () {
  return this.hours * this.hourlyRateSnapshot;
});
ShiftSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Shift', ShiftSchema);
