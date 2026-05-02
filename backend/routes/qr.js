const router = require('express').Router();
const QRCode = require('qrcode');
const Table = require('../models/Table');

/**
 * QR codes for table-side ordering.
 *
 *   GET /api/tables/:id/qr.png?size=400&base=https://your-domain
 *   GET /api/tables/:id/qr.svg
 *
 * Defaults base to the request host so the QR Just Works on whatever
 * domain Patron is served from. The ?download=1 flag forces a
 * Content-Disposition: attachment so a click downloads instead of
 * previews inline.
 */

// Compute the URL the QR will encode. Override via ?base= for prod
// when serving from a different public domain than the API.
function targetUrlFor(req, tableId) {
  const explicit = req.query.base && String(req.query.base).trim();
  const base = explicit || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/order.html?table=${encodeURIComponent(tableId)}`;
}

function commonOptions(req) {
  const size = Math.max(96, Math.min(2000, Number(req.query.size) || 400));
  return {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#ffffff' },
  };
}

router.get('/:id/qr.png', async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id).lean();
    if (!table) return res.status(404).json({ error: 'Table not found' });
    const url = targetUrlFor(req, table._id);
    const buf = await QRCode.toBuffer(url, { ...commonOptions(req), type: 'png' });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    if (req.query.download) {
      res.set('Content-Disposition', `attachment; filename="qr-${slug(table.label)}.png"`);
    }
    res.send(buf);
  } catch (e) { next(e); }
});

router.get('/:id/qr.svg', async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id).lean();
    if (!table) return res.status(404).json({ error: 'Table not found' });
    const url = targetUrlFor(req, table._id);
    const svg = await QRCode.toString(url, { ...commonOptions(req), type: 'svg' });
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=300');
    if (req.query.download) {
      res.set('Content-Disposition', `attachment; filename="qr-${slug(table.label)}.svg"`);
    }
    res.send(svg);
  } catch (e) { next(e); }
});

function slug(s) {
  return String(s || 'table').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'table';
}

module.exports = router;
