require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./config/db');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

app.use('/api/categories', require('./routes/categories'));
app.use('/api/items', require('./routes/items'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/tables', require('./routes/tables'));
// QR codes for table-side ordering — same /api/tables prefix so the
// URL reads naturally: /api/tables/:id/qr.png
app.use('/api/tables', require('./routes/qr'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/exports', require('./routes/exports'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/rsz', require('./routes/rsz'));
app.use('/api/haccp', require('./routes/haccp'));
app.use('/api/table-requests', require('./routes/tableRequests'));
app.use('/api/events', require('./routes/events'));
// Public booking endpoints — used by the embeddable widget on
// third-party websites and the QR table-side ordering page. CORS is
// allowed for any origin via app.use(cors) above.
app.use('/api/public', require('./routes/public'));

// Error handler
app.use((err, req, res, _next) => {
  console.error('[err]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

const PORT = process.env.PORT || 4000;
const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/patron';

connectDB(URI)
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
    // Reminder cron: stub email/SMS for now, swap in a real sender later.
    require('./lib/reminders').start();
  })
  .catch((err) => {
    console.error('[server] failed to start', err);
    process.exit(1);
  });
