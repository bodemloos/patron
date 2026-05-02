const router = require('express').Router();
const Settings = require('../models/Settings');
const events = require('../lib/events');

router.get('/', async (req, res, next) => {
  try {
    const s = await Settings.get();
    res.json(s);
  } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try {
    const s = await Settings.get();
    const allowed = [
      'restaurantName', 'currency', 'timezone',
      'openingHours', 'closures',
      'reservationSlotMinutes', 'reservationDurationMinutes',
      'defaultTaxRate', 'tipsEnabled', 'tipSuggestions',
      'reservationRemindersEnabled', 'reservationReminderHoursAhead',
    ];
    for (const k of allowed) {
      if (req.body[k] !== undefined) s[k] = req.body[k];
    }
    await s.save();
    events.publish('settings:updated', {});
    res.json(s);
  } catch (e) { next(e); }
});

module.exports = router;
