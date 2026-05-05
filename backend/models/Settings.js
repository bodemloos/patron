const mongoose = require('mongoose');

/**
 * Settings — singleton configuration for the restaurant.
 *
 * Read with `Settings.get()`; never instantiate directly. The first read
 * lazily creates a defaults document so the rest of the app can rely on
 * it always existing.
 */
const HoursSchema = new mongoose.Schema(
  {
    open: { type: String, default: '12:00' },
    close: { type: String, default: '22:00' },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const SettingsSchema = new mongoose.Schema(
  {
    // Branding / locale
    restaurantName: { type: String, default: 'Patron' },
    currency: { type: String, default: 'EUR' },
    timezone: { type: String, default: 'Europe/Brussels' },

    // Reservation / availability config
    openingHours: {
      // Per-weekday config; index 0 = Sunday … 6 = Saturday.
      type: [HoursSchema],
      default: () => ([
        { open: '12:00', close: '22:00', closed: true  }, // Sun
        { open: '12:00', close: '22:00', closed: false }, // Mon
        { open: '12:00', close: '22:00', closed: false }, // Tue
        { open: '12:00', close: '22:00', closed: false }, // Wed
        { open: '12:00', close: '22:00', closed: false }, // Thu
        { open: '12:00', close: '22:30', closed: false }, // Fri
        { open: '12:00', close: '22:30', closed: false }, // Sat
      ]),
    },
    reservationSlotMinutes: { type: Number, default: 30 },
    reservationDurationMinutes: { type: Number, default: 90 },

    // Exceptional closure periods — holidays, vacations, private events.
    // The reservation widget refuses to offer slots whose date falls
    // anywhere within `[from, to]` (inclusive on both ends).
    closures: {
      type: [{
        from: { type: Date, required: true },
        to:   { type: Date, required: true },
        reason: { type: String, default: '' },
      }],
      default: [],
    },

    // Tax + tipping
    defaultTaxRate: { type: Number, default: 12 }, // % — Belgian restaurant rate
    tipsEnabled: { type: Boolean, default: true },
    tipSuggestions: { type: [Number], default: [0, 5, 10, 15] }, // % offered at pay time

    // Reminders
    reservationRemindersEnabled: { type: Boolean, default: true },
    reservationReminderHoursAhead: { type: Number, default: 24 },

    // Styling for the customer-facing /order.html page (the QR menu).
    // Pulled by the public menu endpoint and applied as CSS-variable
    // overrides on the customer's device.
    customerMenu: {
      type: {
        brandColor:    { type: String, default: '#ea580c' }, // primary buttons + active states
        accentColor:   { type: String, default: '' },        // blank → derives from brand
        mode:          { type: String, enum: ['auto', 'dark', 'light'], default: 'auto' },
        tagline:       { type: String, default: '' },        // one-liner under restaurant name
        coverImageUrl: { type: String, default: '' },        // optional banner at the top
        headingFont:   { type: String, default: '' },        // Google Font family — blank = Inter
        // Layout drives item-card structure on /order.html. 'magazine'
        // is the default row-with-product-photo design; 'grid' is the
        // older 2/3-column cards; 'list' is a single-column rows-only
        // layout without imagery; 'compact' is a dense printed-menu
        // look with hairline dividers.
        layout:        { type: String, enum: ['magazine', 'grid', 'list', 'compact'], default: 'magazine' },
        // Stamp identifying which preset was last picked in the editor.
        // Purely informational — the actual values live in the fields
        // above so manual edits never get clobbered.
        theme:         { type: String, default: 'patron' },
      },
      default: () => ({}),
    },
  },
  { timestamps: true }
);

// Singleton helper — there is only ever one Settings doc.
SettingsSchema.statics.get = async function () {
  let s = await this.findOne();
  if (!s) s = await this.create({});
  return s;
};

module.exports = mongoose.model('Settings', SettingsSchema);
