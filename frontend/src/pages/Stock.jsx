import { useEffect, useMemo, useState } from 'react';
import { api, fmtEur } from '../api.js';
import Modal from '../components/Modal.jsx';

const empty = { name: '', unit: 'pcs', quantity: 0, minQuantity: 0, costPerUnit: 0, supplier: '', supplierEmail: '', reorderQuantity: 0 };

export default function Stock() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [shoppingList, setShoppingList] = useState(null);

  async function load() {
    setList(await api.stock());
  }
  useEffect(() => { load(); }, []);

  async function openShopping() {
    setShoppingOpen(true);
    setShoppingList(null);
    setShoppingList(await api.shoppingList());
  }

  async function save() {
    await api.saveStock({
      ...editing,
      quantity: Number(editing.quantity) || 0,
      minQuantity: Number(editing.minQuantity) || 0,
      costPerUnit: Number(editing.costPerUnit) || 0,
    });
    setEditing(null);
    load();
  }
  async function adjust(s, delta) {
    await api.adjustStock(s._id, delta);
    load();
  }
  async function remove(id) {
    if (!confirm('Delete stock item?')) return;
    await api.deleteStock(id);
    load();
  }

  const filtered = useMemo(
    () => list.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [list, search]
  );
  const lowCount = list.filter((s) => s.quantity <= s.minQuantity).length;

  return (
    <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Stock</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {list.length} items · {lowCount} below threshold
          </p>
        </div>
        <div className="flex gap-2">
          <input className="input flex-1 sm:w-64" placeholder="Search..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-ghost shrink-0" onClick={openShopping} title="Shopping list">
            <span className="hidden sm:inline">Shopping list{lowCount > 0 ? ` (${lowCount})` : ''}</span>
            <span className="sm:hidden">📋</span>
          </button>
          <button className="btn-primary shrink-0" onClick={() => setEditing({ ...empty })}>
            <span className="hidden sm:inline">+ Stock item</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">On hand</th>
              <th className="px-4 py-2">Min</th>
              <th className="px-4 py-2">Cost / unit</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Quick adjust</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const low = s.quantity <= s.minQuantity;
              return (
                <tr key={s._id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="px-4 py-2 font-medium flex items-center gap-2">
                    {low && <span className="w-2 h-2 rounded-full bg-red-500" title="Low" />}
                    {s.name}
                  </td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{s.unit}</td>
                  <td className={`px-4 py-2 font-semibold ${low ? 'text-red-600 dark:text-red-400' : ''}`}>{s.quantity}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{s.minQuantity}</td>
                  <td className="px-4 py-2">{fmtEur(s.costPerUnit)}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{fmtEur(s.quantity * s.costPerUnit)}</td>
                  <td className="px-4 py-2 space-x-1">
                    <button className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-surface-850 hover:bg-slate-200 dark:hover:bg-surface-700" onClick={() => adjust(s, -1)}>−1</button>
                    <button className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-surface-850 hover:bg-slate-200 dark:hover:bg-surface-700" onClick={() => adjust(s, 1)}>+1</button>
                    <button className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-surface-850 hover:bg-slate-200 dark:hover:bg-surface-700" onClick={() => adjust(s, 10)}>+10</button>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100" onClick={() => setEditing({ ...s })}>edit</button>
                    <button className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" onClick={() => remove(s._id)}>×</button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr><td colSpan="8" className="text-center py-8 text-slate-400 dark:text-slate-500">No stock items.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit stock item' : 'New stock item'}
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
              <span className="text-slate-600 dark:text-slate-300">Unit</span>
              <input className="input mt-1" value={editing.unit}
                onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Cost per unit (EUR)</span>
              <input className="input mt-1" type="number" step="0.0001" value={editing.costPerUnit}
                onChange={(e) => setEditing({ ...editing, costPerUnit: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Quantity on hand</span>
              <input className="input mt-1" type="number" step="0.01" value={editing.quantity}
                onChange={(e) => setEditing({ ...editing, quantity: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Low-stock threshold</span>
              <input className="input mt-1" type="number" step="0.01" value={editing.minQuantity}
                onChange={(e) => setEditing({ ...editing, minQuantity: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Supplier</span>
              <input className="input mt-1" value={editing.supplier || ''}
                onChange={(e) => setEditing({ ...editing, supplier: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Supplier email</span>
              <input className="input mt-1" type="email" value={editing.supplierEmail || ''}
                onChange={(e) => setEditing({ ...editing, supplierEmail: e.target.value })} />
            </label>
            <label className="col-span-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Reorder quantity (0 = auto: 2× min − on-hand)</span>
              <input className="input mt-1" type="number" step="0.01" value={editing.reorderQuantity || 0}
                onChange={(e) => setEditing({ ...editing, reorderQuantity: e.target.value })} />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={shoppingOpen}
        onClose={() => setShoppingOpen(false)}
        title="Shopping list"
        wide
        footer={<button className="btn-primary" onClick={() => window.print()}>Print</button>}
      >
        {!shoppingList && <div className="text-slate-400 dark:text-slate-500">Loading…</div>}
        {shoppingList && shoppingList.itemsBelow === 0 && (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">
            Nothing below threshold — fully stocked.
          </div>
        )}
        {shoppingList && shoppingList.itemsBelow > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {shoppingList.itemsBelow} item{shoppingList.itemsBelow === 1 ? '' : 's'} below threshold.
              Suggested quantities = 2× minimum − on-hand, unless an explicit Reorder quantity is set on the item.
            </p>
            {shoppingList.groups.map((g) => {
              const subject = encodeURIComponent(`Order request — ${g.supplier}`);
              const body = encodeURIComponent(
                'Hi,\n\nPlease prepare the following:\n\n' +
                g.items.map((i) => `- ${i.name}: ${i.suggested} ${i.unit}`).join('\n') +
                '\n\nThanks.'
              );
              return (
                <section key={g.supplier} className="border border-slate-200 dark:border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="font-medium">{g.supplier}</div>
                    {g.supplierEmail && (
                      <a className="text-xs text-brand-700 dark:text-brand-400 hover:underline"
                         href={`mailto:${g.supplierEmail}?subject=${subject}&body=${body}`}>
                        Email order ↗
                      </a>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-slate-500 dark:text-slate-400 text-left">
                      <tr><th>Item</th><th className="text-right">On hand</th><th className="text-right">Min</th><th className="text-right">Order</th></tr>
                    </thead>
                    <tbody>
                      {g.items.map((i) => (
                        <tr key={i._id} className="border-t border-slate-100 dark:border-white/5">
                          <td className="py-1.5">{i.name}</td>
                          <td className="py-1.5 text-right tabular-nums">{i.quantity} {i.unit}</td>
                          <td className="py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400">{i.minQuantity}</td>
                          <td className="py-1.5 text-right tabular-nums font-medium">{i.suggested} {i.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
