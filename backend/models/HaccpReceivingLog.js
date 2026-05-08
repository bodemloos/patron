const mongoose = require('mongoose');

/**
 * HaccpReceivingLog — incoming-goods registratie. Captures the
 * supplier, what was delivered, the receiving temperature for cold
 * chain items, and whether packaging/expiry checks passed. The
 * `correctiveAction` field is populated only when something failed.
 */
const HaccpReceivingLogSchema = new mongoose.Schema(
  {
    receivedAt: { type: Date, default: () => new Date() },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    supplier: { type: String, trim: true, required: true },
    itemsSummary: { type: String, default: '' },
    temperatureC: { type: Number },
    packagingOk: { type: Boolean, default: true },
    expiryOk: { type: Boolean, default: true },
    correctiveAction: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

HaccpReceivingLogSchema.index({ receivedAt: -1 });

module.exports = mongoose.model('HaccpReceivingLog', HaccpReceivingLogSchema);
