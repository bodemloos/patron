const mongoose = require('mongoose');

/**
 * HaccpEquipment — a unit whose temperature must be logged regularly
 * (fridges, freezers, hot-hold cabinets, etc.). Drives the dropdown on
 * the temperature-registratie form and the target min/max range used
 * to flag out-of-spec readings.
 */
const HaccpEquipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['fridge', 'freezer', 'hot-holding', 'other'],
      default: 'fridge',
    },
    location: { type: String, trim: true, default: '' },
    minTempC: { type: Number, default: 0 },
    maxTempC: { type: Number, default: 7 },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HaccpEquipment', HaccpEquipmentSchema);
