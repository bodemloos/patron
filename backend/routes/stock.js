const router = require('express').Router();
const StockItem = require('../models/StockItem');

router.get('/', async (req, res, next) => {
  try {
    const list = await StockItem.find().sort({ name: 1 });
    res.json(list);
  } catch (e) { next(e); }
});

// Shopping list — every stock item at or below its minimum, grouped by
// supplier with a suggested order quantity.
router.get('/shopping-list', async (req, res, next) => {
  try {
    const list = await StockItem.find().lean({ virtuals: true });
    const low = list.filter((s) => s.quantity <= s.minQuantity);
    const bySupplier = {};
    for (const s of low) {
      const key = s.supplier?.trim() || '— No supplier —';
      bySupplier[key] = bySupplier[key] || { supplier: key, supplierEmail: s.supplierEmail || '', items: [] };
      // Prefer the first non-empty supplier email seen.
      if (!bySupplier[key].supplierEmail && s.supplierEmail) bySupplier[key].supplierEmail = s.supplierEmail;
      const suggested = s.reorderQuantity > 0
        ? s.reorderQuantity
        : Math.max(0, s.minQuantity * 2 - s.quantity);
      bySupplier[key].items.push({
        _id: s._id, name: s.name, unit: s.unit,
        quantity: s.quantity, minQuantity: s.minQuantity,
        suggested, costPerUnit: s.costPerUnit,
      });
    }
    res.json({
      generatedAt: new Date(),
      groups: Object.values(bySupplier).sort((a, b) => a.supplier.localeCompare(b.supplier)),
      itemsBelow: low.length,
    });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const s = await StockItem.create(req.body);
    res.status(201).json(s);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const s = await StockItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (e) { next(e); }
});

// Adjust quantity (delta can be negative)
router.post('/:id/adjust', async (req, res, next) => {
  try {
    const { delta } = req.body;
    const s = await StockItem.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found' });
    s.quantity += Number(delta) || 0;
    await s.save();
    res.json(s);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await StockItem.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
