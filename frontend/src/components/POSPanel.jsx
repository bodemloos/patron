import { useEffect, useMemo, useState } from "react";
import { api, fmtEur } from "../api.js";
import ItemModifierModal from "./ItemModifierModal.jsx";

// Categories whose items always open the modifier modal so the waiter
// can capture allergies / remarks / cooking preferences before sending
// to the kitchen — even when no size variants are configured. Matched
// loosely against the category name (case-insensitive, substring).
const MODAL_REQUIRED_CATEGORIES = ["main", "dessert", "desert"];

function needsModalPrompt(item) {
  if (Array.isArray(item.sizes) && item.sizes.length > 0) return true;
  const cat = (item.category?.name || "").toLowerCase();
  return MODAL_REQUIRED_CATEGORIES.some((kw) => cat.includes(kw));
}

/**
 * POSPanel — the menu grid + cart UI rendered inside the slide-over
 * launched from the floor plan.
 *
 * Responsive:
 *   - sm+ : menu and cart are side-by-side.
 *   - <sm : menu is full-width with a sticky "View cart" bar; tapping it
 *           swaps to a full-width cart view that has a "Back to menu" header.
 *
 * Props:
 *   tableId    - the Table id this order belongs to (required)
 *   onClose    - callback when the user wants to dismiss the panel
 *   onPaid     - callback after a successful pay (auto-close)
 *   embedded   - true when used inside a slide-over (renders a compact header)
 */
