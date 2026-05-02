const router = require('express').Router();
const Category = require('../models/Category');

router.get('/', async (req, res, next) => {
  try {
    const list = await Category.find().sort({ sortOrder: 1, name: 1 });
    res.json(list);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const c = await Category.create(req.body);
    res.status(201).json(c);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const c = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
