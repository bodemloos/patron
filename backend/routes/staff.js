const router = require('express').Router();
const Staff = require('../models/Staff');

router.get('/', async (req, res, next) => {
  try {
    const list = await Staff.find().sort({ active: -1, name: 1 });
    res.json(list);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const s = await Staff.create(req.body);
    res.status(201).json(s);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const s = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
