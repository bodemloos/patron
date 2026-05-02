const router = require('express').Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Reservation = require('../models/Reservation');

// GET /api/customers?q=text
router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const where = q
      ? { $or: [
          { name:  { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } },
        ] }
      : {};
    const list = await Customer.find(where).sort({ lastVisitAt: -1, name: 1 }).lean();
    res.json(list);
  } catch (e) { next(e); }
});

// GET /api/customers/:id  — includes recent visits and reservations
router.get('/:id', async (req, res, next) => {
  try {
    const c = await Customer.findById(req.params.id).lean();
    if (!c) return res.status(404).json({ error: 'Not found' });
    const [orders, reservations] = await Promise.all([
      Order.find({ customer: c._id, status: 'paid' })
        .sort({ paidAt: -1 }).limit(20)
        .select('paidAt total subtotal tip table')
        .populate('table', 'label room')
        .lean(),
      Reservation.find({ customer: c._id })
        .sort({ startsAt: -1 }).limit(20)
        .select('startsAt partySize status notes table')
        .populate('table', 'label room')
        .lean(),
    ]);
    res.json({ ...c, orders, reservations });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const c = await Customer.create({
      name: req.body.name, email: req.body.email,
      phone: req.body.phone, notes: req.body.notes,
      vip: !!req.body.vip,
    });
    res.status(201).json(c);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const c = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
