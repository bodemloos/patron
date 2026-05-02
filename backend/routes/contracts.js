const router = require('express').Router();
const Contract = require('../models/Contract');
const Staff = require('../models/Staff');
const RSZDeclaration = require('../models/RSZDeclaration');
const Settings = require('../models/Settings');
const events = require('../lib/events');
const { renderContractHTML } = require('../lib/contract-document');

// ----------------------------------------------------------------------
// CRUD
// ----------------------------------------------------------------------

router.get('/', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.staff) q.staff = req.query.staff;
    if (req.query.status) q.status = req.query.status;
    if (req.query.statute) q.statute = req.query.statute;
    const list = await Contract.find(q)
      .populate('staff', 'name role email phone nissNumber')
      .sort({ startDate: -1 })
      .lean({ virtuals: true });
    res.json(list);
  } catch (e) { next(e); }
});

router.get('/statutes', (req, res) => {
  res.json(Contract.STATUTES);
});

router.get('/:id', async (req, res, next) => {
  try {
    const c = await Contract.findById(req.params.id).populate('staff').lean({ virtuals: true });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const c = await Contract.create({
      staff: req.body.staff,
      statute: req.body.statute,
      jobTitle: req.body.jobTitle,
      workplace: req.body.workplace,
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      hoursPerWeek: Number(req.body.hoursPerWeek) || 38,
      hourlyRate: Number(req.body.hourlyRate) || 0,
      monthlySalary: Number(req.body.monthlySalary) || 0,
      extraTerms: req.body.extraTerms || '',
      status: 'draft',
    });
    events.publish('contract:updated', { id: String(c._id) });
    const populated = await Contract.findById(c._id).populate('staff').lean({ virtuals: true });
    res.status(201).json(populated);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = [
      'statute', 'jobTitle', 'workplace', 'startDate', 'endDate',
      'hoursPerWeek', 'hourlyRate', 'monthlySalary', 'extraTerms', 'status',
      'terminatedAt', 'terminationReason',
    ];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    if (update.startDate) update.startDate = new Date(update.startDate);
    if (update.endDate) update.endDate = new Date(update.endDate);
    if (update.terminatedAt) update.terminatedAt = new Date(update.terminatedAt);

    const c = await Contract.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('staff').lean({ virtuals: true });
    if (!c) return res.status(404).json({ error: 'Not found' });
    events.publish('contract:updated', { id: String(c._id) });
    res.json(c);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Contract.findByIdAndDelete(req.params.id);
    events.publish('contract:updated', { id: String(req.params.id) });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ----------------------------------------------------------------------
// Sign
// ----------------------------------------------------------------------
router.post('/:id/sign', async (req, res, next) => {
  try {
    const c = await Contract.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    c.signedAt = new Date();
    c.signedByStaffName = req.body.signedByStaffName || '';
    c.signedByEmployerName = req.body.signedByEmployerName || '';
    c.status = 'signed';
    await c.save();
    events.publish('contract:updated', { id: String(c._id) });
    const populated = await Contract.findById(c._id).populate('staff').lean({ virtuals: true });
    res.json(populated);
  } catch (e) { next(e); }
});

// ----------------------------------------------------------------------
// Generated document — printable HTML
// ----------------------------------------------------------------------
router.get('/:id/document.html', async (req, res, next) => {
  try {
    const c = await Contract.findById(req.params.id).populate('staff');
    if (!c) return res.status(404).send('Not found');
    const staff = c.staff;
    if (!staff) return res.status(409).send('Contract has no staff member.');
    const settings = await Settings.get();
    const html = renderContractHTML({
      contract: c.toObject({ virtuals: true }),
      staff: {
        ...staff.toObject(),
        formattedNiss: () => staff.formattedNiss?.() || staff.nissNumber || '',
      },
      restaurantName: settings.restaurantName || 'Patron',
    });
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { next(e); }
});

// ----------------------------------------------------------------------
// Submit a Dimona to RSZ — STUB.
//
// Real DIMONA integration goes through the RSZ's certified web service
// (XML/SOAP) with employer credentials. This endpoint generates the
// payload that would be sent and stores an RSZDeclaration record so
// the manager has an audit trail. A fake confirmation number is
// returned. Swap the body of `submitToRSZ` for a real client when the
// production RSZ creds are available.
// ----------------------------------------------------------------------
router.post('/:id/dimona', async (req, res, next) => {
  try {
    const c = await Contract.findById(req.params.id).populate('staff');
    if (!c) return res.status(404).json({ error: 'Not found' });
    const staff = c.staff;
    if (!staff) return res.status(409).json({ error: 'Contract has no staff' });
    if (!staff.nissNumber) {
      return res.status(409).json({ error: 'Staff is missing a national INSZ number — cannot submit Dimona.' });
    }

    const direction = (req.body.direction === 'out') ? 'dimona_out' : 'dimona_in';
    const payload = buildDimonaPayload(c, staff, direction);
    const dec = await RSZDeclaration.create({
      type: direction,
      staff: staff._id,
      contract: c._id,
      periodFrom: c.startDate,
      periodTo: c.endDate,
      payload,
      status: 'submitted',
      confirmationNumber: fakeConfirmation(direction),
      submittedAt: new Date(),
    });

    // Move the contract's lifecycle along when sending an in/out.
    if (direction === 'dimona_in' && c.status !== 'active') {
      c.status = 'active';
      await c.save();
    }
    if (direction === 'dimona_out') {
      c.status = 'terminated';
      c.terminatedAt = c.terminatedAt || new Date();
      await c.save();
    }
    events.publish('contract:updated', { id: String(c._id) });
    events.publish('rsz:declaration', { id: String(dec._id) });

    res.status(201).json(dec);
  } catch (e) { next(e); }
});

function buildDimonaPayload(contract, staff, type) {
  // Mirrors the conceptual shape of a DIMONA declaration — not the
  // exact SOAP envelope, but enough to be visible in the RSZ dashboard.
  const dimonaType = {
    permanent: 'OTH',
    fixed_term: 'OTH',
    flexi_job: 'FLX',
    student: 'STU',
    extra: 'EXT',
    interim: 'A17',
    internship: 'TRI',
  }[contract.statute] || 'OTH';
  return {
    DimonaType: dimonaType,
    Direction: type === 'dimona_out' ? 'OUT' : 'IN',
    Worker: {
      INSZ: (staff.nissNumber || '').replace(/\D/g, ''),
      LastName: lastName(staff.name),
      FirstName: firstName(staff.name),
      DateOfBirth: staff.dateOfBirth ? toISODate(staff.dateOfBirth) : null,
    },
    Employment: {
      ContractRef: String(contract._id),
      JointCommittee: '302', // PC 302 horeca
      JobTitle: contract.jobTitle || '',
      StartDate: toISODate(contract.startDate),
      EndDate: contract.endDate ? toISODate(contract.endDate) : null,
      HoursPerWeek: contract.hoursPerWeek,
    },
  };
}

function fakeConfirmation(type) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${type === 'dimona_out' ? 'DMO' : 'DMI'}-${stamp}-${rand}`;
}

function toISODate(d) { return new Date(d).toISOString().slice(0, 10); }
function firstName(n) { return (n || '').trim().split(/\s+/)[0] || ''; }
function lastName(n) {
  const parts = (n || '').trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

module.exports = router;
