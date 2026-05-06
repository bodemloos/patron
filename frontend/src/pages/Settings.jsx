import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useT, SUPPORTED_LANGS } from '../i18n/index.jsx';
import { LANG_LABELS } from '../i18n/messages.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Human-readable language names — kept here rather than in the
// translation tables so the picker always shows the *target* language
// in its own tongue ("Nederlands", not "Dutch") regardless of which
// language is currently active.
const LANG_NATIVE_NAMES = {
  nl: 'Nederlands',
  fr: 'Français',
  en: 'English',
};

export default function Settings() {
  const { t } = useT();
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

  // useT is already imported at the top for LanguageSection.
  if (!s) return <div className="p-6 text-slate-400 dark:text-slate-500">…</div>;

  function patch(p) { setS({ ...s, ...p }); }
  function patchHours(idx, p) {
    const next = (s.openingHours || []).map((d, i) => (i === idx ? { ...d, ...p } : d));
    setS({ ...s, openingHours: next });
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{t('settings.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('settings.sub')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-slate-500 dark:text-slate-400">{t('settings.savedAt', { time: savedAt.toLocaleTimeString() })}</span>}
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? t('settings.saving') : t('common.save')}</button>
        </div>
      </div>

      <LanguageSection />

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">{t('settings.branding')}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="block col-span-2">
            <span className="text-slate-600 dark:text-slate-300">{t('settings.field.restaurantName')}</span>
            <input className="input mt-1" value={s.restaurantName} onChange={(e) => patch({ restaurantName: e.target.value })} />
          </label>
          <label>
            <span className="text-slate-600 dark:text-slate-300">{t('settings.field.currency')}</span>
            <input className="input mt-1" value={s.currency} onChange={(e) => patch({ currency: e.target.value.toUpperCase() })} />
          </label>
          <label>
            <span className="text-slate-600 dark:text-slate-300">{t('settings.field.timezone')}</span>
            <input className="input mt-1" value={s.timezone} onChange={(e) => patch({ timezone: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">{t('settings.openingHours')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.openingHours.sub')}</p>
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
        <h2 className="font-semibold">{t('settings.tax')}</h2>
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

      <CustomerMenuSection
        value={s.customerMenu || {}}
        onChange={(customerMenu) => patch({ customerMenu })}
      />

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">{t('settings.reminders')}</h2>
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
// ----------------------------------------------------------------------
// Customer menu styling — controls the look of /order.html. The fields
// land on Settings.customerMenu and the public menu endpoint forwards
// them to the customer's browser, where order.html applies CSS-var
// overrides + an optional Google Font + cover/tagline.
// ----------------------------------------------------------------------
// Pre-tuned bundles a manager can pick in one click. Each one snap-fills
// the individual fields below so manual tweaks afterwards aren't blocked.
const MENU_THEMES = [
  { id: 'patron',    name: 'Patron',    desc: 'Brand orange, dark.',     brandColor: '#ea580c', accentColor: '#fb923c', mode: 'dark',  headingFont: '' },
  { id: 'bistro',    name: 'Bistro',    desc: 'Warm browns, light.',     brandColor: '#92400e', accentColor: '#d97706', mode: 'light', headingFont: 'Playfair Display' },
  { id: 'minimal',   name: 'Minimal',   desc: 'Pure black, light.',      brandColor: '#0f172a', accentColor: '#475569', mode: 'light', headingFont: '' },
  { id: 'coastal',   name: 'Coastal',   desc: 'Soft blue, light.',       brandColor: '#0ea5e9', accentColor: '#38bdf8', mode: 'light', headingFont: 'Lora' },
  { id: 'brasserie', name: 'Brasserie', desc: 'Deep red, dark.',         brandColor: '#9f1239', accentColor: '#e11d48', mode: 'dark',  headingFont: 'Cormorant Garamond' },
  { id: 'forest',    name: 'Forest',    desc: 'Deep green, dark.',       brandColor: '#15803d', accentColor: '#22c55e', mode: 'dark',  headingFont: 'EB Garamond' },
  { id: 'midnight',  name: 'Midnight',  desc: 'Cool indigo, dark.',      brandColor: '#6366f1', accentColor: '#a5b4fc', mode: 'dark',  headingFont: 'Manrope' },
  { id: 'sand',      name: 'Sand',      desc: 'Warm cream, light.',      brandColor: '#a16207', accentColor: '#eab308', mode: 'light', headingFont: 'DM Serif Display' },
];

const MENU_LAYOUTS = [
  { id: 'magazine', name: 'Magazine', desc: 'Rows with product photos' },
  { id: 'grid',     name: 'Grid',     desc: '2-3 column cards' },
  { id: 'list',     name: 'List',     desc: 'Single column, no imagery' },
  { id: 'compact',  name: 'Compact',  desc: 'Dense printed-menu rows' },
];

function CustomerMenuSection({ value, onChange }) {
  const { t } = useT();
  const cm = {
    brandColor: '#ea580c',
    accentColor: '',
    mode: 'auto',
    tagline: '',
    coverImageUrl: '',
    headingFont: '',
    layout: 'magazine',
    theme: 'patron',
    ...value,
  };
  function patch(p) { onChange({ ...cm, ...p }); }

  // Grab the first available table id so the Preview link can land on
  // a real menu (the public endpoint expects an ObjectId, not a slug).
  const [previewTableId, setPreviewTableId] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api.tables()
      .then((tables) => {
        if (cancelled) return;
        const t = (tables || []).find((x) => x && x._id);
        if (t) setPreviewTableId(t._id);
      })
      .catch(() => { /* silently leave preview disabled */ });
    return () => { cancelled = true; };
  }, []);
  function applyTheme(t) {
    patch({
      theme: t.id,
      brandColor: t.brandColor,
      accentColor: t.accentColor,
      mode: t.mode,
      headingFont: t.headingFont,
    });
  }

  // Some popular Google Fonts well-suited to restaurant menus.
  const FONT_SUGGESTIONS = ['', 'Inter', 'Playfair Display', 'Lora', 'Crimson Text', 'Cormorant Garamond', 'EB Garamond', 'DM Serif Display', 'Bebas Neue', 'Manrope', 'Outfit'];

  return (
    <section className="card p-5 space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold">{t('settings.customerMenu')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-prose">
            Controls the look of the page guests land on after scanning a QR
            code (<code>/order.html</code>). Colours, theme mode, optional
            cover image and tagline, and an optional Google Font for headings.
          </p>
        </div>
        {previewTableId ? (
          <a
            // The hash carries the in-progress style so the preview
            // reflects unsaved edits. Named target reuses one tab so
            // repeated clicks just refresh the preview window.
            href={`/order.html?table=${previewTableId}#preview=${encodeURIComponent(JSON.stringify(cm))}`}
            target="patron-preview"
            rel="noreferrer"
            className="btn-ghost text-xs"
            title="Open the customer menu in a new tab — uses your current unsaved settings"
          >Preview ↗</a>
        ) : (
          <span
            className="btn-ghost text-xs opacity-50 cursor-not-allowed"
            title="Add a table on the floor plan first — the preview needs a real table ID."
          >Preview ↗</span>
        )}
      </div>

      {/* Theme presets — clicking one snap-fills the fields below. */}
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Theme</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MENU_THEMES.map((t) => {
            const active = cm.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => applyTheme(t)}
                className={[
                  'text-left p-3 rounded-xl border transition',
                  active
                    ? 'border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10',
                ].join(' ')}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-5 h-5 rounded-md border border-slate-200 dark:border-white/10" style={{ background: t.brandColor }} />
                  <span className="w-5 h-5 rounded-md border border-slate-200 dark:border-white/10" style={{ background: t.accentColor }} />
                  <span className={`w-5 h-5 rounded-md border border-slate-200 dark:border-white/10 ${t.mode === 'light' ? 'bg-white' : 'bg-black'}`} />
                </div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layout — controls the structural shape of /order.html. */}
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Layout</div>
        <div className="grid grid-cols-3 gap-2">
          {MENU_LAYOUTS.map((l) => {
            const active = cm.layout === l.id;
            return (
              <button
                key={l.id}
                onClick={() => patch({ layout: l.id })}
                className={[
                  'text-left p-3 rounded-xl border transition',
                  active
                    ? 'border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10',
                ].join(' ')}
              >
                <div className="flex items-end gap-1 mb-2 h-6">
                  <LayoutGlyph layout={l.id} />
                </div>
                <div className="text-sm font-medium">{l.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{l.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 pt-2">Customise</div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label>
          <span className="text-slate-600 dark:text-slate-300">Brand colour</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-14 rounded-lg border border-slate-200 dark:border-white/5 bg-transparent cursor-pointer"
              value={cm.brandColor}
              onChange={(e) => patch({ brandColor: e.target.value })}
            />
            <input
              className="input flex-1 tabular-nums"
              value={cm.brandColor}
              onChange={(e) => patch({ brandColor: e.target.value })}
            />
          </div>
        </label>
        <label>
          <span className="text-slate-600 dark:text-slate-300">Accent colour <span className="text-slate-400 dark:text-slate-500">(item prices)</span></span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-14 rounded-lg border border-slate-200 dark:border-white/5 bg-transparent cursor-pointer"
              value={cm.accentColor || '#fb923c'}
              onChange={(e) => patch({ accentColor: e.target.value })}
            />
            <input
              className="input flex-1 tabular-nums"
              placeholder="auto"
              value={cm.accentColor}
              onChange={(e) => patch({ accentColor: e.target.value })}
            />
          </div>
        </label>

        <label>
          <span className="text-slate-600 dark:text-slate-300">Theme mode</span>
          <select
            className="input mt-1"
            value={cm.mode}
            onChange={(e) => patch({ mode: e.target.value })}
          >
            <option value="auto">Auto (follow customer's device)</option>
            <option value="dark">Always dark</option>
            <option value="light">Always light</option>
          </select>
        </label>

        <label>
          <span className="text-slate-600 dark:text-slate-300">Heading font (Google Font)</span>
          <input
            className="input mt-1"
            list="patron-font-suggestions"
            placeholder="Inter (default)"
            value={cm.headingFont}
            onChange={(e) => patch({ headingFont: e.target.value })}
          />
          <datalist id="patron-font-suggestions">
            {FONT_SUGGESTIONS.filter(Boolean).map((f) => <option key={f} value={f} />)}
          </datalist>
          <span className="text-xs text-slate-500 dark:text-slate-400">Loaded from fonts.googleapis.com on the customer's device.</span>
        </label>

        <label className="col-span-2">
          <span className="text-slate-600 dark:text-slate-300">Tagline</span>
          <input
            className="input mt-1"
            placeholder="e.g. Brussels' best Belgian beers since 2017"
            value={cm.tagline}
            onChange={(e) => patch({ tagline: e.target.value })}
          />
        </label>

        <label className="col-span-2">
          <span className="text-slate-600 dark:text-slate-300">Cover image URL</span>
          <input
            className="input mt-1"
            placeholder="https://your-domain/cover.jpg"
            value={cm.coverImageUrl}
            onChange={(e) => patch({ coverImageUrl: e.target.value })}
          />
          {cm.coverImageUrl && (
            <img
              src={cm.coverImageUrl}
              alt=""
              className="mt-2 rounded-lg border border-slate-200 dark:border-white/5 max-h-32 w-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </label>
      </div>
    </section>
  );
}

// Tiny SVG glyphs hinting at each layout option. Sized to fit the
// preset cards above. They aren't pixel-faithful previews, just
// suggestive of the structure (cards vs rows vs dense rows).
function LayoutGlyph({ layout }) {
  const fill = 'currentColor';
  if (layout === 'magazine') {
    // Two stacked rows, each with a square thumb on the right hinting
    // at the product photo + a small + dot in its corner.
    return (
      <svg width="36" height="20" viewBox="0 0 36 20" className="text-slate-400 dark:text-slate-500">
        <rect x="0" y="0" width="22" height="9" rx="2" fill={fill} opacity="0.45" />
        <rect x="24" y="0" width="9" height="9" rx="2" fill={fill} opacity="0.7" />
        <circle cx="33" cy="9" r="1.6" fill={fill} opacity="0.95" />
        <rect x="0" y="11" width="22" height="9" rx="2" fill={fill} opacity="0.45" />
        <rect x="24" y="11" width="9" height="9" rx="2" fill={fill} opacity="0.7" />
        <circle cx="33" cy="20" r="1.6" fill={fill} opacity="0.95" />
      </svg>
    );
  }
  if (layout === 'grid') {
    return (
      <svg width="36" height="20" viewBox="0 0 36 20" className="text-slate-400 dark:text-slate-500">
        <rect x="0" y="0" width="11" height="20" rx="2" fill={fill} opacity="0.6"/>
        <rect x="13" y="0" width="11" height="20" rx="2" fill={fill} opacity="0.6"/>
        <rect x="25" y="0" width="11" height="20" rx="2" fill={fill} opacity="0.6"/>
      </svg>
    );
  }
  if (layout === 'list') {
    return (
      <svg width="36" height="20" viewBox="0 0 36 20" className="text-slate-400 dark:text-slate-500">
        <rect x="0" y="0" width="36" height="9" rx="2" fill={fill} opacity="0.6"/>
        <rect x="0" y="11" width="36" height="9" rx="2" fill={fill} opacity="0.6"/>
      </svg>
    );
  }
  // compact
  return (
    <svg width="36" height="20" viewBox="0 0 36 20" className="text-slate-400 dark:text-slate-500">
      <rect x="0" y="0"  width="36" height="4" fill={fill} opacity="0.6"/>
      <rect x="0" y="6"  width="36" height="4" fill={fill} opacity="0.6"/>
      <rect x="0" y="12" width="36" height="4" fill={fill} opacity="0.6"/>
    </svg>
  );
}

function ClosuresSection({ closures, onChange }) {
  const { t } = useT();
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
          <h2 className="font-semibold">{t('settings.closures')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1"
             dangerouslySetInnerHTML={{ __html: t('settings.closures.sub') }} />
        </div>
        <button className="btn-ghost text-xs" onClick={add}>{t('settings.closures.add')}</button>
      </div>

      {!sorted.length && (
        <div className="text-xs text-slate-400 dark:text-slate-500 py-2">
          {t('settings.closures.none')}
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

/**
 * LanguageSection — picks the app interface language. Belgium-first:
 * Dutch is the default; French and English are the other choices.
 *
 * The language is a UI-only preference (lives in localStorage via the
 * LanguageProvider, not in Settings on the server) so it stays a
 * per-device choice — useful when the manager wants Dutch on the
 * iPad in the kitchen but English on the laptop at the office. As a
 * result it doesn't go through the regular Save button at the top of
 * the page; switching is immediate.
 */
function LanguageSection() {
  const { lang, setLang, t } = useT();
  return (
    <section className="card p-5 space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold">{t('header.lang.label')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Per-device preference — saved in this browser only. Customers
            on the QR menu and reservation widget pick their own language
            independently.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {SUPPORTED_LANGS.map((code) => {
          const active = lang === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={active}
              className={[
                'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition',
                active
                  ? 'border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-500/10'
                  : 'border-slate-200 dark:border-white/5 bg-white dark:bg-surface-850 hover:border-slate-300 dark:hover:border-white/10',
              ].join(' ')}
            >
              <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                {LANG_LABELS[code] || code.toUpperCase()}
              </span>
              <span className={[
                'text-sm font-medium',
                active ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200',
              ].join(' ')}>
                {LANG_NATIVE_NAMES[code] || code}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
