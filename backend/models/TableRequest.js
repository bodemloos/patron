const mongoose = require('mongoose');

/**
 * TableRequest — a guest at a table tapping "Request the waiter" or
 * "Request the bill" on the QR menu (order.html). Stays in
 * `pending` until a staff member acknowledges it from the floor
 * plan, at which point it flips to `acknowledged` and (after a few
 * minutes) gets archived/cleaned by the housekeeping cron.
 *
 * `kind`:
 *   - 'waiter' → "Could a waiter come over?"  (hand for service, more drinks, …)
 *   - 'bill'   → "We'd like to pay."
 *
 * `note` is reserved for a later "tell the waiter why" optional input;
 * unused for now.
 */
const TableRequestSchema = new mongoose.Schema(
  {
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    kind:  { type: String, enum: ['waiter', 'bill'], required: true },
    status: {
      type: String,
      enum: ['pending', 'acknowledged'],
      default: 'pending',
      index: true,
    },
    note:           { type: String, default: '' },
    acknowledgedAt: { type: Date,   default: null },
    acknowledgedBy: { type: String, default: '' }, // staff name string, optional
  },
  { timestamps: true }
);

// Sensible TTL: clean acknowledged requests after 6h so the inbox
// stays focused on what's live. We keep them around for a window so
// the manager can audit a rough history if a customer complains.
TableRequestSchema.index(
  { acknowledgedAt: 1 },
  { expireAfterSeconds: 6 * 3600, partialFilterExpression: { status: 'acknowledged' } }
);

module.exports = mongoose.model('TableRequest', TableRequestSchema);
