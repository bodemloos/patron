const mongoose = require('mongoose');

const StockItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, default: 'pcs' }, // e.g. 'g', 'ml', 'pcs', 'bottle'
    quantity: { type: Number, default: 0 },
    minQuantity: { type: Number, default: 0 }, // low-stock threshold
    costPerUnit: { type: Number, default: 0 }, // EUR
    supplier: { type: String, default: '' },
    supplierEmail: { type: String, default: '', trim: true, lowercase: true },
    // Default reorder quantity to add to the shopping list when below
    // minQuantity. 0 means "fall back to (minQuantity * 2 - quantity)".
    reorderQuantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

StockItemSchema.virtual('isLow').get(function () {
  return this.quantity <= this.minQuantity;
});
// How much to order on the shopping list when this item is low.
StockItemSchema.virtual('suggestedOrderQty').get(function () {
  if (this.reorderQuantity > 0) return this.reorderQuantity;
  return Math.max(0, this.minQuantity * 2 - this.quantity);
});
StockItemSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('StockItem', StockItemSchema);