export default function POSPanel({
  tableId,
  onClose,
  onPaid,
  embedded = false,
}) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeCat, setActiveCat] = useState("all");
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [modItem, setModItem] = useState(null); // item being modified before adding
  const [mobileView, setMobileView] = useState("menu"); // 'menu' | 'cart'

  // Reference data — load once
  useEffect(() => {
    Promise.all([api.items(), api.categories(), api.tables()]).then(
      ([it, c, t]) => {
        setItems(it);
        setCategories(c);
        setTables(t);
      }
    );
  }, []);

  // Resolve / create the order whenever tableId changes
  useEffect(() => {
    setOrder(null);
    setMobileView("menu");
    if (!tableId) return;
    let cancelled = false;
    (async () => {
      const open = await api.orders(`status=open&table=${tableId}`);
      if (cancelled) return;
      if (open.length) return setOrder(open[0]);
      const sent = await api.orders(`status=sent&table=${tableId}`);
      if (cancelled) return;
      if (sent.length) return setOrder(sent[0]);
      const created = await api.newOrder(tableId, null);
      if (cancelled) return;
      setOrder(created);
    })();
    return () => {
      cancelled = true;
    };
  }, [tableId]);

  const filteredItems = useMemo(() => {
    if (activeCat === "all") return items.filter((i) => i.available !== false);
    return items.filter(
      (i) => i.available !== false && i.category && i.category._id === activeCat
    );
  }, [items, activeCat]);

  const currentTable = tables.find((t) => t._id === tableId);
  const cartCount = (order?.lines || []).reduce((s, l) => s + l.qty, 0);

  // Quick-add by default: a single tap drops the item straight into the
  // order. The backend merges identical pending lines, so 4 taps on the
  // same item collapse into one line with qty=4.
  //
  // The modifier modal opens instead when:
  //   - the item has configured size variants (user must pick one), OR
  //   - the item is a main or dessert (kitchen needs to know about
  //     allergies / cooking preferences / remarks before sending).
  async function tapItem(item) {
    if (!order || busy) return;
    if (needsModalPrompt(item)) {
      setModItem(item);
      return;
    }
    setBusy(true);
    try {
      const updated = await api.addLine(order._id, item._id, 1, "", []);
      setOrder(updated);
    } finally {
      setBusy(false);
    }
  }

  async function confirmAdd({ modifiers, qty, note }) {
    if (!order || !modItem) return;
    setBusy(true);
    try {
      const updated = await api.addLine(
        order._id,
        modItem._id,
        qty,
        note,
        modifiers
      );
      setOrder(updated);
      setModItem(null);
    } finally {
      setBusy(false);
    }
  }

  async function changeQty(line, qty) {
    setBusy(true);
    try {
      const updated = await api.updateLine(order._id, line._id, { qty });
      setOrder(updated);
    } finally {
      setBusy(false);
    }
  }

  async function pay(method) {
    setBusy(true);
    try {
      // Settings drives whether we show a tip prompt + which percentages.
      const settings = await api.settings().catch(() => null);
      const showTip = settings?.tipsEnabled !== false;
      const subtotal = order.subtotal || 0;
      const tax = order.taxAmount || 0;
      const beforeTip = subtotal + tax;

      let tip = 0;
      if (showTip) {
        const suggestions = (settings?.tipSuggestions || [0, 5, 10, 15]).filter(
          (n) => n > 0
        );
        const choices = suggestions
          .map((p) => `${p}% = ${fmtEur((beforeTip * p) / 100)}`)
          .join("\n");
        const raw = prompt(
          `Total before tip: ${fmtEur(beforeTip)}\n\n` +
            `Add a tip? (€ amount, or one of: ${suggestions.join(", ")}%)\n\n` +
            `Suggestions:\n${choices}\n\nLeave blank for no tip.`,
          ""
        );
        if (raw === null) {
          setBusy(false);
          return;
        } // cancel
        const trimmed = (raw || "").trim();
        if (trimmed.endsWith("%")) {
          const pct = Number(trimmed.replace("%", ""));
          if (!isNaN(pct)) tip = (beforeTip * pct) / 100;
        } else if (trimmed) {
          const eur = Number(trimmed.replace(",", "."));
          if (!isNaN(eur)) tip = eur;
        }
        tip = Math.max(0, Math.round(tip * 100) / 100);
      }

      const total = beforeTip + tip;
      if (
        !confirm(
          `Charge ${fmtEur(total)} via ${method}?\n\n  Subtotal ${fmtEur(
            subtotal
          )}\n  VAT      ${fmtEur(tax)}\n  Tip      ${fmtEur(tip)}`
        )
      ) {
        setBusy(false);
        return;
      }
      await api.payOrder(order._id, method, tip);
      onPaid?.();
      onClose?.();
    } finally {
      setBusy(false);
    }
  }

  async function markFree() {
    if (
      !confirm(
        "Mark this table as free? Any unpaid items on this order will be cancelled."
      )
    )
      return;
    setBusy(true);
    try {
      await api.freeTable(tableId);
      onPaid?.();
      onClose?.();
    } finally {
      setBusy(false);
    }
  }

  // Show the Mark-as-free action only when there's something to clear:
  // either the order already has lines, or it's been sent to the kitchen.
  const canFree =
    !!order && (order.lines?.length > 0 || order.status === "sent");

  // ----- Menu side -----
  const menu = (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-surface-900 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {currentTable ? `Room ${currentTable.room}` : "POS"}
          </div>
          <div className="font-semibold text-base sm:text-lg truncate">
            {currentTable ? `Table ${currentTable.label}` : "—"}
            {currentTable && (
              <span className="text-sm text-slate-400 dark:text-slate-500 ml-2">
                {currentTable.seats} seats
              </span>
            )}
          </div>
        </div>
        {onClose && (
          <button className="btn-ghost shrink-0" onClick={onClose}>
            {embedded ? "Close" : "← Back"}
          </button>
        )}
      </div>

      <div className="px-4 sm:px-5 py-2.5 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-surface-900 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveCat("all")}
          className={`btn shrink-0 ${
            activeCat === "all"
              ? "bg-slate-900 dark:bg-slate-100 text-black"
              : "bg-white dark:bg-surface-900 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c._id}
            onClick={() => setActiveCat(c._id)}
            className={`btn shrink-0 ${
              activeCat === c._id
                ? "text-white"
                : "bg-white dark:bg-surface-900 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-200"
            }`}
            style={
              activeCat === c._id ? { backgroundColor: c.color } : undefined
            }
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {filteredItems.map((i) => (
            <button
              key={i._id}
              onClick={() => tapItem(i)}
              disabled={busy}
              className="card p-3 sm:p-4 text-left active:bg-slate-50 dark:active:bg-surface-800 hover:border-brand-500 dark:hover:border-brand-400 hover:shadow transition disabled:opacity-50 min-h-[88px]"
            >
              <div
                className="text-[10px] sm:text-xs uppercase tracking-wide mb-1"
                style={{ color: i.category?.color || "#64748b" }}
              >
                {i.category?.name || "—"}
              </div>
              <div className="font-semibold leading-tight mb-1.5 text-sm sm:text-base">
                {i.name}
              </div>
              <div className="text-brand-700 dark:text-brand-400 font-semibold text-sm sm:text-base">
                {fmtEur(i.price)}
              </div>
            </button>
          ))}
          {!filteredItems.length && (
            <div className="col-span-full text-center text-slate-400 dark:text-slate-500 py-8">
              No items in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ----- Cart side -----
  const cart = (
    <aside
      className={`flex flex-col bg-white dark:bg-surface-900 border-slate-200 dark:border-white/5 ${
        embedded ? "sm:border-l sm:w-80" : "sm:border-l sm:w-96"
      }`}
    >
      <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-white/5 flex items-center gap-2">
        {/* Back to menu button — only on mobile */}
        <button
          className="sm:hidden btn-ghost px-2"
          onClick={() => setMobileView("menu")}
        >
          ← Menu
        </button>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Current order
          </div>
          <div className="font-semibold truncate">
            {order ? `#${String(order._id).slice(-5)}` : "Loading…"}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 sm:px-4 py-3 space-y-2">
        {order?.lines?.length ? (
          order.lines.map((l) => (
            <div
              key={l._id}
              className="border border-slate-200 dark:border-white/5 rounded-lg p-2.5"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm leading-tight">
                    {l.name}
                  </div>
                  {l.modifiers?.length > 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {l.modifiers.map((m) => m.label).join(" · ")}
                    </div>
                  )}
                  {l.note && (
                    <div className="text-xs text-amber-700 dark:text-amber-300 italic mt-0.5">
                      "{l.note}"
                    </div>
                  )}
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {fmtEur(l.price)} ·{" "}
                    <span className="capitalize">{l.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-surface-850 hover:bg-slate-200 dark:hover:bg-surface-700 active:bg-slate-300 dark:active:bg-surface-600 text-lg"
                    onClick={() => changeQty(l, l.qty - 1)}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {l.qty}
                  </span>
                  <button
                    className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-surface-850 hover:bg-slate-200 dark:hover:bg-surface-700 active:bg-slate-300 dark:active:bg-surface-600 text-lg"
                    onClick={() => changeQty(l, l.qty + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-right text-sm font-semibold mt-1">
                {fmtEur(l.price * l.qty)}
              </div>
            </div>
          ))
        ) : (
          <div className="text-slate-400 dark:text-slate-500 text-sm py-8 text-center">
            Tap an item to start the order.
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-white/5 px-3 sm:px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
          <span className="tabular-nums">{fmtEur(order?.subtotal || 0)}</span>
        </div>
        {order?.taxAmount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">VAT</span>
            <span className="tabular-nums text-slate-500 dark:text-slate-400">
              {fmtEur(order.taxAmount)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-2">
          <span className="text-slate-500 dark:text-slate-400 text-sm">
            Total before tip
          </span>
          <span className="font-semibold text-lg tabular-nums">
            {fmtEur((order?.subtotal || 0) + (order?.taxAmount || 0))}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            className="btn-primary justify-center min-h-[44px]"
            onClick={() => pay("card")}
            disabled={!order?.lines?.length || busy}
          >
            Pay card
          </button>
          <button
            className="btn-ghost justify-center min-h-[44px]"
            onClick={() => pay("cash")}
            disabled={!order?.lines?.length || busy}
          >
            Pay cash
          </button>
          <button
            className="btn-ghost justify-center col-span-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 min-h-[44px]"
            onClick={markFree}
            disabled={!canFree || busy}
          >
            Mark table as free
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="h-full flex flex-col sm:flex-row bg-slate-50 dark:bg-surface-950 relative">
      {/* On mobile, switch between menu and cart views.
          On sm+, both are visible side-by-side. */}
      <div
        className={`${
          mobileView === "menu" ? "flex" : "hidden"
        } sm:flex flex-1 min-h-0`}
      >
        {menu}
      </div>
      <div
        className={`${
          mobileView === "cart" ? "flex" : "hidden"
        } sm:flex flex-1 sm:flex-none min-h-0`}
      >
        {cart}
      </div>

      {/* Floating "View cart" bar — mobile only, when on menu view with items */}
      {mobileView === "menu" && cartCount > 0 && (
        <button
          onClick={() => setMobileView("cart")}
          className="sm:hidden absolute left-3 right-3 bottom-3 bg-brand-600 text-white rounded-xl shadow-lg
                     px-4 py-3 flex items-center justify-between font-semibold active:bg-brand-700"
        >
          <span className="flex items-center gap-2">
            <span className="bg-white dark:bg-surface-900 text-brand-700 dark:text-brand-400 rounded-full w-6 h-6 grid place-items-center text-xs">
              {cartCount}
            </span>
            View cart
          </span>
          <span>{fmtEur(order?.subtotal || 0)}</span>
        </button>
      )}

      <ItemModifierModal
        item={modItem}
        onCancel={() => setModItem(null)}
        onConfirm={confirmAdd}
      />
    </div>
  );
}
