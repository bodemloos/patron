import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import Modal from "../components/Modal.jsx";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  seated: "Seated",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const STATUS_TONES = {
  pending:
    "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  confirmed:
    "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  seated: "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400",
  cancelled:
    "bg-slate-100 dark:bg-surface-850 text-slate-500 dark:text-slate-400",
  no_show: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300",
};

// Format YYYY-MM-DD against the local timezone.
function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Reservations() {
  const [date, setDate] = useState(isoDate());
  const [statusFilter, setStatusFilter] = useState("all");
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);

  async function load() {
    // Pull a generous window then filter client-side, so the date and
    // status pickers feel instant.
    const from = new Date(date + "T00:00:00").toISOString();
    const toEnd = new Date(date + "T23:59:59").toISOString();
    const items = await api.reservations(`from=${from}&to=${toEnd}`);
    setList(items);
  }
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [date]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return list;
    return list.filter((r) => r.status === statusFilter);
  }, [list, statusFilter]);

  const counts = useMemo(() => {
    const c = {
      all: list.length,
      pending: 0,
      confirmed: 0,
      seated: 0,
      cancelled: 0,
      no_show: 0,
    };
    for (const r of list) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [list]);

  async function changeStatus(r, status) {
    await api.patchReservation(r._id, { status });
    load();
  }
  async function removeReservation(r) {
    if (!confirm(`Delete reservation for ${r.name}?`)) return;
    await api.deleteReservation(r._id);
    load();
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Reservations</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Bookings from the public widget plus walk-up reservations taken by
            staff.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input w-auto"
          />
          <button
            className="btn-primary"
            onClick={() =>
              setEditing({
                name: "",
                email: "",
                phone: "",
                partySize: 2,
                startsAt: `${date}T19:00`,
                durationMinutes: 90,
                notes: "",
                status: "confirmed",
              })
            }
          >
            + Add reservation
          </button>
        </div>
      </div>

      {/* Status pill row */}
      <div className="flex flex-wrap gap-2">
        {[["all", "All"], ...Object.entries(STATUS_LABELS)].map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={[
                "px-3 py-1.5 rounded-full text-sm font-medium border transition",
                statusFilter === key
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent"
                  : "bg-white dark:bg-surface-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/10",
              ].join(" ")}
            >
              {label}
              <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                {counts[key] ?? 0}
              </span>
            </button>
          )
        )}
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
              <tr>
                <th className="px-4 py-2 w-20">Time</th>
                <th className="px-4 py-2">Guest</th>
                <th className="px-4 py-2">Party</th>
                <th className="px-4 py-2">Table</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r._id}
                  className="border-t border-slate-100 dark:border-white/5 align-top"
                >
                  <td className="px-4 py-2 font-medium tabular-nums">
                    {fmtTime(r.startsAt)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.name}</div>
                    {r.source === "widget" && (
                      <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        via widget
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{r.partySize}</td>
                  <td className="px-4 py-2">
                    {r.table ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-medium">{r.table.label}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {r.table.room}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                    {r.email && (
                      <div className="truncate max-w-[160px]">{r.email}</div>
                    )}
                    {r.phone && <div>{r.phone}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 max-w-[220px]">
                    {r.notes ? (
                      <span className="line-clamp-2">{r.notes}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`badge ${STATUS_TONES[r.status]}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {r.status !== "seated" && r.status !== "cancelled" && (
                        <button
                          className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-surface-850 hover:bg-slate-200 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-200"
                          onClick={() => changeStatus(r, "seated")}
                        >
                          Seat
                        </button>
                      )}
                      {r.status === "pending" && (
                        <button
                          className="text-xs px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                          onClick={() => changeStatus(r, "confirmed")}
                        >
                          Confirm
                        </button>
                      )}
                      {r.status !== "no_show" && r.status !== "cancelled" && (
                        <button
                          className="text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                          onClick={() => changeStatus(r, "no_show")}
                        >
                          No-show
                        </button>
                      )}
                      <button
                        className="text-xs px-2 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                        onClick={() =>
                          setEditing({
                            ...r,
                            // <input type="datetime-local"> wants 'YYYY-MM-DDTHH:MM' (no tz, no seconds)
                            startsAt: new Date(r.startsAt)
                              .toISOString()
                              .slice(0, 16),
                            table: r.table?._id || "",
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded-lg text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        onClick={() => removeReservation(r)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan="8"
                    className="text-center py-10 text-slate-400 dark:text-slate-500"
                  >
                    No reservations for this day.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ReservationEditor
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}

function ReservationEditor({ editing, onClose, onSaved }) {
  const [draft, setDraft] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sync draft when the modal opens with new data.
  useEffect(() => {
    setDraft(editing);
    setError("");
  }, [editing]);

  if (!draft) return null;

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...draft,
        partySize: Number(draft.partySize) || 2,
        durationMinutes: Number(draft.durationMinutes) || 90,
        startsAt: new Date(draft.startsAt).toISOString(),
        table: draft.table || null,
      };
      await api.saveReservation(payload);
      onSaved();
    } catch (e) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!editing}
      onClose={onClose}
      title={draft._id ? "Edit reservation" : "New reservation"}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="col-span-2">
          <span className="text-slate-600 dark:text-slate-300">Guest name</span>
          <input
            className="input mt-1"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          <span className="text-slate-600 dark:text-slate-300">Email</span>
          <input
            className="input mt-1"
            type="email"
            value={draft.email || ""}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
        </label>
        <label>
          <span className="text-slate-600 dark:text-slate-300">Phone</span>
          <input
            className="input mt-1"
            value={draft.phone || ""}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          />
        </label>
        <label>
          <span className="text-slate-600 dark:text-slate-300">Party size</span>
          <input
            className="input mt-1"
            type="number"
            min="1"
            value={draft.partySize}
            onChange={(e) => setDraft({ ...draft, partySize: e.target.value })}
          />
        </label>
        <label>
          <span className="text-slate-600 dark:text-slate-300">
            Duration (min)
          </span>
          <input
            className="input mt-1"
            type="number"
            min="15"
            step="15"
            value={draft.durationMinutes || 90}
            onChange={(e) =>
              setDraft({ ...draft, durationMinutes: e.target.value })
            }
          />
        </label>
        <label className="col-span-2">
          <span className="text-slate-600 dark:text-slate-300">
            Date & time
          </span>
          <input
            className="input mt-1"
            type="datetime-local"
            value={draft.startsAt}
            onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
          />
        </label>
        <label>
          <span className="text-slate-600 dark:text-slate-300">Status</span>
          <select
            className="input mt-1"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2">
          <span className="text-slate-600 dark:text-slate-300">
            Notes / allergies
          </span>
          <textarea
            className="input mt-1"
            rows="2"
            value={draft.notes || ""}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </label>
        {error && (
          <div className="col-span-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

function EmbedHelp() {
  const [copiedKey, setCopiedKey] = useState("");
  // Cache-bust the iframe so when the manager re-saves a reservation
  // and scrolls back, the slot grid reflects the latest availability.
  const [reloadKey, setReloadKey] = useState(() => Date.now());
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://your-domain";

  // Recommended embed: a one-line script tag that pins a launcher pill
  // to the bottom-right of the host site and expands to the full booking
  // panel on click.
  const scriptSnippet = `<script src="${origin}/patronize.js" defer></script>`;

  // Fallback embed: an inline iframe for managers who want the booking
  // form to live in a specific spot (e.g., a dedicated /reserve page).
  const iframeSnippet = `<iframe
  src="${origin}/patronize.html?open=1"
  width="100%" height="720"
  style="border:0;max-width:440px;border-radius:16px"
  title="Reserve a table"
></iframe>`;

  async function copy(key, text) {
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 2000);
    } catch {}
  }

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">Patronize — live preview</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-prose">
            This is exactly what your customers see on your site: a "Make a
            reservation" pill pinned to the bottom-right that opens the full
            booking form on click. Bookings made here land in the table above
            with a "via widget" tag.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost text-xs"
            onClick={() => setReloadKey(Date.now())}
            title="Reload the preview"
          >
            ⟳ Reload
          </button>
          <a
            className="btn-ghost text-xs"
            href="/patronize.html"
            target="_blank"
            rel="noreferrer"
          >
            Open standalone ↗
          </a>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-5 items-start">
        {/* Live preview — uses ?open=1 so the panel is visible on first
            paint. On a real customer site (script embed) the panel is
            collapsed by default and a launcher pill sits in the corner. */}
        <div className="bg-slate-50 dark:bg-surface-950 rounded-2xl p-4 border border-slate-200 dark:border-white/5">
          <iframe
            key={reloadKey}
            src="/patronize.html?open=1"
            title="Patronize preview"
            width="100%"
            height="720"
            style={{
              border: 0,
              borderRadius: 16,
              display: "block",
              maxWidth: 440,
              margin: "0 auto",
              background: "transparent",
            }}
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 text-center">
            Preview opens with the panel expanded. On a live site, only the
            launcher pill shows until the visitor taps it.
          </p>
        </div>

        {/* Embed instructions */}
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Recommended — floating launcher
          </div>
          <pre className="p-3 rounded-xl bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-white/5 text-xs overflow-auto whitespace-pre-wrap">
            {scriptSnippet}
          </pre>
          <div className="mt-2 flex items-center gap-2">
            <button
              className="btn-ghost text-xs"
              onClick={() => copy("script", scriptSnippet)}
            >
              {copiedKey === "script" ? "Copied ✓" : "Copy snippet"}
            </button>
          </div>

          <div className="mt-5 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            How to use it
          </div>
          <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal pl-5">
            <li>
              Paste the snippet just before <code>&lt;/body&gt;</code> on any
              page of your site.
            </li>
            <li>A "Make a reservation" pill appears at the bottom-right.</li>
            <li>Visitors click it; the full booking panel slides up.</li>
            <li>
              Bookings appear instantly in the list above and on the floor plan.
            </li>
          </ol>

          <div className="mt-5 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Inline alternative — iframe
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Want the booking form embedded directly on a page (not as a floating
            launcher)? Use this instead:
          </p>
          <pre className="p-3 rounded-xl bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-white/5 text-xs overflow-auto whitespace-pre-wrap">
            {iframeSnippet}
          </pre>
          <div className="mt-2 flex items-center gap-2">
            <button
              className="btn-ghost text-xs"
              onClick={() => copy("iframe", iframeSnippet)}
            >
              {copiedKey === "iframe" ? "Copied ✓" : "Copy snippet"}
            </button>
          </div>

          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Hosting the widget on a different domain than your Patron API? Add{" "}
            <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-surface-850">
              data-api="https://your-patron-domain"
            </code>{" "}
            to the <code>&lt;script&gt;</code> tag (or append{" "}
            <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-surface-850">
              ?api=...
            </code>{" "}
            to the iframe <code>src</code>).
          </div>
        </div>
      </div>
    </section>
  );
}
