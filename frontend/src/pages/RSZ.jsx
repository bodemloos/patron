import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { api, fmtEur } from '../api.js';

const TYPE_LABELS = {
  dimona_in:  'Dimona — start',
  dimona_out: 'Dimona — end',
  hours_batch:'Hours batch (DmfA)',
};

export default function RSZ() {
  const [decls, setDecls] = useState([]);
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setDecls(await api.rszDeclarations());
  }
  useEffect(() => { load(); }, []);

  async function previewHours() {
    setPreview(null);
    setPreview(await api.rszHoursPreview(from, to));
  }
  async function submitHours() {
    if (!preview) return;
    if (!confirm(`Submit hours batch for ${preview.workers.length} workers (${preview.workers.reduce((a, w) => a + w.hours, 0).toFixed(1)}h) to RSZ?`)) return;
    setBusy(true);
    try {
      const r = await api.submitHoursBatch(from, to);
      alert(`Sent. RSZ confirmation: ${r.confirmationNumber}`);
      load();
      previewHours();
    } finally { setBusy(false); }
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">RSZ / ONSS</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Audit trail of every Dimona and hours-batch declaration. Production submission requires certified RSZ web-service credentials —
          for now the payloads are stored locally and a fake confirmation number is returned.
        </p>
      </div>

      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold">Submit working hours</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Aggregates clocked-in/out shifts per worker for the period below (basis for the quarterly DmfA).</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">From <input type="date" className="input ml-2 w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="text-xs text-slate-500 dark:text-slate-400">To <input type="date" className="input ml-2 w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            <button className="btn-ghost" onClick={previewHours}>Preview</button>
            <button className="btn-primary" disabled={!preview || busy} onClick={submitHours}>Submit to RSZ</button>
          </div>
        </div>

        {preview && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
                <tr>
                  <th className="px-3 py-2">Worker</th>
                  <th className="px-3 py-2">INSZ</th>
                  <th className="px-3 py-2">Shifts</th>
                  <th className="px-3 py-2 text-right">Hours</th>
                  <th className="px-3 py-2 text-right">Gross €</th>
                </tr>
              </thead>
              <tbody>
                {preview.workers.map((w) => (
                  <tr key={w.staffId} className="border-t border-slate-100 dark:border-white/5">
                    <td className="px-3 py-2 font-medium">{w.name}</td>
                    <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{w.niss || <span className="text-red-600 dark:text-red-400">missing</span>}</td>
                    <td className="px-3 py-2 tabular-nums">{w.shifts}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{w.hours.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtEur(w.gross)}</td>
                  </tr>
                ))}
                {!preview.workers.length && (
                  <tr><td colSpan="5" className="text-center py-6 text-slate-400 dark:text-slate-500">No clocked shifts in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Recent declarations</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">{decls.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
              <tr>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Confirmation</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {decls.map((d) => (
                <tr key={d._id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="px-4 py-2">{TYPE_LABELS[d.type] || d.type}</td>
                  <td className="px-4 py-2 text-sm">
                    {d.staff?.name || (d.payload?.Workers ? `${d.payload.Workers.length} workers` : '—')}
                    {d.contract?.statute && <div className="text-xs text-slate-500 dark:text-slate-400">{d.contract.statute}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {d.periodFrom ? dayjs(d.periodFrom).format('DD MMM') : ''}
                    {d.periodTo ? ` — ${dayjs(d.periodTo).format('DD MMM')}` : ''}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{d.confirmationNumber || '—'}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{d.submittedAt ? dayjs(d.submittedAt).format('DD MMM HH:mm') : '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <details>
                      <summary className="cursor-pointer text-xs text-brand-700 dark:text-brand-400">payload</summary>
                      <pre className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-white/5 text-[11px] text-left overflow-auto max-w-[400px]">{JSON.stringify(d.payload, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
              {!decls.length && (
                <tr><td colSpan="6" className="text-center py-10 text-slate-400 dark:text-slate-500">Nothing submitted yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
