const router = require('express').Router();
const Reservation = require('../models/Reservation');
const Order = require('../models/Order');
const Item = require('../models/Item');
const Category = require('../models/Category');
const Table = require('../models/Table');
const Settings = require('../models/Settings');
const Customer = require('../models/Customer');
const events = require('../lib/events');
const {
  OPENING_HOURS,
  SLOT_INTERVAL_MIN,
  DEFAULT_DURATION_MIN,
  buildSlotsForDate,
  findAvailableTable,
} = require('../lib/availability');

/**
 * Public-facing endpoints used by the embeddable booking widget.
 * No auth — these are intended to be called from a customer's browser
 * on a third-party website. CORS is wide open in server.js.
 *
 * Responses are intentionally minimal — they don't leak other customers'
 * names/contact info or per-table identity.
 */

// GET /api/public/reservations/availability?date=YYYY-MM-DD&partySize=N
router.get('/reservations/availability', async (req, res, next) => {
  try {
    const dateStr = req.query.date;
    const partySize = Math.max(1, Number(req.query.partySize) || 2);
    if (!dateStr) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    const result = await buildSlotsForDate(dateStr, partySize);
    res.json({
      date: dateStr,
      partySize,
      openingHours: result.openingHours,
      durationMinutes: result.durationMinutes,
      intervalMinutes: result.intervalMinutes,
      // Surface closure state so the widget can show a friendlier
      // empty-state ("Closed for staff training") instead of a generic
      // "Closed on this date." message.
      closed: result.closed,
      closureReason: result.closureReason,
      // Strip table counts to a boolean — public callers don't need a count.
      slots: (result.slots || []).map((s) => ({ time: s.time, startsAt: s.startsAt, available: s.available > 0 })),
    });
  } catch (e) { next(e); }
});

// POST /api/public/reservations
// Body: { name, email, phone, partySize, startsAt (ISO), notes }
// Response: { ok: true, reservation: { id, startsAt, partySize, status } }
router.post('/reservations', async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const partySize = Math.max(1, Number(body.partySize) || 2);
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (!name) return res.status(400).json({ error: 'Please enter a name.' });
    if (!startsAt || isNaN(startsAt.getTime())) {
      return res.status(400).json({ error: 'Please pick a valid time.' });
    }
    if (startsAt < new Date()) {
      return res.status(400).json({ error: 'Please pick a future time.' });
    }
    if (!body.email && !body.phone) {
      return res.status(400).json({ error: 'Please provide an email or phone so we can reach you.' });
    }

    const duration = DEFAULT_DURATION_MIN;
    const result = await findAvailableTable(startsAt, duration, partySize);
    if (result.closed) {
      return res.status(409).json({
        error: result.reason
          ? `Sorry, we're closed on that date — ${result.reason}.`
          : "Sorry, we're closed on that date.",
      });
    }
    if (!result.table) {
      return res.status(409).json({ error: 'Sorry, that time just got booked. Please pick another slot.' });
    }

    const reservation = await Reservation.create({
      name,
      email: String(body.email || '').trim(),
      phone: String(body.phone || '').trim(),
      partySize,
      startsAt,
      durationMinutes: duration,
      table: result.table._id,
      status: 'confirmed',
      notes: String(body.notes || '').slice(0, 500),
      source: 'widget',
    });

    // Auto-link customer record.
    const customer = await Customer.findOrCreate({
      name: reservation.name, email: reservation.email, phone: reservation.phone, notes: reservation.notes,
    });
    if (customer) {
      reservation.customer = customer._id;
      await reservation.save();
    }

    events.publish('reservation:created', { id: String(reservation._id) });
    res.status(201).json({
      ok: true,
      reservation: {
        id: reservation._id,
        startsAt: reservation.startsAt,
        partySize: reservation.partySize,
        status: reservation.status,
      },
    });
  } catch (e) { next(e); }
});

// ----------------------------------------------------------------------
// QR table-side ordering — a customer scans the QR pinned to their
// table, browses the menu, and places lines straight onto the table's
// open order. The waiter still finalises payment.
// ----------------------------------------------------------------------

// GET /api/public/menu/:tableId — table info + menu (categories + items),
// stripped of admin-only fields.
router.get('/menu/:tableId', async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.tableId).lean();
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const settings = await Settings.get();
    const [items, categories] = await Promise.all([
      Item.find({ available: { $ne: false } })
        .populate('category', 'name color sortOrder taxRate')
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
      Category.find().sort({ sortOrder: 1 }).lean(),
    ]);

    // Strip Mongoose internals from the customerMenu subdoc so it
    // serialises cleanly through to the customer's browser.
    const cm = (settings.customerMenu && settings.customerMenu.toObject?.()) || settings.customerMenu || {};

    res.json({
      restaurant: { name: settings.restaurantName, currency: settings.currency },
      style: {
        brandColor:    cm.brandColor || '',
        accentColor:   cm.accentColor || '',
        mode:          cm.mode || 'auto',
        tagline:       cm.tagline || '',
        coverImageUrl: cm.coverImageUrl || '',
        headingFont:   cm.headingFont || '',
        layout:        cm.layout || 'grid',
        theme:         cm.theme || '',
      },
      table: { id: String(table._id), label: table.label, seats: table.seats, room: table.room, zone: table.zone },
      categories: categories.map((c) => ({
        id: String(c._id),
        name: c.name,
        color: c.color,
        parent: c.parent ? String(c.parent) : null,
      })),
      items: items.map((i) => ({
        id: String(i._id),
        name: i.name,
        description: i.description,
        price: i.price,
        imageUrl: i.imageUrl || '',
        infoUrl: i.infoUrl || '',
        category: i.category ? { id: String(i.category._id), name: i.category.name, color: i.category.color } : null,
        sizes: (i.sizes || []).map((s) => ({ label: s.label, priceDelta: s.priceDelta })),
      })),
    });
  } catch (e) { next(e); }
});

