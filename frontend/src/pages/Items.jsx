import { useEffect, useState } from 'react';
import { api, fmtEur } from '../api.js';
import Modal from '../components/Modal.jsx';
import { useT } from '../i18n/index.jsx';

const empty = { name: '', price: 0, category: '', description: '', imageUrl: '', infoUrl: '', available: true, recipe: [], sizes: [] };

export default function Items() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [stock, setStock] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const { t } = useT();

  async function load() {
    const [it, c, s] = await Promise.all([api.items(), api.categories(), api.stock()]);
    setItems(it); setCats(c); setStock(s);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    const payload = {
      ...editing,
      price: Number(editing.price) || 0,
      category: editing.category || null,
      imageUrl: (editing.imageUrl || '').trim(),
      infoUrl: (editing.infoUrl || '').trim(),
      recipe: editing.recipe.map((r) => ({
        stockItem: r.stockItem,
        qty: Number(r.qty) || 0,
      })),
      // Drop blank-label rows; coerce priceDelta to a number.
      sizes: (editing.sizes || [])
        .map((s) => ({ label: (s.label || '').trim(), priceDelta: Number(s.priceDelta) || 0 }))
        .filter((s) => s.label),
    };
    await api.saveItem(payload);
    setEditing(null);
    load();
  }
  async function remove(id) {
    if (!confirm(t('items.deleteItemConfirm'))) return;
    await api.deleteItem(id);
    load();
  }
  async function saveCat() {
    await api.saveCategory(editingCat);
    setEditingCat(null);
    load();
  }
  async function removeCat(id) {
    if (!confirm(t('items.deleteCatConfirm'))) return;
    await api.deleteCategory(id);
    load();
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-semibold">{t('items.title')}</h1>
        <div className="flex gap-2">
          <button className="btn-ghost flex-1 sm:flex-none justify-center" onClick={() => setEditingCat({ name: '', color: '#64748b' })}>
            {t('items.addCategory')}
          </button>
          <button className="btn-primary flex-1 sm:flex-none justify-center" onClick={() => setEditing({ ...empty })}>{t('items.addItem')}</button>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5 font-medium text-sm text-slate-500 dark:text-slate-400">{t('items.section.categories')}</div>
        <div className="px-5 py-3 space-y-3">
          {(() => {
            // Group children under their parents; categories without
            // a parent are top-level. Single-level nesting only.
            const parents = cats.filter((c) => !c.parent);
            const orphans = cats.filter(
              (c) => c.parent && !parents.find((p) => p._id === c.parent)
            );
            const childrenOf = (pid) => cats.filter((c) => c.parent === pid);
            const renderChip = (c) => (
              <div
                key={c._id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5"
              >
                <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                <span className="text-sm font-medium">{c.name}</span>
                <button
                  onClick={() => setEditingCat(c)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  edit
                </button>
                <button
                  onClick={() => removeCat(c._id)}
                  className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  ×
                </button>
              </div>
            );
            if (!cats.length) {
              return <div className="text-slate-400 dark:text-slate-500 text-sm">{t('items.section.noCategories')}</div>;
            }
            return (
              <>
                {parents.map((p) => (
                  <div key={p._id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                      <span className="text-xs uppercase tracking-wide font-semibold text-slate-700 dark:text-slate-200">
                        {p.name}
                      </span>
                      <button
                        onClick={() => setEditingCat(p)}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => removeCat(p._id)}
                        className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-5">
                      {childrenOf(p._id).map(renderChip)}
                      {!childrenOf(p._id).length && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 italic">
                          {t('items.section.noChildren')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {orphans.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wide font-semibold text-slate-700 dark:text-slate-200 mb-2">
                      {t('items.section.other')}
                    </div>
                    <div className="flex flex-wrap gap-2 pl-5">{orphans.map(renderChip)}</div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2">{t('items.col.name')}</th>
              <th className="px-4 py-2">{t('items.col.category')}</th>
              <th className="px-4 py-2">{t('items.col.price')}</th>
              <th className="px-4 py-2">{t('items.col.recipe')}</th>
              <th className="px-4 py-2">{t('items.col.available')}</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i._id} className="border-t border-slate-100 dark:border-white/5">
                <td className="px-4 py-2 font-medium">{i.name}</td>
                <td className="px-4 py-2">
                  {i.category ? (
                    <span className="badge" style={{ background: i.category.color + '22', color: i.category.color }}>
                      {i.category.name}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-2">{fmtEur(i.price)}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{i.recipe?.length || 0}</td>
                <td className="px-4 py-2">
                  <span className={`badge ${i.available ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-surface-850 text-slate-500 dark:text-slate-400'}`}>
                    {i.available ? t('common.yes') : t('common.no')}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100" onClick={() => setEditing({ ...i, category: i.category?._id || '', imageUrl: i.imageUrl || '', infoUrl: i.infoUrl || '', recipe: (i.recipe||[]).map(r => ({ stockItem: r.stockItem?._id || r.stockItem, qty: r.qty })), sizes: (i.sizes || []).map(s => ({ label: s.label, priceDelta: s.priceDelta })) })}>edit</button>
                  <button className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" onClick={() => remove(i._id)}>delete</button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan="6" className="text-center py-6 text-slate-400 dark:text-slate-500">{t('items.empty')}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </section>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? t('items.modal.edit') : t('items.modal.new')}
        wide
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
            <button className="btn-primary" onClick={save}>{t('common.save')}</button>
          </>
        }
      >
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">{t('items.field.name')}</span>
              <input className="input mt-1" value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">{t('items.field.price')}</span>
              <input className="input mt-1" type="number" step="0.01" value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">{t('items.field.category')}</span>
              <select className="input mt-1" value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                <option value="">{t('common.none')}</option>
                {(() => {
                  // Group children under their parents in optgroups so
                  // the manager picks a leaf category, not a parent
                  // bucket. Top-level categories without children still
                  // show up at the bottom under "Top-level".
                  const parents = cats.filter((c) => !c.parent);
                  const opts = [];
                  parents.forEach((p) => {
                    const children = cats.filter((c) => c.parent === p._id);
                    if (children.length) {
                      opts.push(
                        <optgroup key={p._id} label={p.name}>
                          {children.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </optgroup>
                      );
                    } else {
                      opts.push(
                        <option key={p._id} value={p._id}>{p.name}</option>
                      );
                    }
                  });
                  return opts;
                })()}
              </select>
            </label>
            <label className="col-span-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">{t('items.field.description')}</span>
              <textarea className="input mt-1" rows="2" value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </label>
            <label className="col-span-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">{t('items.field.imageUrl')}</span>
              <div className="flex gap-2 mt-1 items-start">
                <input
                  className="input flex-1"
                  type="url"
                  placeholder="https://…"
                  value={editing.imageUrl || ''}
                  onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                />
                {editing.imageUrl ? (
                  <img
                    src={editing.imageUrl}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-surface-850"
                    onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg border border-dashed border-slate-200 dark:border-white/10 grid place-items-center text-[10px] text-slate-400 dark:text-slate-500">
                    no img
                  </div>
                )}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('items.field.imageHelp')}
              </span>
            </label>
            <label className="col-span-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">{t('items.field.infoUrl')}</span>
              <input
                className="input mt-1"
                type="url"
                placeholder="https://untappd.com/b/..."
                value={editing.infoUrl || ''}
                onChange={(e) => setEditing({ ...editing, infoUrl: e.target.value })}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('items.field.infoHelp')}
              </span>
            </label>
            <label className="col-span-2 inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.available !== false}
                onChange={(e) => setEditing({ ...editing, available: e.target.checked })} />
              {t('items.field.available')}
            </label>

            <div className="col-span-2 mt-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('items.sizes.title')}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('items.sizes.help')}</p>
                </div>
                <button
                  className="text-xs text-brand-700 dark:text-brand-400 hover:underline"
                  onClick={() =>
                    setEditing({ ...editing, sizes: [...(editing.sizes || []), { label: '', priceDelta: 0 }] })
                  }
                >
                  {t('items.sizes.add')}
                </button>
              </div>
              {(editing.sizes || []).length === 0 && (
                <div className="text-xs text-slate-400 dark:text-slate-500">{t('items.sizes.empty')}</div>
              )}
              <div className="space-y-2">
                {(editing.sizes || []).map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Label (e.g. Small)"
                      value={s.label}
                      onChange={(e) => {
                        const next = [...editing.sizes];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setEditing({ ...editing, sizes: next });
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">€</span>
                      <input
                        className="input w-24"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        title="Price delta vs the base price (negative for cheaper)"
                        value={s.priceDelta}
                        onChange={(e) => {
                          const next = [...editing.sizes];
                          next[idx] = { ...next[idx], priceDelta: e.target.value };
                          setEditing({ ...editing, sizes: next });
                        }}
                      />
                    </div>
                    <button
                      className="text-red-500 dark:text-red-400"
                      onClick={() => setEditing({ ...editing, sizes: editing.sizes.filter((_, i) => i !== idx) })}
                    >×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-2 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('items.recipe.title')}</span>
                <button
                  className="text-xs text-brand-700 dark:text-brand-400 hover:underline"
                  onClick={() =>
                    setEditing({ ...editing, recipe: [...editing.recipe, { stockItem: stock[0]?._id || '', qty: 1 }] })
                  }
                >
                  {t('items.recipe.add')}
                </button>
              </div>
              {editing.recipe.length === 0 && <div className="text-xs text-slate-400 dark:text-slate-500">{t('items.recipe.empty')}</div>}
              <div className="space-y-2">
                {editing.recipe.map((r, idx) => {
                  const s = stock.find((x) => x._id === r.stockItem);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <select className="input flex-1" value={r.stockItem}
                        onChange={(e) => {
                          const next = [...editing.recipe];
                          next[idx] = { ...next[idx], stockItem: e.target.value };
                          setEditing({ ...editing, recipe: next });
                        }}>
                        {stock.map((st) => <option key={st._id} value={st._id}>{st.name} ({st.unit})</option>)}
                      </select>
                      <input className="input w-24" type="number" step="0.01" value={r.qty}
                        onChange={(e) => {
                          const next = [...editing.recipe];
                          next[idx] = { ...next[idx], qty: e.target.value };
                          setEditing({ ...editing, recipe: next });
                        }} />
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-10">{s?.unit || ''}</span>
                      <button className="text-red-500 dark:text-red-400" onClick={() =>
                        setEditing({ ...editing, recipe: editing.recipe.filter((_, i) => i !== idx) })}>×</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editingCat}
        onClose={() => setEditingCat(null)}
        title={editingCat?._id ? t('items.modal.cat.edit') : t('items.modal.cat.new')}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditingCat(null)}>{t('common.cancel')}</button>
            <button className="btn-primary" onClick={saveCat}>{t('common.save')}</button>
          </>
        }
      >
        {editingCat && (
          <div className="space-y-3">
            <label className="text-sm block">
              <span className="text-slate-600 dark:text-slate-300">{t('items.field.name')}</span>
              <input className="input mt-1" value={editingCat.name}
                onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} />
            </label>
            <label className="text-sm block">
              <span className="text-slate-600 dark:text-slate-300">{t('items.field.parent')}</span>
              <select
                className="input mt-1"
                value={editingCat.parent || ''}
                onChange={(e) =>
                  setEditingCat({ ...editingCat, parent: e.target.value || null })
                }
              >
                <option value="">{t('items.field.parentTopLevel')}</option>
                {cats
                  .filter((c) => !c.parent && c._id !== editingCat._id)
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('items.field.parentHelp')}
              </span>
            </label>
            <label className="text-sm block">
              <span className="text-slate-600 dark:text-slate-300">{t('items.field.color')}</span>
              <input type="color" className="mt-1 h-10 w-20 rounded-lg border border-slate-200 dark:border-white/5" value={editingCat.color}
                onChange={(e) => setEditingCat({ ...editingCat, color: e.target.value })} />
            </label>
            <label className="text-sm block">
              <span className="text-slate-600 dark:text-slate-300">{t('items.field.taxRate')}</span>
              <input
                className="input mt-1"
                type="number"
                step="0.5"
                placeholder={t('items.field.taxRatePh')}
                value={editingCat.taxRate >= 0 ? editingCat.taxRate : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditingCat({ ...editingCat, taxRate: v === '' ? -1 : Number(v) });
                }}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('items.field.taxRateHelp')}
              </span>
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
