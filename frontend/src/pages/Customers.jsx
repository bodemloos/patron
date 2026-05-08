import { useEffect, useState } from 'react';
import { api, fmtEur } from '../api.js';
import { useT } from '../i18n/index.jsx';

export default function Customers() {
  const { t } = useT();
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  async function load() {
    setList(await api.customers(q));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  async function open(c) {
    setSelected(c);
    setDetail(null);
    setDetail(await api.customer(c._id));
  }
  async function toggleVip(c) {
    const updated = await api.saveCustomer({ _id: c._id, vip: !c.vip });
    setList(list.map((x) => (x._id === updated._id ? updated : x)));
    if (selected && selected._id === updated._id) setSelected(updated);
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{t('customers.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('customers.sub')}
          </p>
        </div>
        <input
          className="input w-auto"
          placeholder={t('customers.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
        <section className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
              <tr>
                <th className="px-4 py-2">{t('customers.col.name')}</th>
                <th className="px-4 py-2">{t('customers.col.contact')}</th>
                <th className="px-4 py-2">{t('customers.col.visits')}</th>
                <th className="px-4 py-2">{t('customers.col.spend')}</th>
                <th className="px-4 py-2">{t('customers.col.lastVisit')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id} className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-surface-850 cursor-pointer" onClick={() => open(c)}>
                  <td className="px-4 py-2 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {c.name}
                      {c.vip && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400 font-medium">VIP</span>}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                    {c.email && <div className="truncate max-w-[180px]">{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{c.visits || 0}</td>
                  <td className="px-4 py-2 tabular-nums">{fmtEur(c.lifetimeSpend || 0)}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                    {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      className="text-xs text-brand-700 dark:text-brand-400 hover:underline"
                      onClick={(e) => { e.stopPropagation(); toggleVip(c); }}
                    >
                      {c.vip ? t('customers.unmarkVip') : t('customers.markVip')}
                    </button>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr><td colSpan="6" className="text-center py-10 text-slate-400 dark:text-slate-500">{t('customers.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <aside className="card p-4 h-fit">
          {!selected && <div className="text-sm text-slate-400 dark:text-slate-500">{t('customers.pickHint')}</div>}
          {selected && (
            <div className="space-y-3">
              <div>
                <div className="font-medium text-base">{selected.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {[selected.email, selected.phone].filter(Boolean).join(' · ') || t('customers.noContact')}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Visits" value={selected.visits || 0} />
                <Stat label="Spend"  value={fmtEur(selected.lifetimeSpend || 0)} />
                <Stat label="Last"   value={selected.lastVisitAt ? new Date(selected.lastVisitAt).toLocaleDateString() : '—'} />
              </div>
              {detail?.reservations?.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Reservations</div>
                  <ul className="space-y-1 text-xs">
                    {detail.reservations.map((r) => (
                      <li key={r._id} className="flex justify-between">
                        <span>{new Date(r.startsAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} · {r.partySize} pax</span>
                        <span className="capitalize text-slate-500 dark:text-slate-400">{r.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detail?.orders?.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Recent paid orders</div>
                  <ul className="space-y-1 text-xs">
                    {detail.orders.map((o) => (
                      <li key={o._id} className="flex justify-between">
                        <span>{new Date(o.paidAt).toLocaleDateString()} · {o.table?.label || '—'}</span>
                        <span className="font-medium">{fmtEur(o.total || o.subtotal || 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selected && (
                <textarea
                  className="input"
                  rows="2"
                  placeholder={t('customers.notesPh')}
                  value={selected.notes || ''}
                  onBlur={async (e) => {
                    if ((e.target.value || '') === (selected.notes || '')) return;
                    const updated = await api.saveCustomer({ _id: selected._id, notes: e.target.value });
                    setSelected(updated);
                    setList(list.map((x) => (x._id === updated._id ? updated : x)));
                  }}
                  onChange={(e) => setSelected({ ...selected, notes: e.target.value })}
                />
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 dark:bg-surface-950 rounded-lg p-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}