// POST /api/public/menu/:tableId/order
// Body: { lines: [{ itemId, qty, sizeLabel, note }], customerName?, customerEmail?, customerPhone? }
// Adds lines to the table's open order (creating a new order if needed).
router.post('/menu/:tableId/order', async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.tableId);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const inputLines = Array.isArray(req.body.lines) ? req.body.lines : [];
    if (!inputLines.length) return res.status(400).json({ error: 'No items in order.' });

    // Find or create an open order for this table.
    let order = await Order.findOne({ table: table._id, status: { $in: ['open', 'sent'] } });
    if (!order) {
      order = await Order.create({ table: table._id, status: 'open', source: 'qr' });
    }

    const settings = await Settings.get();
    for (const ln of inputLines) {
      const item = await Item.findById(ln.itemId)
        .populate({ path: 'category', populate: { path: 'parent' } });
      if (!item || item.available === false) continue;
      const sizeMod = item.sizes?.find((s) => s.label === ln.sizeLabel);
      const modifiers = sizeMod ? [{ label: `Size: ${sizeMod.label}`, priceDelta: Number(sizeMod.priceDelta) || 0 }] : [];
      const modDelta = modifiers.reduce((s, m) => s + m.priceDelta, 0);
      const finalPrice = (item.price || 0) + modDelta;
      const taxRate = (item.category?.taxRate >= 0 ? item.category.taxRate : settings.defaultTaxRate);
      order.lines.push({
        item: item._id,
        name: item.name,
        basePrice: item.price,
        price: finalPrice,
        qty: Math.max(1, Number(ln.qty) || 1),
        modifiers,
        note: String(ln.note || '').slice(0, 280),
        course: courseHeuristic(item.category),
        taxRate,
        status: 'pending',
      });
    }
    order.recomputeSubtotal();

    // Optional customer auto-link.
    if (req.body.customerEmail || req.body.customerPhone) {
      const c = await Customer.findOrCreate({
        name: req.body.customerName || 'Guest',
        email: req.body.customerEmail,
        phone: req.body.customerPhone,
      });
      if (c) order.customer = c._id;
    }

    await order.save();
    events.publish('order:updated', { orderId: String(order._id), tableId: String(table._id), source: 'qr' });

    res.status(201).json({
      ok: true,
      orderId: String(order._id),
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      total: order.total,
      lines: order.lines.length,
    });
  } catch (e) { next(e); }
});

// Routes a line to the kitchen vs the bar based on its top-level
// parent category. Anything under "Drinks" → bar; everything else
// (Food and orphan top-levels) → kitchen, with a finer-grained
// classification ("starter"/"main"/"dessert") so the kitchen ticket
// can sort sensibly. Keep this in sync with backend/routes/orders.js.
// ----------------------------------------------------------------------
// GET /api/public/unfurl?url=…
// Server-side metadata fetcher used by /order.html when the customer
// taps the info icon on a menu item. Most sites refuse to be embedded
// in an iframe (X-Frame-Options / CSP frame-ancestors) which is why we
// fetch them here and surface OpenGraph / Twitter / JSON-LD data the
// frontend can render natively. Result is normalised to:
//   { ok, url, host, title, description, image, siteName, rating?, ratingCount?, type? }
// ----------------------------------------------------------------------

const UNFURL_CACHE = new Map();          // url → { t, data }
const UNFURL_TTL_MS = 60 * 60 * 1000;    // 1 hour
const UNFURL_FETCH_TIMEOUT_MS = 10000;   // 10s

function decodeHTMLEntities(s) {
  if (!s) return '';
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

// Walk every <meta …> in the document and bucket by name/property.
// Robust to attribute ordering (`property` before `content` and vice
// versa), and quote style. We only care about a small set of keys so
// keep parsing cheap.
function parseMetaTags(html) {
  const meta = {};
  const tagRe = /<meta\b([^>]+?)\/?>/gi;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const attrs = m[1];
    const propMatch =
      attrs.match(/\s(?:property|name|itemprop)\s*=\s*"([^"]+)"/i) ||
      attrs.match(/\s(?:property|name|itemprop)\s*=\s*'([^']+)'/i);
    const contentMatch =
      attrs.match(/\scontent\s*=\s*"([^"]*)"/i) ||
      attrs.match(/\scontent\s*=\s*'([^']*)'/i);
    if (propMatch && contentMatch) {
      const key = propMatch[1].toLowerCase();
      if (!meta[key]) meta[key] = decodeHTMLEntities(contentMatch[1]);
    }
  }
  return meta;
}

