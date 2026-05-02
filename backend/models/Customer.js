const mongoose = require('mongoose');

/**
 * Customer — a guest record built quietly from reservations and paid
 * orders. Keyed by lowercase email when available, falling back to
 * normalized phone. The auto-link helpers in routes/customers.js attach
 * a Customer to incoming reservations and paid orders.
 */
const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    notes: { type: String, default: '' },
    vip: { type: Boolean, default: false },

    // Aggregates — recomputed lazily in /api/customers/:id and on link.
    visits: { type: Number, default: 0 },
    lifetimeSpend: { type: Number, default: 0 }, // EUR
    lastVisitAt: { type: Date },
  },
  { timestamps: true }
);

CustomerSchema.index({ email: 1 }, { sparse: true });
CustomerSchema.index({ phone: 1 }, { sparse: true });

// Find an existing customer matching either email or phone (case/space
// normalized), or create a new one. Returns the customer doc.
CustomerSchema.statics.findOrCreate = async function ({ name, email, phone, notes }) {
  const e = (email || '').trim().toLowerCase();
  const p = (phone || '').replace(/\s+/g, '');
  const or = [];
  if (e) or.push({ email: e });
  if (p) or.push({ phone: p });
  if (!or.length) return null;
  let c = await this.findOne({ $or: or });
  if (c) {
    let dirty = false;
    if (name && !c.name) { c.name = name; dirty = true; }
    if (e && !c.email) { c.email = e; dirty = true; }
    if (p && !c.phone) { c.phone = p; dirty = true; }
    if (notes && notes !== c.notes) {
      // Only overwrite if there were no notes; otherwise keep customer's notes.
      if (!c.notes) { c.notes = notes; dirty = true; }
    }
    if (dirty) await c.save();
    return c;
  }
  return this.create({ name: name || 'Guest', email: e, phone: p, notes: notes || '' });
};

module.exports = mongoose.model('Customer', CustomerSchema);
