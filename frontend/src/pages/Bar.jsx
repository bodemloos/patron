import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { subscribe } from '../lib/events.js';
import Ticket from '../components/Ticket.jsx';

// Drink-category heuristic — same wording the backend uses to set
// `course === 'drink'` on a line. Keeps the 86-list focused on items
// the bar actually pours.
const DRINK_CATEGORY_KEYWORDS = ['drink', 'coffee', 'tea', 'bar', 'wine', 'beer', 'cocktail'];

function isDrinkItem(i) {
  const n = (i.category?.name || '').toLowerCase();
  return DRINK_CATEGORY_KEYWORDS.some((k) => n.includes(k));
}

export default function Bar() {
  const [queue, setQueue] = useState([]);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showEightySix, setShowEightySix] = useState(false);

  async function load() {
    const [q, it] = await Promise.all([api.barQueue(), api.items()]);
    setQueue(q);
    setItems(it);
  }
  useEffect(() => {
    load();
    // Push refresh via SSE — same events the kitchen listens for.
    const off = subscribe(['order:updated', 'order:sent', 'order:paid', 'order:cancelled'], () => load());
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

  // Drink-only subset for the 86 list.
  const drinkItems = useMemo(() => items.filter(isDrinkItem), [items]);

  // Group queue by table.
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
          <h1 className="text-2xl font-semibold">Bar queue</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Live · {queue.length} drink{queue.length === 1 ? '' : 's'} in flight</p>
        </div>
        <button className="btn-ghost" onClick={() => setShowEightySix(!showEightySix)}>
          {showEightySix ? 'Hide 86 list' : '86 list'}
        </button>
      </div>

      {showEightySix && (
        <section className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold text-sm">86 the bar</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Toggle drinks off when you run out — they grey out on the POS instantly.</p>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">{drinkItems.filter((i) => i.available === false).length} currently 86'd</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {drinkItems.map((i) => (
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
            {!drinkItems.length && (
              <div className="col-span-full text-center text-slate-400 dark:text-slate-500 text-sm py-4">
                No drink-category items yet. Add a category whose name contains "drink", "coffee", "tea", "bar", "wine", "beer" or "cocktail" to populate this list.
              </div>
            )}
          </div>
        </section>
      )}

      {!queue.length && (
        <div className="card p-10 text-center text-slate-400 dark:text-slate-500">
          All caught up — no drinks waiting.
        </div>
      )}

      <div className="flex flex-wrap gap-5">
        {tableKeys.map((k) => (
          <Ticket
            key={k}
            table={k}
            items={tables[k]}
            mode="bar"
            onMarkReady={(orderId, lineId) => setStatus(orderId, lineId, 'ready')}
          />
        ))}
      </div>
    </div>
  );
}
