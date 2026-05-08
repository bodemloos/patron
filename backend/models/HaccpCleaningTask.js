const mongoose = require('mongoose');

/**
 * HaccpCleaningTask — a recurring cleaning duty (daily, weekly, monthly).
 * The Cleaning tab on the HACCP page lists each active task with the
 * timestamp of its most recent log so the team can see what's overdue.
 */
const HaccpCleaningTaskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    area: { type: String, trim: true, default: '' },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily',
    },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HaccpCleaningTask', HaccpCleaningTaskSchema);
