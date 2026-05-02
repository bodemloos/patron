import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';

/**
 * Single-table QR code preview + download buttons.
 *
 * The image is served live from the backend so any future change to the
 * encoded URL or styling propagates without re-issuing print stock.
 */
export default function TableQRModal({ table, onClose }) {
  const [size, setSize] = useState(400);
  const [reloadKey, setReloadKey] = useState(0);
  // origin is read from the live document so the QR works in dev
  // (localhost:5173) and prod (your-domain) without a code edit.
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  if (!table) return null;
  const tableId = table._id;
  const customerUrl = origin ? `${origin}/order.html?table=${tableId}` : '';

  const pngSrc = `/api/tables/${tableId}/qr.png?size=${size}&_=${reloadKey}`;
  const pngDownload = `/api/tables/${tableId}/qr.png?size=${size * 2}&download=1`;
  const svgDownload = `/api/tables/${tableId}/qr.svg?size=${size}&download=1`;

  function copyUrl() {
    if (!customerUrl) return;
    navigator.clipboard?.writeText(customerUrl);
  }

  return (
    <Modal
      open={!!table}
      onClose={onClose}
      title={`QR code — Table ${table.label}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <a className="btn-ghost" href={svgDownload} download>Download SVG</a>
          <a className="btn-primary" href={pngDownload} download>Download PNG</a>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Print this and pin it to <span className="font-medium">{table.label}</span>{' '}
          ({table.room || 'Main'}, {table.seats} seats). Guests scan it to view the
          menu and send orders straight to the kitchen.
        </p>

        <div className="bg-white dark:bg-white rounded-2xl p-4 grid place-items-center">
          {/* The PNG is served by /api/tables/:id/qr.png. Force light bg
              behind the QR so the dark modules contrast even in dark mode. */}
          <img
            src={pngSrc}
            alt={`QR code for ${table.label}`}
            width={size}
            height={size}
            style={{ display: 'block', maxWidth: '100%' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Preview size
            <input
              type="range" min="200" max="800" step="50"
              value={size} onChange={(e) => setSize(Number(e.target.value))}
              className="w-full mt-1"
            />
          </label>
          <button className="btn-ghost text-xs" onClick={() => setReloadKey((k) => k + 1)}>
            ⟳ Refresh
          </button>
        </div>

        <div className="text-xs">
          <div className="uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Encoded URL</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate p-2 rounded bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-white/5">{customerUrl || '…'}</code>
            <button className="btn-ghost text-xs" onClick={copyUrl}>Copy</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
