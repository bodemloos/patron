const mongoose = require('mongoose');

const HaccpCleaningLogSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'HaccpCleaningTask', required: true },
    completedAt: { type: Date, default: () => new Date() },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

HaccpCleaningLogSchema.index({ task: 1, completedAt: -1 });

module.exports = mongoose.model('HaccpCleaningLog', HaccpCleaningLogSchema);
