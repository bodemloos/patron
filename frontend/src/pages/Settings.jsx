import { useEffect, useState } from 'react';
import { api } from '../api.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Settings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => { api.settings().then(setS); }, []);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.saveSettings(s);
      setS(updated);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  if (!s) return <div className="p-6 text-slate-400 dark:text-slate-500">Loading…</div>;

  function patch(p) { setS({ ...s, ...p }); }
  function patchHours(idx, p) {
    const next = (s.openingHours || []).map((d, i) => (i === idx ? { ...d, ...p } : d));
    setS({ ...s, openingHours: next });
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Restaurant-wide configuration. Reservations, taxes, tips and reminders all read from here.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-slate-500 dark:text-slate-400">Saved {savedAt.toLocaleTimeString()}</span>}
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Branding</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="block col-span-2">
            <span className="text-slate-600 dark:text-slate-300">Restaurant name</span>
            <input className="input mt-1" value={s.restaurantName} onChange={(e) => patch({ restaurantName: e.target.value })} />
          </label>
          <label>
            <span className="text-slate-600 dark:text-slate-300">Currency</span>
            <input className="input mt-1" value={s.currency} onChange={(e) => patch({ currency: e.target.value.toUpperCase() })} />
          </label>
          <label>
            <span className="text-slate-600 dark:text-slate-300">Timezone (IANA)</span>
            <input className="input mt-1" value={s.timezone} onChange={(e) => patch({ timezone: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Opening hours</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Used by the reservation availability and the booking widget.</p>
        <div className="space-y-2">
          {(s.openingHours || []).map((d, i) => (
            <div key={i} className="grid grid-cols-[60px_auto_1fr_1fr] gap-3 items-center text-sm">
              <span className="font-medium">{DAYS[i]}</span>
              <label className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={!d.closed} onChange={(e) => patchHours(i, { closed: !e.target.checked })} />
                Open
              </label>
              <input type="time" disabled={d.closed} className="input" value={d.open} onChange={(e) => patchHours(i, { open: e.target.value })} />
              <input type="time" disabled={d.closed} className="input" value={d.close} onChange={(e) => patchHours(i, { close: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
          <label>
            <span className="text-slate-600 dark:text-slate-300">Slot interval (min)</span>
            <input type="number" className="input mt-1" min="5" step="5" value={s.reservationSlotMinutes} onChange={(e) => patch({ reservationSlotMinutes: Number(e.target.value) })} />
          </label>
          <label>
            <span className="text-slate-600 dark:text-slate-300">Default duration (min)</span>
            <input type="number" className="input mt-1" min="15" step="15" value={s.reservationDurationMinutes} onChange={(e) => patch({ reservationDurationMinutes: Number(e.target.value) })} />
          </label>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Tax & tipping</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label>
            <span className="text-slate-600 dark:text-slate-300">Default tax rate (%)</span>
            <input type="number" step="0.5" className="input mt-1" value={s.defaultTaxRate} onChange={(e) => patch({ defaultTaxRate: Number(e.target.value) })} />
            <span className="text-xs text-slate-500 dark:text-slate-400">Applied when a category doesn't define its own.</span>
          </label>
          <label className="inline-flex items-center gap-2 mt-6">
            <input type="checkbox" checked={!!s.tipsEnabled} onChange={(e) => patch({ tipsEnabled: e.target.checked })} />
            <span>Show tip prompt at payment</span>
          </label>
          <label className="col-span-2">
            <span className="text-slate-600 dark:text-slate-300">Tip suggestions (% — comma-separated)</span>
            <input className="input mt-1" value={(s.tipSuggestions || []).join(', ')} onChange={(e) => patch({
              tipSuggestions: e.target.value.split(',').map((v) => Number(v.trim())).filter((n) => !isNaN(n))
            })} />
          </label>
        </div>
      </section>

      <ClosuresSection
        closures={s.closures || []}
        onChange={(closures) => patch({ closures })}
      />

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Reservation reminders</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={!!s.reservationRemindersEnabled} onChange={(e) => patch({ reservationRemindersEnabled: e.target.checked })} />
            <span>Send reminder before the reservation</span>
          </label>
          <label>
            <span className="text-slate-600 dark:text-slate-300">Hours ahead</span>
            <input type="number" className="input mt-1" min="1" max="72" value={s.reservationReminderHoursAhead} onChange={(e) => patch({ reservationReminderHoursAhead: Number(e.target.value) })} />
          </label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Currently logs to the server console. Wire a transactional sender (Resend, Postmark, Twilio) inside <code>backend/lib/reminders.js</code> to deliver real emails / SMS.
        </p>
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------
// Exceptional closures — holidays, vacations, private events. The
// reservation widget refuses to offer slots whose date falls inside
// any of these periods.
// ----------------------------------------------------------------------
function ClosuresSection({ closures, onChange }) {
  function isoDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toISOString().slice(0, 10);
  }

  function add() {
    const today = new Date().toISOString().slice(0, 10);
    onChange([...(closures || []), { from: today, to: today, reason: '' }]);
  }
  function update(idx, patch) {
    onChange(closures.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function remove(idx) {
    onChange(closures.filter((_, i) => i !== idx));
  }

  // Sort upcoming first when displaying so what's relevant is at the top.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sorted = [...(closures || [])]
    .map((c, originalIdx) => ({ ...c, originalIdx }))
    .sort((a, b) => new Date(a.from) - new Date(b.from));

  return (
    <section className="card p-5 space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold">Exceptional closures</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Holidays, vacations, private events. The booking widget hides every time slot
            whose date falls between <code>from</code> and <code>to</code> (inclusive) and
            shows the reason if you provide one.
          </p>
        </div>
        <button className="btn-ghost text-xs" onClick={add}>+ Add closure</button>
      </div>

      {!sorted.length && (
        <div className="text-xs text-slate-400 dark:text-slate-500 py-2">
          None set — the restaurant follows the regular weekly opening hours above.
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((c) => {
          const past = new Date(c.to) < today;
          return (
            <div
              key={c.originalIdx}
              className={[
                'grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-center text-sm p-2 rounded-lg',
                past ? 'opacity-50' : '',
                'bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-white/5',
              ].join(' ')}
            >
              <input
                type="date"
                className="input"
                value={isoDate(c.from)}
                onChange={(e) => update(c.originalIdx, { from: e.target.value })}
              />
              <input
                type="date"
                className="input"
                value={isoDate(c.to)}
                onChange={(e) => update(c.originalIdx, { to: e.target.value })}
              />
              <input
                className="input"
                placeholder="Reason (e.g. Christmas, staff training, private event)"
                value={c.reason || ''}
                onChange={(e) => update(c.originalIdx, { reason: e.target.value })}
              />
              <button
                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-lg px-2"
                onClick={() => remove(c.originalIdx)}
                title="Delete closure"
              >×</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
