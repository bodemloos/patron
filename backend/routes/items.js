const router = require('express').Router();
const Item = require('../models/Item');

router.get('/', async (req, res, next) => {
  try {
    const list = await Item.find()
      .populate('category')
      .populate('recipe.stockItem')
      .sort({ sortOrder: 1, name: 1 });
    res.json(list);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const it = await Item.create(req.body);
    const populated = await it.populate(['category', 'recipe.stockItem']);
    res.status(201).json(populated);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const it = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('category')
      .populate('recipe.stockItem');
    if (!it) return res.status(404).json({ error: 'Not found' });
    res.json(it);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
