const router = require('express').Router();
const Room = require('../models/Room');
const Table = require('../models/Table');

router.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find().sort({ sortOrder: 1, name: 1 });
    res.json(rooms);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const r = await Room.create(req.body);
    res.status(201).json(r);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const r = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Not found' });
    // Prevent deleting a room that still has tables
    const inUse = await Table.countDocuments({ room: room.name });
    if (inUse > 0) {
      return res.status(409).json({ error: `${inUse} table(s) still use this room.` });
    }
    await room.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
