const mongoose = require('mongoose');

// Recipe entry: how much of which raw stock item is consumed per sold item.
const RecipeEntrySchema = new mongoose.Schema(
  {
    stockItem: { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem', required: true },
    qty: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

// Optional size variant. When an item has 1+ sizes configured, the POS opens
// the modifier modal so the user must pick one. When the array is empty, the
// POS quick-adds the item with a single tap.
const SizeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    priceDelta: { type: Number, default: 0 },
  },
  { _id: false }
);

const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, default: 0 }, // EUR
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    recipe: { type: [RecipeEntrySchema], default: [] },
    sizes: { type: [SizeSchema], default: [] },
    available: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    // Optional product photo, surfaced on the customer-facing QR menu
    // (order.html). Free-form URL so the manager can paste anything
    // — Cloudinary, Imgur, the restaurant's CDN, a data URI, etc.
    imageUrl: { type: String, default: '' },
    // Optional "more info" link (Untappd page for a beer, the
    // winery's tasting notes for a wine, a Wikipedia article for a
    // dish, …). order.html opens it inside an in-app iframe sheet
    // when present and falls back to a "open externally" button when
    // the destination refuses to be framed.
    infoUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', ItemSchema);
