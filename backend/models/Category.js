const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, default: '#64748b' }, // tailwind slate-500
    sortOrder: { type: Number, default: 0 },
    // VAT/tax rate as a percentage. -1 means "use Settings.defaultTaxRate"
    // so categories without an explicit rate inherit the global default.
    taxRate: { type: Number, default: -1 },
    // Parent category — null/undefined means it's a top-level category
    // (e.g. "Food", "Drinks"). Children form the second tier shown to
    // customers + the POS as a sub-filter under the active parent.
    // Limited to one level of nesting; a child of a child is not
    // surfaced in the UI as a deeper tree.
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', CategorySchema);
