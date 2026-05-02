import { useEffect, useMemo, useState } from 'react';
import { fmtEur } from '../api.js';

// Universal modifier groups available for any item.
// The Size group is driven by the per-item `sizes` config from the menu.
// Other groups (Milk, Extras, etc.) are sensible category-based defaults.
function modifierGroupsFor(item) {
  const cat = (item.category?.name || '').toLowerCase();
  const groups = [];

  // Size — only if configured on the item. The first size is treated as
  // the default (zero priceDelta items render as the baseline).
  if (Array.isArray(item.sizes) && item.sizes.length > 0) {
    const sizeOptions = item.sizes.map((s) => ({
      label: s.label,
      priceDelta: Number(s.priceDelta) || 0,
    }));
    // Pick a default: prefer a 0-delta size, otherwise the first.
    const defaultSize =
      sizeOptions.find((o) => o.priceDelta === 0)?.label || sizeOptions[0].label;
    groups.push({
      name: 'Size',
      type: 'single',
      options: sizeOptions,
      default: defaultSize,
    });
  }

  if (cat.includes('coffee') || cat.includes('tea')) {
    groups.push({
      name: 'Milk',
      type: 'single',
      options: [
        { label: 'Whole', priceDelta: 0 },
        { label: 'Skim', priceDelta: 0 },
        { label: 'Oat', priceDelta: 0.3 },
        { label: 'Soy', priceDelta: 0.3 },
        { label: 'No milk', priceDelta: 0 },
      ],
      default: 'Whole',
    });
    groups.push({
      name: 'Extras',
      type: 'multi',
      options: [
        { label: 'Extra shot', priceDelta: 0.7 },
        { label: 'Decaf', priceDelta: 0 },
        { label: 'Syrup', priceDelta: 0.5 },
      ],
    });
  }
  if (cat.includes('main')) {
    groups.push({
      name: 'Sides',
      type: 'multi',
      options: [
        { label: 'Extra fries', priceDelta: 2.0 },
        { label: 'Side salad', priceDelta: 2.5 },
      ],
    });
    groups.push({
      name: 'Cooking',
      type: 'single',
      options: [
        { label: 'Rare', priceDelta: 0 },
        { label: 'Medium', priceDelta: 0 },
        { label: 'Well done', priceDelta: 0 },
      ],
      default: 'Medium',
    });
  }
  if (cat.includes('drink')) {
    groups.push({
      name: 'Ice',
      type: 'single',
      options: [
        { label: 'With ice', priceDelta: 0 },
        { label: 'No ice', priceDelta: 0 },
      ],
      default: 'With ice',
    });
  }

  return groups;
}

export default function ItemModifierModal({ item, onCancel, onConfirm }) {
  const groups = useMemo(() => (item ? modifierGroupsFor(item) : []), [item]);

  // selections: { [groupName]: string | string[] }
  const [selections, setSelections] = useState({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!item) return;
    const init = {};
    for (const g of groups) {
      if (g.type === 'single') init[g.name] = g.default ?? g.options[0]?.label;
      else init[g.name] = [];
    }
    setSelections(init);
    setQty(1);
    setNote('');
  }, [item, groups]);

  if (!item) return null;

  const flatModifiers = [];
  for (const g of groups) {
    if (g.type === 'single') {
      const lbl = selections[g.name];
      const opt = g.options.find((o) => o.label === lbl);
      // Only record non-default / non-zero sizes etc — keep cart clean.
      if (opt && (opt.priceDelta !== 0 || lbl !== g.default)) {
        flatModifiers.push({ label: `${g.name}: ${lbl}`, priceDelta: opt.priceDelta });
      }
    } else {
      const arr = selections[g.name] || [];
      for (const lbl of arr) {
        const opt = g.options.find((o) => o.label === lbl);
        if (opt) flatModifiers.push({ label: lbl, priceDelta: opt.priceDelta });
      }
    }
  }

  const unitPrice = item.price + flatModifiers.reduce((s, m) => s + m.priceDelta, 0);
  const total = unitPrice * qty;

  function toggleMulti(groupName, label) {
    setSelections((prev) => {
      const arr = prev[groupName] || [];
      return {
        ...prev,
        [groupName]: arr.includes(label) ? arr.filter((l) => l !== label) : [...arr, label],
      };
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onCancel}>
      <div className="card w-full max-w-md max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div>
            <div className="font-semibold">{item.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{fmtEur(item.price)} base</div>
          </div>
          <button onClick={onCancel} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {groups.map((g) => (
            <div key={g.name}>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                {g.name}
                {g.type === 'multi' && <span className="ml-1 text-slate-400 dark:text-slate-500">(optional)</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const active =
                    g.type === 'single'
                      ? selections[g.name] === o.label
                      : (selections[g.name] || []).includes(o.label);
                  return (
                    <button
                      key={o.label}
                      onClick={() =>
                        g.type === 'single'
                          ? setSelections((p) => ({ ...p, [g.name]: o.label }))
                          : toggleMulti(g.name, o.label)
                      }
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        active
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'bg-white dark:bg-surface-900 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/10'
                      }`}
                    >
                      {o.label}
                      {o.priceDelta !== 0 && (
                        <span className={`ml-1 text-xs ${active ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                          {o.priceDelta > 0 ? '+' : ''}{fmtEur(o.priceDelta)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Special instructions</div>
            <textarea
              className="input"
              rows="2"
              placeholder="e.g. no onions, allergic to nuts"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/5 pt-3">
            <div className="flex items-center gap-2">
              <button
                className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-surface-850 hover:bg-slate-200 dark:hover:bg-surface-700 text-lg"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >−</button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button
                className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-surface-850 hover:bg-slate-200 dark:hover:bg-surface-700 text-lg"
                onClick={() => setQty((q) => q + 1)}
              >+</button>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">{fmtEur(unitPrice)} × {qty}</div>
              <div className="font-semibold text-lg">{fmtEur(total)}</div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => onConfirm({ modifiers: flatModifiers, qty, note })}
          >
            Add — {fmtEur(total)}
          </button>
        </div>
      </div>
    </div>
  );
}
