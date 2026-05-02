const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, default: '#64748b' }, // tailwind slate-500
    sortOrder: { type: Number, default: 0 },
    // VAT/tax rate as a percentage. -1 means "use Settings.defaultTaxRate"
    // so categories without an explicit rate inherit the global default.
    taxRate: { type: Number, default: -1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', CategorySchema);