// Parse every <script type="application/ld+json"> block. Untappd,
// supermarket sites, recipe blogs and similar embed structured data
// here — useful for ratings / brewery / ABV when the OG tags are sparse.
function parseJsonLd(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch (e) { /* malformed JSON-LD — ignore */ }
  }
  return out;
}

function pickRating(jsonLd) {
  // Walk @graph too, since some pages nest objects.
  const queue = [...jsonLd];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node['@graph'])) queue.push(...node['@graph']);
    const agg = node.aggregateRating || node.AggregateRating;
    if (agg && agg.ratingValue) {
      return {
        value: Number(agg.ratingValue) || null,
        count: Number(agg.reviewCount || agg.ratingCount) || null,
        best:  Number(agg.bestRating) || 5,
      };
    }
  }
  return null;
}

router.get('/unfurl', async (req, res, next) => {
  try {
    const target = req.query.url;
    if (!target) return res.status(400).json({ error: 'url required' });

    // Validate + normalise. Reject anything that isn't http(s) so a
    // creative caller can't ask us to fetch file:// or internal hosts
    // (still, this is a public endpoint — keep your network locked
    // down at the deployment level for stricter SSRF protection).
    let parsed;
    try {
      parsed = new URL(target);
    } catch (e) { return res.status(400).json({ error: 'invalid url' }); }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'only http(s) urls are allowed' });
    }
    const canonical = parsed.toString();

    // Cache hit — return immediately.
    const hit = UNFURL_CACHE.get(canonical);
    if (hit && Date.now() - hit.t < UNFURL_TTL_MS) {
      return res.json(hit.data);
    }

    // Real-browser-ish UA so sites don't serve the bot variant.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UNFURL_FETCH_TIMEOUT_MS);
    let upstream;
    try {
      upstream = await fetch(canonical, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PatronUnfurl/1.0; +https://patron.cafe)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!upstream.ok) {
      return res.status(502).json({
        ok: false, error: 'upstream error', status: upstream.status, url: canonical,
      });
    }

    // Cap the body — anything over 1.5 MB is not a typical product page
    // and parsing it costs more than it's worth.
    const buf = Buffer.from(await upstream.arrayBuffer());
    const html = buf.slice(0, 1_500_000).toString('utf8');

    const meta = parseMetaTags(html);
    const jsonLd = parseJsonLd(html);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const documentTitle = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : '';
    const rating = pickRating(jsonLd);

    // Normalise the image URL — many sites use protocol-relative or
    // root-relative paths in og:image. Resolve against the page URL.
    function abs(u) {
      if (!u) return '';
      try { return new URL(u, canonical).toString(); } catch (e) { return u; }
    }

    const data = {
      ok: true,
      url: meta['og:url'] || canonical,
      host: parsed.host,
      title:
        meta['og:title'] ||
        meta['twitter:title'] ||
        documentTitle ||
        parsed.host,
      description:
        meta['og:description'] ||
        meta['twitter:description'] ||
        meta['description'] ||
        '',
      image: abs(meta['og:image'] || meta['twitter:image'] || ''),
      siteName: meta['og:site_name'] || '',
      type: meta['og:type'] || '',
      rating: rating ? rating.value : null,
      ratingBest: rating ? rating.best : null,
      ratingCount: rating ? rating.count : null,
    };

    UNFURL_CACHE.set(canonical, { t: Date.now(), data });
    // Soft cap on the cache — drop the oldest 100 entries when we
    // cross 500 to keep memory bounded on long-running deployments.
    if (UNFURL_CACHE.size > 500) {
      const keys = [...UNFURL_CACHE.keys()].slice(0, 100);
      keys.forEach((k) => UNFURL_CACHE.delete(k));
    }
    res.json(data);
  } catch (e) {
    if (e && e.name === 'AbortError') {
      return res.status(504).json({ ok: false, error: 'upstream timeout' });
    }
    next(e);
  }
});

function courseHeuristic(cat) {
  if (!cat) return 'other';
  const top = cat.parent && cat.parent.name ? cat.parent : cat;
  const topName = (top.name || '').toLowerCase();
  if (topName.includes('drink')) return 'drink';

  const leaf = (cat.name || '').toLowerCase();
  if (leaf.includes('starter') || leaf.includes('appetizer')) return 'starter';
  if (leaf.includes('dessert') || leaf.includes('desert')) return 'dessert';
  if (leaf.includes('main')) return 'main';
  if (
    leaf.includes('coffee') || leaf.includes('tea') ||
    leaf.includes('bar')    || leaf.includes('beer') ||
    leaf.includes('wine')   || leaf.includes('cocktail')
  ) return 'drink';
  return 'other';
}

module.exports = router;
