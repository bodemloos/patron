import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api } from "../api.js";
import { useT } from "../i18n/index.jsx";

/**
 * Schedule — week and month grid for shift planning.
 *
 * Week view: 7 columns, each column a day with all shifts stacked.
 * Month view: standard calendar grid (date numbers + compact shift
 * pills), greyed out-of-month cells, today highlight.
 *
 * Both views share the same `cursor` reference date and the same
 * `byDay` map; only the rendered shape and the prev/next stride
 * differ. The range loader expands the visible window so the month
 * view always shows complete weeks at the top + bottom of the grid.
 */
const VIEWS = ["week", "month"];

export default function Schedule() {
  const { t } = useT();
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(() => dayjs());
  const [staff, setStaff] = useState([]);
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);

  // Visible date range for the active view.
  const range = useMemo(() => {
    if (view === "week") {
      const start = cursor.startOf("week");
      return { start, end: start.add(7, "day") };
    }
    const monthStart = cursor.startOf("month");
    const start = monthStart.startOf("week");
    const end = cursor.endOf("month").endOf("week").add(1, "day");
    return { start, end };
  }, [view, cursor]);

  async function load() {
    const [st, sc] = await Promise.all([
      api.staff(),
      api.schedules(range.start.toISOString(), range.end.toISOString()),
    ]);
    setStaff(st);
    setList(sc);
  }
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [view, cursor]);

  // Bucket shifts by their YYYY-MM-DD start day.
  const byDay = useMemo(() => {
    const m = {};
    for (const s of list) {
      const k = dayjs(s.startsAt).format("YYYY-MM-DD");
      m[k] = m[k] || [];
      m[k].push(s);
    }
    // Sort each day by start time so pills read top-to-bottom in order.
    for (const k of Object.keys(m))
      m[k].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    return m;
  }, [list]);

  // Estimated cost for everything currently loaded.
  const cost = useMemo(() => {
    let h = 0,
      eur = 0;
    for (const s of list) {
      const hours = (new Date(s.endsAt) - new Date(s.startsAt)) / 36e5;
      h += hours;
      eur += hours * (s.staff?.hourlyRate || 0);
    }
    return { hours: Math.round(h * 10) / 10, eur: Math.round(eur) };
  }, [list]);

  function nav(dir) {
    if (view === "week") setCursor(cursor.add(dir * 7, "day"));
    else setCursor(cursor.add(dir, "month"));
  }
  function jumpToday() {
    setCursor(dayjs());
  }

  function quickAdd(day) {
    setEditing({
      staff: staff[0]?._id || "",
      startsAt: day.hour(17).minute(0).format("YYYY-MM-DDTHH:mm"),
      endsAt: day.hour(23).minute(0).format("YYYY-MM-DDTHH:mm"),
      role: "",
      note: "",
      published: true,
    });
  }
  function openEdit(s) {
    setEditing({
      ...s,
      startsAt: dayjs(s.startsAt).format("YYYY-MM-DDTHH:mm"),
      endsAt: dayjs(s.endsAt).format("YYYY-MM-DDTHH:mm"),
    });
  }

  async function save() {
    const payload = {
      ...editing,
      staff: editing.staff?._id || editing.staff,
      startsAt: new Date(editing.startsAt).toISOString(),
      endsAt: new Date(editing.endsAt).toISOString(),
    };
    await api.saveSchedule(payload);
    setEditing(null);
    load();
  }
  async function remove() {
    if (!editing._id) {
      setEditing(null);
      return;
    }
    if (!confirm("Delete this shift?")) return;
    await api.deleteSchedule(editing._id);
    setEditing(null);
    load();
  }

  const subtitle =
    view === "week"
      ? `Week of ${range.start.format("MMM D")} — ${range.start
          .add(6, "day")
          .format("MMM D")}`
      : cursor.format("MMMM YYYY");
  const periodLabel = view === "week" ? "week" : "month";

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{t('schedule.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
            {" · "}
            <span className="tabular-nums">
              {cost.hours}h planned · €{cost.eur} estimated {periodLabel}ly
              payroll
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-slate-100 dark:bg-surface-850 rounded-lg p-1 text-xs font-medium">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={[
                  "px-3 py-1 rounded-md transition",
                  view === v
                    ? "bg-white dark:bg-surface-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                ].join(" ")}
              >
                {t(`schedule.view.${v}`)}
              </button>
            ))}
          </div>
          <button className="btn-ghost" onClick={() => nav(-1)}>
            ← Prev
          </button>
          <button className="btn-ghost" onClick={jumpToday}>
            Today
          </button>
          <button className="btn-ghost" onClick={() => nav(1)}>
            Next →
          </button>
        </div>
      </div>

      {view === "week" ? (
        <WeekGrid
          start={range.start}
          byDay={byDay}
          onAdd={quickAdd}
          onEdit={openEdit}
        />
      ) : (
        <MonthGrid
          start={range.start}
          end={range.end}
          cursor={cursor}
          byDay={byDay}
          onAdd={quickAdd}
          onEdit={openEdit}
        />
      )}

      {editing && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="card p-5 w-full max-w-md space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-semibold">
              {editing._id ? t('schedule.modal.edit') : t('schedule.modal.new')}
            </div>
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Staff</span>
              <select
                className="input mt-1"
                value={editing.staff?._id || editing.staff || ""}
                onChange={(e) =>
                  setEditing({ ...editing, staff: e.target.value })
                }
              >
                {staff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label>
                <span className="text-slate-600 dark:text-slate-300">
                  Starts
                </span>
                <input
                  type="datetime-local"
                  className="input mt-1"
                  value={editing.startsAt}
                  onChange={(e) =>
                    setEditing({ ...editing, startsAt: e.target.value })
                  }
                />
              </label>
              <label>
                <span className="text-slate-600 dark:text-slate-300">Ends</span>
                <input
                  type="datetime-local"
                  className="input mt-1"
                  value={editing.endsAt}
                  onChange={(e) =>
                    setEditing({ ...editing, endsAt: e.target.value })
                  }
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                Role / note
              </span>
              <input
                className="input mt-1"
                value={editing.note || ""}
                onChange={(e) =>
                  setEditing({ ...editing, note: e.target.value })
                }
                placeholder="e.g. floor lead"
              />
            </label>
            <div className="flex justify-between pt-2">
              <button
                className="btn-ghost text-red-600 dark:text-red-400"
                onClick={remove}
              >
                {editing._id ? t('common.delete') : t('common.cancel')}
              </button>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setEditing(null)}>
                  {t('common.close')}
                </button>
                <button className="btn-primary" onClick={save}>
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Week view — 7 columns of day cards.
// ---------------------------------------------------------------------
function WeekGrid({ start, byDay, onAdd, onEdit }) {
  const days = [];
  for (let i = 0; i < 7; i++) days.push(start.add(i, "day"));
  return (
    <section className="card overflow-x-auto">
      <div className="grid grid-cols-7 min-w-[840px]">
        {days.map((d, i) => {
          const isToday = d.isSame(dayjs(), "day");
          return (
            <div
              key={i}
              className="border-r border-slate-100 dark:border-white/5 last:border-r-0"
            >
              <div
                className={`px-3 py-2 text-xs flex items-center justify-between border-b border-slate-100 dark:border-white/5 ${
                  isToday ? "bg-brand-50 dark:bg-brand-500/10" : ""
                }`}
              >
                <span
                  className={`font-medium ${
                    isToday ? "text-brand-700 dark:text-brand-400" : ""
                  }`}
                >
                  {d.format("ddd D")}
                </span>
                <button
                  className="text-brand-700 dark:text-brand-400 text-xs hover:underline"
                  onClick={() => onAdd(d)}
                >
                  +
                </button>
              </div>
              <div className="p-2 space-y-1.5 min-h-[120px]">
                {(byDay[d.format("YYYY-MM-DD")] || []).map((s) => (
                  <button
                    key={s._id}
                    onClick={() => onEdit(s)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400 hover:brightness-110"
                    title={s.note}
                  >
                    <div className="font-medium truncate">{s.staff?.name}</div>
                    <div className="text-[10px] opacity-80 tabular-nums">
                      {dayjs(s.startsAt).format("HH:mm")}–
                      {dayjs(s.endsAt).format("HH:mm")}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Month view — calendar grid, 7 cols × N rows. Cells outside the
// current month are dimmed; today is outlined; up to 3 shift pills per
// cell with an overflow indicator if there's more.
// ---------------------------------------------------------------------
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_PILLS_PER_CELL = 3;

function MonthGrid({ start, end, cursor, byDay, onAdd, onEdit }) {
  const days = useMemo(() => {
    const out = [];
    let d = start;
    while (d.isBefore(end)) {
      out.push(d);
      d = d.add(1, "day");
    }
    return out;
  }, [start, end]);

  const month = cursor.month();
  const today = dayjs();

  return (
    <section className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-white/5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-3 py-2 text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const dayKey = d.format("YYYY-MM-DD");
          const shifts = byDay[dayKey] || [];
          const inMonth = d.month() === month;
          const isToday = d.isSame(today, "day");
          const overflow = Math.max(0, shifts.length - MAX_PILLS_PER_CELL);
          return (
            <div
              key={dayKey}
              onClick={(e) => {
                // Background click on the cell (not on a pill) → quick-add.
                if (e.target === e.currentTarget || e.target.dataset.cellbg)
                  onAdd(d);
              }}
              data-cellbg
              className={[
                "relative border-r border-b border-slate-100 dark:border-white/5 last:border-r-0",
                "min-h-[112px] p-1.5 cursor-pointer transition-colors",
                inMonth ? "" : "bg-slate-50/60 dark:bg-surface-950/40",
                "hover:bg-slate-50 dark:hover:bg-surface-850/60",
                isToday ? "ring-2 ring-inset ring-brand-500/60" : "",
              ].join(" ")}
            >
              <div
                data-cellbg
                className="flex items-center justify-between mb-1 px-1"
              >
                <span
                  data-cellbg
                  className={[
                    "text-xs tabular-nums",
                    inMonth
                      ? "text-slate-700 dark:text-slate-300"
                      : "text-slate-400 dark:text-slate-600",
                    isToday
                      ? "font-semibold text-brand-700 dark:text-brand-400"
                      : "",
                  ].join(" ")}
                >
                  {d.format("D")}
                </span>
                {shifts.length > 0 && (
                  <span
                    data-cellbg
                    className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums"
                  >
                    {shifts.length}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {shifts.slice(0, MAX_PILLS_PER_CELL).map((s) => (
                  <button
                    key={s._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(s);
                    }}
                    className="w-full text-left text-[11px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400 hover:brightness-110 truncate"
                    title={`${s.staff?.name || ""} · ${dayjs(s.startsAt).format(
                      "HH:mm"
                    )}–${dayjs(s.endsAt).format("HH:mm")}${
                      s.note ? `\n${s.note}` : ""
                    }`}
                  >
                    <span className="tabular-nums opacity-70 mr-1">
                      {dayjs(s.startsAt).format("HH:mm")}
                    </span>
                    {firstName(s.staff?.name)}
                  </button>
                ))}
                {overflow > 0 && (
                  <div
                    data-cellbg
                    className="text-[10px] text-slate-500 dark:text-slate-400 px-1.5"
                  >
                    +{overflow} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function firstName(n) {
  return (n || "").trim().split(/\s+/)[0] || "";
}
