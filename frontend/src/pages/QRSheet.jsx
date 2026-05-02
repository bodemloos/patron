import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

/**
 * Print-friendly sheet of all table QR codes.
 *
 * Lays the tables out in a 3-column grid sized for A4 portrait. The
 * @media print rules hide the surrounding nav and let the manager just
 * hit Cmd-P to send a complete set to the printer.
 */
export default function QRSheet() {
  const [tables, setTables] = useState([]);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [columns, setColumns] = useState(3);
  const [size, setSize] = useState(280);

  useEffect(() => { api.tables().then(setTables); }, []);

  const visible = useMemo(() => {
    return tables
      .filter((t) => zoneFilter === 'all' || (t.zone || 'indoor') === zoneFilter)
      .sort((a, b) => {
        if ((a.room || '') !== (b.room || '')) return (a.room || '').localeCompare(b.room || '');
        return (a.label || '').localeCompare(b.label || '', undefined, { numeric: true });
      });
  }, [tables, zoneFilter]);

  return (
    <div className="qr-sheet-root">
      <style>{`
        @media print {
          body { background: white !important; }
          .qr-sheet-controls, .qr-sheet-back, nav, header, aside { display: none !important; }
          .qr-sheet-root { padding: 0 !important; background: white !important; }
          .qr-sheet-grid { gap: 16px !important; }
          .qr-card { break-inside: avoid; background: white !important; box-shadow: none !important; border-color: #e5e5e5 !important; }
          .qr-card * { color: #111 !important; }
        }
      `}</style>

      <div className="p-3 sm:p-6 space-y-4">
        <div className="qr-sheet-controls flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">QR codes for printing</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {visible.length} of {tables.length} tables. Hit <kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-surface-950">⌘P</kbd> to print — the controls disappear automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/floor" className="btn-ghost text-xs qr-sheet-back">← Floor</Link>
            <select className="input w-auto text-sm" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
              <option value="all">All zones</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
            </select>
            <label className="text-xs flex items-center gap-2 text-slate-600 dark:text-slate-300">
              Cols
              <select className="input w-auto text-sm" value={columns} onChange={(e) => setColumns(Number(e.target.value))}>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>
            <label className="text-xs flex items-center gap-2 text-slate-600 dark:text-slate-300">
              Size
              <input type="range" min="160" max="400" step="20" value={size} onChange={(e) => setSize(Number(e.target.value))} />
            </label>
            <button className="btn-primary text-sm" onClick={() => window.print()}>Print</button>
          </div>
        </div>

        <div
          className="qr-sheet-grid grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {visible.map((t) => (
            <article
              key={t._id}
              className="qr-card card p-4 flex flex-col items-center text-center"
            >
              <div className="font-semibold text-lg">{t.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {t.room || 'Main'} · {t.seats} seat{t.seats === 1 ? '' : 's'} · {t.zone || 'indoor'}
              </div>
              <div className="bg-white rounded-xl p-2">
                <img
                  src={`/api/tables/${t._id}/qr.png?size=${size}`}
                  alt={`QR code for table ${t.label}`}
                  width={size}
                  height={size}
                  style={{ display: 'block', maxWidth: '100%' }}
                />
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Scan to order</div>
            </article>
          ))}
          {!visible.length && (
            <div className="col-span-full text-center text-slate-400 dark:text-slate-500 py-12">
              No tables match this filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
