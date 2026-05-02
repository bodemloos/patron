const mongoose = require('mongoose');

const ModifierSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g. "Large", "Oat milk"
    priceDelta: { type: Number, default: 0 }, // EUR added/subtracted per unit
  },
  { _id: false }
);

const OrderLineSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    name: { type: String, required: true }, // snapshot at time of order
    basePrice: { type: Number, required: true, default: 0 }, // item.price snapshot
    price: { type: Number, required: true }, // final per-unit price (basePrice + modifier deltas)
    qty: { type: Number, default: 1 },
    modifiers: { type: [ModifierSchema], default: [] },
    note: { type: String, default: '' },
    // Course pacing — kitchen view groups by course, fires together.
    course: {
      type: String,
      enum: ['starter', 'main', 'dessert', 'drink', 'other'],
      default: 'other',
    },
    // Kitchen tax-rate snapshot — recorded at line creation time so a
    // later category-rate edit doesn't retroactively change paid orders.
    taxRate: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'served'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

const OrderSchema = new mongoose.Schema(
  {
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    waiter: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    lines: { type: [OrderLineSchema], default: [] },
    status: {
      type: String,
      enum: ['open', 'sent', 'paid', 'cancelled'],
      default: 'open',
    },
    subtotal: { type: Number, default: 0 },     // pre-tax line total
    taxAmount: { type: Number, default: 0 },     // VAT collected
    taxBreakdown: {                              // per-rate breakdown for the Z-report
      type: [{
        rate: Number,                            // %
        net: Number,
        tax: Number,
      }],
      default: [],
    },
    tip: { type: Number, default: 0 },           // captured at pay time
    total: { type: Number, default: 0 },         // subtotal + taxAmount + tip
    cogs: { type: Number, default: 0 },          // cost of goods, computed at paid time
    paidAt: { type: Date },
    paymentMethod: { type: String, enum: ['cash', 'card', 'other'], default: 'card' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    // Where the order originated. 'qr' = a customer's phone scanned a
    // table QR; 'staff' = waiter/POS; 'reservation' = pre-walked-in res.
    source: { type: String, enum: ['staff', 'qr', 'reservation'], default: 'staff' },
  },
  { timestamps: true }
);

// Recompute subtotal, tax (per-line rate), and total. The tip is a
// separate captured value — it's added to the total but never to subtotal.
OrderSchema.methods.recomputeSubtotal = function () {
  let subtotal = 0;
  const byRate = new Map();
  for (const l of this.lines) {
    const lineNet = l.price * l.qty;
    subtotal += lineNet;
    const r = Number(l.taxRate) || 0;
    const slice = byRate.get(r) || { rate: r, net: 0, tax: 0 };
    slice.net += lineNet;
    slice.tax += lineNet * (r / 100);
    byRate.set(r, slice);
  }
  this.subtotal = round2(subtotal);
  this.taxBreakdown = Array.from(byRate.values())
    .filter((s) => s.net > 0)
    .map((s) => ({ rate: s.rate, net: round2(s.net), tax: round2(s.tax) }));
  this.taxAmount = round2(this.taxBreakdown.reduce((acc, s) => acc + s.tax, 0));
  this.total = round2(this.subtotal + this.taxAmount + (Number(this.tip) || 0));
  return this.subtotal;
};

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

module.exports = mongoose.model('Order', OrderSchema);
