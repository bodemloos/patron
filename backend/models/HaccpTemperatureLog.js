const mongoose = require('mongoose');

/**
 * HaccpTemperatureLog — a single point-in-time temperature reading on
 * a piece of equipment. `inRange` is captured at write time against
 * the equipment's then-current min/max so that later changes to those
 * thresholds don't silently rewrite history.
 */
const HaccpTemperatureLogSchema = new mongoose.Schema(
  {
    equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'HaccpEquipment', required: true },
    recordedAt: { type: Date, default: () => new Date() },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    temperatureC: { type: Number, required: true },
    inRange: { type: Boolean, default: true },
    correctiveAction: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

HaccpTemperatureLogSchema.index({ equipment: 1, recordedAt: -1 });

module.exports = mongoose.model('HaccpTemperatureLog', HaccpTemperatureLogSchema);
