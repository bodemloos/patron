import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line,
} from 'recharts';
import { api, fmtEur } from '../api.js';
import Modal from '../components/Modal.jsx';

function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const RANGES = [
  { key: 'day',   label: 'Today' },
  { key: 'week',  label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'year',  label: 'This year' },
];

export default function Reports() {
  const [range, setRange] = useState('month');
  const [data, setData] = useState(null);
  const [topItems, setTopItems] = useState([]);

  useEffect(() => {
    Promise.all([api.pnl(range), api.topItems(range)]).then(([d, t]) => {
      setData(d);
      setTopItems(t);
    });
  }, [range]);

  const [zOpen, setZOpen] = useState(false);
  const [zData, setZData] = useState(null);
  const [zDate, setZDate] = useState(isoDate());
  const [exportFrom, setExportFrom] = useState(isoDate(new Date(Date.now() - 30 * 24 * 3600 * 1000)));
  const [exportTo, setExportTo] = useState(isoDate());

  async function openZ() {
    setZData(null);
    setZOpen(true);
    setZData(await api.zReport(zDate));
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Profit & Loss</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost text-xs" onClick={openZ}>Z-report</button>
          <a className="btn-ghost text-xs" href={api.exportOrdersCsvUrl(exportFrom, exportTo)} download>Export orders CSV</a>
          <a className="btn-ghost text-xs" href={api.exportShiftsCsvUrl(exportFrom, exportTo)} download>Export shifts CSV</a>
          <div className="flex bg-slate-100 dark:bg-surface-850 rounded-lg p-1 text-sm font-medium">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1 rounded-md transition ${range === r.key ? 'bg-white dark:bg-surface-900 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={zOpen}
        onClose={() => setZOpen(false)}
        title="Z-report"
        wide
        footer={<>
          <input type="date" className="input w-auto" value={zDate} onChange={(e) => setZDate(e.target.value)} />
          <button className="btn-ghost" onClick={openZ}>Reload</button>
          <button className="btn-primary" onClick={() => window.print()}>Print</button>
        </>}
      >
        {!zData && <div className="text-slate-400 dark:text-slate-500">Loading…</div>}
        {zData && (
          <div className="space-y-4 text-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(zData.date).toLocaleDateString()}</div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Orders" value={zData.orders} />
              <Stat label="Subtotal" value={fmtEur(zData.subtotal)} />
              <Stat label="Total" value={fmtEur(zData.total)} />
              <Stat label="VAT" value={fmtEur(zData.taxAmount)} />
              <Stat label="Tips" value={fmtEur(zData.tip)} />
              <Stat label="COGS" value={fmtEur(zData.cogs)} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">By payment method</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Stat label="Card" value={fmtEur(zData.paymentMethods.card)} />
                <Stat label="Cash" value={fmtEur(zData.paymentMethods.cash)} />
                <Stat label="Other" value={fmtEur(zData.paymentMethods.other)} />
              </div>
            </div>
            {zData.taxByRate?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">VAT breakdown</div>
                <table className="w-full text-xs">
                  <thead className="text-slate-500 dark:text-slate-400"><tr><th className="text-left">Rate</th><th className="text-right">Net</th><th className="text-right">VAT</th></tr></thead>
                  <tbody>
                    {zData.taxByRate.map((b) => (
                      <tr key={b.rate} className="border-t border-slate-100 dark:border-white/5"><td className="py-1 tabular-nums">{b.rate}%</td><td className="py-1 text-right tabular-nums">{fmtEur(b.net)}</td><td className="py-1 text-right tabular-nums">{fmtEur(b.tax)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {zData.tipsByWaiter?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Tips by waiter</div>
                <table className="w-full text-xs">
                  <thead className="text-slate-500 dark:text-slate-400"><tr><th className="text-left">Staff</th><th className="text-right">Tip</th></tr></thead>
                  <tbody>
                    {zData.tipsByWaiter.map((t) => (
                      <tr key={t.staff} className="border-t border-slate-100 dark:border-white/5"><td className="py-1">{t.staff}</td><td className="py-1 text-right tabular-nums">{fmtEur(t.tip)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <details className="card p-4">
        <summary className="cursor-pointer font-medium text-sm">CSV export range</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 max-w-md text-sm">
          <label>
            <span className="text-slate-600 dark:text-slate-300">From</span>
            <input type="date" className="input mt-1" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
          </label>
          <label>
            <span className="text-slate-600 dark:text-slate-300">To</span>
            <input type="date" className="input mt-1" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">The Export buttons above use this range.</p>
      </details>

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Revenue" value={fmtEur(data.totals.revenue)} tone="brand" />
            <Kpi label="Cost of goods" value={fmtEur(data.totals.cogs)} tone="amber" />
            <Kpi label="Payroll" value={fmtEur(data.totals.payroll)} tone="slate" />
            <Kpi label="Net profit" value={fmtEur(data.totals.profit)} tone={data.totals.profit >= 0 ? 'emerald' : 'red'} />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Revenue & profit · {data.bucket}</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{data.series.length} buckets · {data.totals.orders} paid orders</span>
            </div>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
                  <XAxis dataKey="key" tick={{ fontSize: 12, fill: '#a3a3a3' }} stroke="#3a3a3d" />
                  <YAxis tick={{ fontSize: 12, fill: '#a3a3a3' }} stroke="#3a3a3d" tickFormatter={(v) => `€${v}`} />
                  <Tooltip
                    formatter={(v) => fmtEur(v)}
                    contentStyle={{ background: '#1c1c1d', border: '1px solid #3a3a3d', borderRadius: 12, color: '#e5e5e5', boxShadow: '0 12px 32px -12px rgba(0, 0, 0, 0.55)' }}
                    labelStyle={{ color: '#d4d4d4' }}
                    itemStyle={{ color: '#e5e5e5' }}
                    cursor={{ fill: '#2c2c2e', opacity: 0.5 }}
                  />
                  <Legend wrapperStyle={{ color: '#d4d4d4' }} />
                  <Bar dataKey="revenue" stackId={undefined} fill="#f97316" name="Revenue" />
                  <Bar dataKey="cogs" fill="#fbbf24" name="COGS" />
                  <Bar dataKey="payroll" fill="#94a3b8" name="Payroll" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="font-semibold mb-2">Profit trend</h2>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={data.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
                    <XAxis dataKey="key" tick={{ fontSize: 12, fill: '#a3a3a3' }} stroke="#3a3a3d" />
                    <YAxis tick={{ fontSize: 12, fill: '#a3a3a3' }} stroke="#3a3a3d" tickFormatter={(v) => `€${v}`} />
                    <Tooltip
                      formatter={(v) => fmtEur(v)}
                      contentStyle={{ background: '#1c1c1d', border: '1px solid #3a3a3d', borderRadius: 12, color: '#e5e5e5', boxShadow: '0 12px 32px -12px rgba(0, 0, 0, 0.55)' }}
                      labelStyle={{ color: '#d4d4d4' }}
                      itemStyle={{ color: '#e5e5e5' }}
                      cursor={{ stroke: '#4d4d51' }}
                    />
                    <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="font-semibold mb-2">Top sellers</h2>
              <table className="w-full text-sm">
                <thead className="text-slate-500 dark:text-slate-400 text-left">
                  <tr>
                    <th className="py-1.5">Item</th>
                    <th className="py-1.5">Qty</th>
                    <th className="py-1.5">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((t) => (
                    <tr key={t.name} className="border-t border-slate-100 dark:border-white/5">
                      <td className="py-1.5 font-medium">{t.name}</td>
                      <td className="py-1.5">{t.qty}</td>
                      <td className="py-1.5">{fmtEur(t.revenue)}</td>
                    </tr>
                  ))}
                  {!topItems.length && (
                    <tr><td colSpan="3" className="py-4 text-slate-400 dark:text-slate-500 text-center">No data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 dark:bg-surface-950 rounded-lg p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Kpi({ label, value, tone = 'slate' }) {
  const tones = {
    brand:   'bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400',
    amber:   'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    slate:   'bg-slate-100 dark:bg-surface-850 text-slate-700 dark:text-slate-200',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    red:     'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
  };
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className={`mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>
        {tone === 'red' ? 'Loss' : tone === 'emerald' ? 'Profit' : ' '}
      </div>
    </div>
  );
}
