const router = require('express').Router();
const HaccpEquipment = require('../models/HaccpEquipment');
const HaccpTemperatureLog = require('../models/HaccpTemperatureLog');
const HaccpCleaningTask = require('../models/HaccpCleaningTask');
const HaccpCleaningLog = require('../models/HaccpCleaningLog');
const HaccpReceivingLog = require('../models/HaccpReceivingLog');

// ---------------------------------------------------------------------------
// Equipment (fridges, freezers, hot-hold cabinets, ...)
// ---------------------------------------------------------------------------

router.get('/equipment', async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === '1';
    const where = includeInactive ? {} : { active: true };
    res.json(await HaccpEquipment.find(where).sort({ sortOrder: 1, name: 1 }).lean());
  } catch (e) { next(e); }
});

router.post('/equipment', async (req, res, next) => {
  try { res.status(201).json(await HaccpEquipment.create(req.body)); }
  catch (e) { next(e); }
});

router.put('/equipment/:id', async (req, res, next) => {
  try {
    const e = await HaccpEquipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!e) return res.status(404).json({ error: 'Not found' });
    res.json(e);
  } catch (e) { next(e); }
});

router.delete('/equipment/:id', async (req, res, next) => {
  try {
    await HaccpEquipment.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Temperature logs
// ---------------------------------------------------------------------------

router.get('/temperature-logs', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.equipment) where.equipment = req.query.equipment;
    if (req.query.from || req.query.to) {
      where.recordedAt = {};
      if (req.query.from) where.recordedAt.$gte = new Date(req.query.from);
      if (req.query.to) where.recordedAt.$lte = new Date(req.query.to);
    }
    const list = await HaccpTemperatureLog.find(where)
      .populate('equipment', 'name type minTempC maxTempC location')
      .populate('recordedBy', 'name')
      .sort({ recordedAt: -1 })
      .limit(Number(req.query.limit) || 200)
      .lean();
    res.json(list);
  } catch (e) { next(e); }
});

router.post('/temperature-logs', async (req, res, next) => {
  try {
    const eq = await HaccpEquipment.findById(req.body.equipment);
    if (!eq) return res.status(400).json({ error: 'Unknown equipment' });
    const temperatureC = Number(req.body.temperatureC);
    if (!Number.isFinite(temperatureC)) {
      return res.status(400).json({ error: 'temperatureC must be a number' });
    }
    const inRange = temperatureC >= eq.minTempC && temperatureC <= eq.maxTempC;
    const log = await HaccpTemperatureLog.create({
      equipment: eq._id,
      recordedAt: req.body.recordedAt ? new Date(req.body.recordedAt) : new Date(),
      recordedBy: req.body.recordedBy || undefined,
      temperatureC,
      inRange,
      correctiveAction: req.body.correctiveAction || '',
      notes: req.body.notes || '',
    });
    res.status(201).json(await log.populate([
      { path: 'equipment', select: 'name type minTempC maxTempC location' },
      { path: 'recordedBy', select: 'name' },
    ]));
  } catch (e) { next(e); }
});

router.delete('/temperature-logs/:id', async (req, res, next) => {
  try {
    await HaccpTemperatureLog.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Cleaning tasks + logs
// ---------------------------------------------------------------------------

router.get('/cleaning-tasks', async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === '1';
    const where = includeInactive ? {} : { active: true };
    const tasks = await HaccpCleaningTask.find(where)
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    // Attach last-completion timestamp so the UI can flag overdue work.
    const ids = tasks.map((t) => t._id);
    const latest = await HaccpCleaningLog.aggregate([
      { $match: { task: { $in: ids } } },
      { $sort: { completedAt: -1 } },
      { $group: { _id: '$task', completedAt: { $first: '$completedAt' } } },
    ]);
    const byTask = Object.fromEntries(latest.map((l) => [String(l._id), l.completedAt]));
    res.json(tasks.map((t) => ({ ...t, lastCompletedAt: byTask[String(t._id)] || null })));
  } catch (e) { next(e); }
});

router.post('/cleaning-tasks', async (req, res, next) => {
  try { res.status(201).json(await HaccpCleaningTask.create(req.body)); }
  catch (e) { next(e); }
});

router.put('/cleaning-tasks/:id', async (req, res, next) => {
  try {
    const t = await HaccpCleaningTask.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (e) { next(e); }
});

router.delete('/cleaning-tasks/:id', async (req, res, next) => {
  try {
    await HaccpCleaningTask.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/cleaning-logs', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.task) where.task = req.query.task;
    if (req.query.from || req.query.to) {
      where.completedAt = {};
      if (req.query.from) where.completedAt.$gte = new Date(req.query.from);
      if (req.query.to) where.completedAt.$lte = new Date(req.query.to);
    }
    const list = await HaccpCleaningLog.find(where)
      .populate('task', 'name area frequency')
      .populate('completedBy', 'name')
      .sort({ completedAt: -1 })
      .limit(Number(req.query.limit) || 200)
      .lean();
    res.json(list);
  } catch (e) { next(e); }
});

router.post('/cleaning-logs', async (req, res, next) => {
  try {
    const log = await HaccpCleaningLog.create({
      task: req.body.task,
      completedAt: req.body.completedAt ? new Date(req.body.completedAt) : new Date(),
      completedBy: req.body.completedBy || undefined,
      notes: req.body.notes || '',
    });
    res.status(201).json(await log.populate([
      { path: 'task', select: 'name area frequency' },
      { path: 'completedBy', select: 'name' },
    ]));
  } catch (e) { next(e); }
});

router.delete('/cleaning-logs/:id', async (req, res, next) => {
  try {
    await HaccpCleaningLog.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Receiving logs (incoming goods)
// ---------------------------------------------------------------------------

router.get('/receiving-logs', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.from || req.query.to) {
      where.receivedAt = {};
      if (req.query.from) where.receivedAt.$gte = new Date(req.query.from);
      if (req.query.to) where.receivedAt.$lte = new Date(req.query.to);
    }
    const list = await HaccpReceivingLog.find(where)
      .populate('receivedBy', 'name')
      .sort({ receivedAt: -1 })
      .limit(Number(req.query.limit) || 200)
      .lean();
    res.json(list);
  } catch (e) { next(e); }
});

router.post('/receiving-logs', async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.receivedAt) body.receivedAt = new Date(body.receivedAt);
    if (body.temperatureC === '' || body.temperatureC === null) delete body.temperatureC;
    const log = await HaccpReceivingLog.create(body);
    res.status(201).json(await log.populate('receivedBy', 'name'));
  } catch (e) { next(e); }
});

router.delete('/receiving-logs/:id', async (req, res, next) => {
  try {
    await HaccpReceivingLog.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
