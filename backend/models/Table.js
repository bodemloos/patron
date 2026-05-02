const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    seats: { type: Number, default: 2 },
    // pixel coordinates on a 1000x700 floor canvas
    x: { type: Number, default: 100 },
    y: { type: Number, default: 100 },
    w: { type: Number, default: 90 },
    h: { type: Number, default: 90 },
    shape: { type: String, enum: ['round', 'square'], default: 'round' },
    room: { type: String, default: 'Main' },
    zone: { type: String, enum: ['indoor', 'outdoor'], default: 'indoor', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Table', TableSchema);
