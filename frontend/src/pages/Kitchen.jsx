import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { subscribe } from '../lib/events.js';
import Ticket from '../components/Ticket.jsx';
import { useT } from '../i18n/index.jsx';

export default function Kitchen() {
  const [queue, setQueue] = useState([]);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showEightySix, setShowEightySix] = useState(false);
  const { t } = useT();

  async function load() {
    const [q, it] = await Promise.all([api.kitchenQueue(), api.items()]);
    setQueue(q);
    setItems(it);
  }
  useEffect(() => {
    load();
    // Push-based refresh via SSE — no more 5s polling.
    const off = subscribe(['order:updated', 'order:sent', 'order:paid', 'order:cancelled', 'kitchen:ready'], () => load());
    return off;
  }, []);

  async function setStatus(orderId, lineId, status) {
    setBusy(true);
    try {
      await api.updateLine(orderId, lineId, { status });
      load();
    } finally { setBusy(false); }
  }

  async function toggleAvailable(item) {
    const updated = await api.saveItem({ ...item, available: !item.available, category: item.category?._id || item.category });
    setItems(items.map((i) => (i._id === updated._id ? { ...updated, category: item.category } : i)));
  }

  // Group queue by table — the Ticket component handles per-course
  // grouping internally.
  const tables = {};
  for (const q of queue) {
    const k = q.table || '—';
    tables[k] = tables[k] || [];
    tables[k].push(q);
  }
  const tableKeys = Object.keys(tables).sort();

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('kitchen.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t(queue.length === 1 ? 'kitchen.live.one' : 'kitchen.live.other', { n: queue.length })}
          </p>
        </div>
        <button
          className="btn-ghost"
          onClick={() => setShowEightySix(!showEightySix)}
        >
          {showEightySix ? t('kitchen.86.hide') : t('kitchen.86.show')}
        </button>
      </div>

      {showEightySix && (
        <section className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold text-sm">{t('kitchen.86.title')}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('kitchen.86.sub')}</p>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">{t('kitchen.86.count', { n: items.filter((i) => i.available === false).length })}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {items.map((i) => (
              <button
                key={i._id}
                onClick={() => toggleAvailable(i)}
                className={[
                  'text-left text-sm px-3 py-2 rounded-lg border transition',
                  i.available !== false
                    ? 'bg-white dark:bg-surface-900 border-slate-200 dark:border-white/5 hover:border-brand-500 dark:hover:border-brand-400'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 line-through',
                ].join(' ')}
              >
                <div className="font-medium truncate">{i.name}</div>
                <div className="text-[10px] uppercase tracking-wide opacity-70">{i.category?.name || ''}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {!queue.length && (
        <div className="card p-10 text-center text-slate-400 dark:text-slate-500">
          {t('kitchen.empty')}
        </div>
      )}

      <div className="flex flex-wrap gap-5">
        {tableKeys.map((k) => (
          <Ticket
            key={k}
            table={k}
            items={tables[k]}
            mode="kitchen"
            onMarkReady={(orderId, lineId) => setStatus(orderId, lineId, 'ready')}
          />
        ))}
      </div>
    </div>
  );
}
