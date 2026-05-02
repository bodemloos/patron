import { useEffect, useState } from 'react';
import { api, fmtEur } from '../api.js';
import Modal from '../components/Modal.jsx';

const empty = { name: '', price: 0, category: '', description: '', available: true, recipe: [], sizes: [] };

export default function Items() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [stock, setStock] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editingCat, setEditingCat] = useState(null);

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
    if (!confirm('Delete this menu item?')) return;
    await api.deleteItem(id);
    load();
  }
  async function saveCat() {
    await api.saveCategory(editingCat);
    setEditingCat(null);
    load();
  }
  async function removeCat(id) {
    if (!confirm('Delete this category?')) return;
    await api.deleteCategory(id);
    load();
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-semibold">Menu items</h1>
        <div className="flex gap-2">
          <button className="btn-ghost flex-1 sm:flex-none justify-center" onClick={() => setEditingCat({ name: '', color: '#64748b' })}>
            + Category
          </button>
          <button className="btn-primary flex-1 sm:flex-none justify-center" onClick={() => setEditing({ ...empty })}>+ Item</button>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5 font-medium text-sm text-slate-500 dark:text-slate-400">Categories</div>
        <div className="px-5 py-3 flex flex-wrap gap-2">
          {cats.map((c) => (
            <div key={c._id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
              <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
              <span className="text-sm font-medium">{c.name}</span>
              <button onClick={() => setEditingCat(c)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">edit</button>
              <button onClick={() => removeCat(c._id)} className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">×</button>
            </div>
          ))}
          {!cats.length && <div className="text-slate-400 dark:text-slate-500 text-sm">No categories yet.</div>}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Recipe items</th>
              <th className="px-4 py-2">Available</th>
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
                    {i.available ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100" onClick={() => setEditing({ ...i, category: i.category?._id || '', recipe: (i.recipe||[]).map(r => ({ stockItem: r.stockItem?._id || r.stockItem, qty: r.qty })), sizes: (i.sizes || []).map(s => ({ label: s.label, priceDelta: s.priceDelta })) })}>edit</button>
                  <button className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" onClick={() => remove(i._id)}>delete</button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan="6" className="text-center py-6 text-slate-400 dark:text-slate-500">No items yet.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </section>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit item' : 'New item'}
        wide
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={save}>Save</button>
          </>
        }
      >
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Name</span>
              <input className="input mt-1" value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Price (EUR)</span>
              <input className="input mt-1" type="number" step="0.01" value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Category</span>
              <select className="input mt-1" value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                <option value="">— none —</option>
                {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </label>
            <label className="col-span-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Description</span>
              <textarea className="input mt-1" rows="2" value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </label>
            <label className="col-span-2 inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.available !== false}
                onChange={(e) => setEditing({ ...editing, available: e.target.checked })} />
              Available on POS
            </label>

            <div className="col-span-2 mt-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Sizes</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure size variants to make the POS show a picker. Empty = single tap adds straight to the order.</p>
                </div>
                <button
                  className="text-xs text-brand-700 dark:text-brand-400 hover:underline"
                  onClick={() =>
                    setEditing({ ...editing, sizes: [...(editing.sizes || []), { label: '', priceDelta: 0 }] })
                  }
                >
                  + Add size
                </button>
              </div>
              {(editing.sizes || []).length === 0 && (
                <div className="text-xs text-slate-400 dark:text-slate-500">No sizes — single tap will quick-add this item.</div>
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
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Recipe (auto-decrements stock on payment)</span>
                <button
                  className="text-xs text-brand-700 dark:text-brand-400 hover:underline"
                  onClick={() =>
                    setEditing({ ...editing, recipe: [...editing.recipe, { stockItem: stock[0]?._id || '', qty: 1 }] })
                  }
                >
                  + Add ingredient
                </button>
              </div>
              {editing.recipe.length === 0 && <div className="text-xs text-slate-400 dark:text-slate-500">No ingredients.</div>}
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
        title={editingCat?._id ? 'Edit category' : 'New category'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditingCat(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveCat}>Save</button>
          </>
        }
      >
        {editingCat && (
          <div className="space-y-3">
            <label className="text-sm block">
              <span className="text-slate-600 dark:text-slate-300">Name</span>
              <input className="input mt-1" value={editingCat.name}
                onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} />
            </label>
            <label className="text-sm block">
              <span className="text-slate-600 dark:text-slate-300">Color</span>
              <input type="color" className="mt-1 h-10 w-20 rounded-lg border border-slate-200 dark:border-white/5" value={editingCat.color}
                onChange={(e) => setEditingCat({ ...editingCat, color: e.target.value })} />
            </label>
            <label className="text-sm block">
              <span className="text-slate-600 dark:text-slate-300">VAT / tax rate (%)</span>
              <input
                className="input mt-1"
                type="number"
                step="0.5"
                placeholder="Leave blank to use the default rate from Settings"
                value={editingCat.taxRate >= 0 ? editingCat.taxRate : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditingCat({ ...editingCat, taxRate: v === '' ? -1 : Number(v) });
                }}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Leave blank to inherit the default. Common rates: 6% (food, BE), 12% (restaurant, BE), 21% (drinks, BE).
              </span>
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
