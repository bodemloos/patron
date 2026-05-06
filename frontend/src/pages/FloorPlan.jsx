import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtEur } from '../api.js';
import { useStore } from '../store.js';
import POSPanel from '../components/POSPanel.jsx';
import TableQRModal from '../components/TableQRModal.jsx';
import { subscribe } from '../lib/events.js';
import { useT } from '../i18n/index.jsx';

const CANVAS_W = 1000;
const CANVAS_H = 700;

const FALLBACK_ROOM_COLOR = '#94a3b8'; // slate-400

const ZONES = ['indoor', 'outdoor'];
const ZONE_STORAGE_KEY = 'patron.floor.zone';
const DEFAULT_ZONE = 'indoor';
// Treat tables with no `zone` set (older records) as indoor.
const tableZone = (t) => (t && t.zone === 'outdoor' ? 'outdoor' : 'indoor');

// Derive width/height/shape automatically from the seat count.
// 1 seat → small round (bar stool); 2 seats → larger round;
// 3+ seats → square table that grows wider with more seats.
function dimsForSeats(seats) {
  const n = Math.max(1, Number(seats) || 1);
  if (n === 1) return { w: 60,  h: 60,  shape: 'round'  };
  if (n === 2) return { w: 80,  h: 80,  shape: 'round'  };
  if (n === 3) return { w: 100, h: 80,  shape: 'square' };
  if (n === 4) return { w: 120, h: 80,  shape: 'square' };
  if (n <= 6) return { w: 150, h: 90,  shape: 'square' };
  if (n <= 8) return { w: 180, h: 100, shape: 'square' };
  return        { w: Math.min(240, 180 + (n - 8) * 12), h: 110, shape: 'square' };
}

export default function FloorPlan() {
  const role = useStore((s) => s.role);
  const { t } = useT();
  const [tables, setTables] = useState([]);
  const [roomDefs, setRoomDefs] = useState([]); // [{_id, name, color}]
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(null); // table id
  const [draft, setDraft] = useState(null); // { tableId, dx, dy }
  const [posTableId, setPosTableId] = useState(null); // table whose POS slide-over is open
  const [qrTable, setQrTable] = useState(null); // table whose QR code modal is open
  const [zone, setZoneState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_ZONE;
    const saved = window.localStorage?.getItem(ZONE_STORAGE_KEY);
    return ZONES.includes(saved) ? saved : DEFAULT_ZONE;
  });
  const containerRef = useRef(null);

  // Floor-plan view transform (zoom + pan). Wraps every renderable inside
  // the SVG. Pinch / wheel / +/- buttons all converge on this state.
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const pointersRef = useRef(new Map());        // pointerId → {x, y} client coords
  const pinchRef = useRef(null);                // pinch session start metrics
  const panRef = useRef(null);                  // single-finger pan session

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // Persist the active zone across reloads.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(ZONE_STORAGE_KEY, zone);
    }
  }, [zone]);

  // Switching zone via the top toggle: clear any selection from the
  // previous view so the side panel doesn't reference an invisible table.
  function switchZone(z) {
    if (!ZONES.includes(z) || z === zone) return;
    setZone(z);
    setSelected(null);
  }
  // Internal setter — direct callers (e.g. updateSelected) skip the
  // selection-clear, so a manager moving a table to the other zone
  // follows the table over and keeps it selected.
  function setZone(z) {
    if (ZONES.includes(z)) setZoneState(z);
  }

  // Tables visible in the current zone. Drag/edit all happen against
  // the full `tables` array, but anything user-facing reads from this.
  const visibleTables = useMemo(
    () => tables.filter((t) => tableZone(t) === zone),
    [tables, zone]
  );

  // Counts per zone for the toggle badge.
  const zoneCounts = useMemo(() => {
    const c = { indoor: 0, outdoor: 0 };
    for (const t of tables) c[tableZone(t)] += 1;
    return c;
  }, [tables]);

  async function load() {
    const [tbs, rms] = await Promise.all([api.tables(), api.rooms()]);
    setTables(tbs);
    setRoomDefs(rms);
  }
  useEffect(() => { load(); }, []);

  // Map room name -> color (falls back to slate)
  const roomColorByName = useMemo(() => {
    const m = {};
    for (const r of roomDefs) m[r.name] = r.color || FALLBACK_ROOM_COLOR;
    return m;
  }, [roomDefs]);
  // Real-time refresh via SSE when not editing — replaces the previous
  // 8-second polling. The server pushes whenever an order or reservation
  // changes; we just refetch the slice we display.
  useEffect(() => {
    if (editMode) return;
    const off = subscribe(
      ['order:updated', 'order:sent', 'order:paid', 'order:cancelled', 'reservation:created', 'reservation:updated'],
      () => load()
    );
    return off;
  }, [editMode]);

  // Authoritative list of room names from the Room collection,
  // plus any orphan names found on tables (defensive — shouldn't happen normally).
  const rooms = useMemo(() => {
    const set = new Set(roomDefs.map((r) => r.name));
    for (const t of tables) if (t.room) set.add(t.room);
    return Array.from(set);
  }, [roomDefs, tables]);

  function tableStatus(t) {
    if (!t.openOrders?.length) return 'free';
    const hasSent = t.openOrders.some((o) => o.status === 'sent');
    return hasSent ? 'sent' : 'open';
  }

  // Status palette tuned for the neutral-charcoal canvas. If you later
  // add a light/dark toggle, swap to a CSS-variable-driven palette so
  // these follow `.dark`.
  function statusColor(status) {
    switch (status) {
      case 'free':  return { fill: '#2c2c2e', stroke: '#4d4d51', text: '#e5e5e5' }; // surface-800 / surface-600 / neutral light
      case 'open':  return { fill: '#3a2208', stroke: '#f59e0b', text: '#fde68a' }; // amber shadow / amber-500 / amber-200
      case 'sent':  return { fill: '#5a2208', stroke: '#fb923c', text: '#ffedd5' }; // orange shadow / orange-400 / orange-100
      default:      return { fill: '#2c2c2e', stroke: '#4d4d51', text: '#e5e5e5' };
    }
  }

  // Client coords → coords inside the transformed group (where tables
  // live). Inverts the active view transform so drag interactions still
  // hit the right spot at any zoom/pan.
  function svgPoint(e) {
    const svg = containerRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const vbX = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const vbY = (e.clientY - rect.top) * (CANVAS_H / rect.height);
    return { x: (vbX - view.x) / view.scale, y: (vbY - view.y) / view.scale };
  }

  // Convert client coords into the SVG viewBox coordinate space (no
  // inverse transform applied). Used for zoom anchoring math, where we
  // want a stable point in the iframe-of-the-canvas.
  function clientToViewBox(clientX, clientY) {
    const svg = containerRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (CANVAS_W / rect.width),
      y: (clientY - rect.top) * (CANVAS_H / rect.height),
    };
  }

  // Zoom keeping `anchor` (in viewBox coords) under the cursor / pinch
  // midpoint, by adjusting both scale and translate.
  function zoomTo(newScale, anchor) {
    const s = clamp(newScale, 0.5, 4);
    setView((v) => ({
      scale: s,
      x: anchor.x - (anchor.x - v.x) * (s / v.scale),
      y: anchor.y - (anchor.y - v.y) * (s / v.scale),
    }));
  }
  function zoomBy(factor) {
    zoomTo(view.scale * factor, { x: CANVAS_W / 2, y: CANVAS_H / 2 });
  }
  function resetView() { setView({ x: 0, y: 0, scale: 1 }); }

  // ---- Multi-touch pinch + single-finger pan + wheel zoom -----------
  // Pan threshold (px in client coords). Below this, a single-pointer
  // drag is treated as a tap so table click handlers still fire.
  const PAN_THRESHOLD = 6;

  function onSvgPointerDown(e) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.hypot(b.x - a.x, b.y - a.y),
        midClient: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        startView: view,
      };
      // Once a pinch starts, abort any pending single-finger pan.
      panRef.current = null;
    } else if (pointersRef.current.size === 1) {
      // Stage a possible pan session — only commits after the user
      // moves more than PAN_THRESHOLD pixels AND only when zoomed in,
      // so tap-to-open-POS keeps working at default zoom.
      panRef.current = {
        pointerId: e.pointerId,
        startClient: { x: e.clientX, y: e.clientY },
        startView: view,
        moved: false,
      };
    }
  }

  function onSvgPointerMoveZoom(e) {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch takes priority over single-finger pan.
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const newDist = Math.hypot(b.x - a.x, b.y - a.y);
      const newMidClient = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const ratio = newDist / pinchRef.current.distance;
      const newScale = clamp(pinchRef.current.startView.scale * ratio, 0.5, 4);
      const startMidVb = clientToViewBox(pinchRef.current.midClient.x, pinchRef.current.midClient.y);
      const newMidVb = clientToViewBox(newMidClient.x, newMidClient.y);
      const sv = pinchRef.current.startView;
      setView({
        scale: newScale,
        x: newMidVb.x - (startMidVb.x - sv.x) * (newScale / sv.scale),
        y: newMidVb.y - (startMidVb.y - sv.y) * (newScale / sv.scale),
      });
      return;
    }

    // Single-finger pan — only when zoomed in past 1× so default-view
    // taps don't accidentally drift the canvas.
    if (panRef.current && panRef.current.pointerId === e.pointerId) {
      const ps = panRef.current;
      if (ps.startView.scale <= 1.01) return;
      const dx = e.clientX - ps.startClient.x;
      const dy = e.clientY - ps.startClient.y;
      if (!ps.moved) {
        if (Math.hypot(dx, dy) < PAN_THRESHOLD) return;
        ps.moved = true;
        // Capture so the gesture survives the finger leaving any
        // child element (a table, a room band, etc.).
        containerRef.current?.setPointerCapture?.(e.pointerId);
      }
      const rect = containerRef.current.getBoundingClientRect();
      setView({
        scale: ps.startView.scale,
        x: ps.startView.x + dx * (CANVAS_W / rect.width),
        y: ps.startView.y + dy * (CANVAS_H / rect.height),
      });
    }
  }

  function onSvgPointerUpZoom(e) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (panRef.current && panRef.current.pointerId === e.pointerId) {
      panRef.current = null;
    }
  }
  function onWheel(e) {
    if (!e.deltaY) return;
    e.preventDefault?.();
    const anchor = clientToViewBox(e.clientX, e.clientY);
    // 1 deltaY tick (~100) ≈ ±10% zoom — feels right on mac trackpads.
    const factor = Math.exp(-e.deltaY * 0.001);
    zoomTo(view.scale * factor, anchor);
  }

  function onTablePointerDown(e, t) {
    if (!editMode || role !== 'manager') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = svgPoint(e);
    setSelected(t._id);
    setDraft({ tableId: t._id, dx: p.x - t.x, dy: p.y - t.y });
  }

  function onPointerMove(e) {
    if (!draft) return;
    const p = svgPoint(e);
    setTables((tbs) =>
      tbs.map((t) =>
        t._id === draft.tableId
          ? {
              ...t,
              x: Math.max(0, Math.min(CANVAS_W - t.w, p.x - draft.dx)),
              y: Math.max(0, Math.min(CANVAS_H - t.h, p.y - draft.dy)),
            }
          : t
      )
    );
  }

  function onPointerUp() {
    setDraft(null);
  }

  function onTableClick(t) {
    if (editMode) {
      setSelected(t._id);
      return;
    }
    setPosTableId(t._id);
  }

  function closePos() {
    setPosTableId(null);
    load();
  }

  // Close slide-over with Escape
  useEffect(() => {
    if (!posTableId) return;
    const onKey = (e) => e.key === 'Escape' && closePos();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [posTableId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveLayout() {
    await api.bulkPositionTables(
      tables.map((t) => ({
        _id: t._id,
        x: t.x, y: t.y, w: t.w, h: t.h, seats: t.seats, label: t.label, shape: t.shape, room: t.room,
        zone: tableZone(t),
      }))
    );
    setEditMode(false);
    load();
  }

  function updateSelected(patch) {
    if (!selected) return;
    // When seats change, resize w/h but keep the user-chosen shape.
    let next = patch;
    if (patch.seats !== undefined) {
      const { w, h } = dimsForSeats(patch.seats);
      next = { ...patch, w, h };
    }
    // Moving a table between zones: follow it over so it stays selected
    // and the manager doesn't watch it disappear from view.
    if (patch.zone && patch.zone !== zone) {
      setZone(patch.zone);
    }
    setTables((tbs) => tbs.map((t) => (t._id === selected ? { ...t, ...next } : t)));
  }

  async function addTable() {
    const seats = 2;
    // Number new tables off the count within the current zone, so labels
    // like "T1/T2…" and "P1/P2…" can be reused per zone if you want.
    const sameZoneCount = tables.filter((t) => tableZone(t) === zone).length;
    const labelPrefix = zone === 'outdoor' ? 'P' : 'T';
    const created = await api.saveTable({
      label: `${labelPrefix}${sameZoneCount + 1}`,
      seats,
      x: 100, y: 100,
      ...dimsForSeats(seats),
      room: rooms[0] || (zone === 'outdoor' ? 'Terrace' : 'Main'),
      zone,
    });
    setTables([...tables, { ...created, openOrders: [] }]);
    setSelected(created._id);
  }

  async function markFree(tableId) {
    if (!confirm('Mark this table as free? Any unpaid orders will be cancelled.')) return;
    await api.freeTable(tableId);
    load();
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!confirm('Delete this table?')) return;
    await api.deleteTable(selected);
    setSelected(null);
    load();
  }

  // --- Room management ---------------------------------------------------

  async function createRoom(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    if (rooms.includes(trimmed)) return roomDefs.find((r) => r.name === trimmed) || null;
    const created = await api.saveRoom({ name: trimmed, color: '#94a3b8' });
    setRoomDefs((prev) => [...prev, created]);
    return created;
  }

  async function updateRoomColor(roomDef, color) {
    // Optimistic update
    setRoomDefs((prev) => prev.map((r) => (r._id === roomDef._id ? { ...r, color } : r)));
    try {
      await api.saveRoom({ ...roomDef, color });
    } catch (e) {
      // revert on failure
      setRoomDefs((prev) => prev.map((r) => (r._id === roomDef._id ? roomDef : r)));
      alert(e.message || 'Failed to save room color');
    }
  }

  async function removeRoom(roomDef) {
    const inUse = tables.some((t) => t.room === roomDef.name);
    if (inUse) {
      alert(`Can't delete "${roomDef.name}" — it still has tables.`);
      return;
    }
    if (!confirm(`Delete room "${roomDef.name}"?`)) return;
    try {
      await api.deleteRoom(roomDef._id);
      setRoomDefs((prev) => prev.filter((r) => r._id !== roomDef._id));
    } catch (e) {
      alert(e.message || 'Failed to delete room');
    }
  }

  const sel = tables.find((t) => t._id === selected);

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold">{t('floor.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {role === 'waiter'
              ? t('floor.sub.waiter')
              : editMode
                ? t('floor.sub.edit')
                : t('floor.sub.tap')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
          <ZoneToggle zone={zone} onChange={switchZone} counts={zoneCounts} />
          <div className="hidden sm:block"><Legend /></div>
          {role === 'manager' && (
            editMode ? (
              <>
                <Link to="/qr-sheet" className="btn-ghost text-xs">Print all QR codes ↗</Link>
                <button className="btn-ghost" onClick={() => { setEditMode(false); load(); }}>Cancel</button>
                <button className="btn-primary" onClick={saveLayout}>Save layout</button>
              </>
            ) : (
              <button className="btn-ghost" onClick={() => setEditMode(true)}>Edit layout</button>
            )
          )}
        </div>
      </div>

      <ServiceRequestsBanner />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-9 card overflow-hidden relative">
          <svg
            ref={containerRef}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="w-full h-[55vh] sm:h-[65vh] lg:h-[70vh] block bg-slate-50 dark:bg-surface-950 touch-none select-none"
            onPointerDown={onSvgPointerDown}
            onPointerMove={(e) => { onSvgPointerMoveZoom(e); onPointerMove(e); }}
            onPointerUp={(e) => { onSvgPointerUpZoom(e); onPointerUp(e); }}
            onPointerCancel={(e) => { onSvgPointerUpZoom(e); onPointerUp(e); }}
            onPointerLeave={(e) => { onSvgPointerUpZoom(e); onPointerUp(e); }}
            onWheel={onWheel}
          >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {/* Rooms backgrounds — only span tables in the active zone */}
            {renderRoomBands(visibleTables, roomColorByName)}

            {/* Empty-zone hint */}
            {visibleTables.length === 0 && (
              <g>
                <text
                  x={CANVAS_W / 2}
                  y={CANVAS_H / 2 - 8}
                  textAnchor="middle"
                  fontSize={20}
                  fontWeight={600}
                  fill="#94a3b8"
                >
                  No {zone} tables yet
                </text>
                <text
                  x={CANVAS_W / 2}
                  y={CANVAS_H / 2 + 18}
                  textAnchor="middle"
                  fontSize={13}
                  fill="#94a3b8"
                >
                  {role === 'manager'
                    ? 'Switch to Edit layout to add one.'
                    : 'Ask a manager to add tables here.'}
                </text>
              </g>
            )}

            {/* Tables */}
            {visibleTables.map((t) => {
              const status = tableStatus(t);
              const c = statusColor(status);
              const isSel = selected === t._id;
              const cx = t.x + t.w / 2;
              const cy = t.y + t.h / 2;
              const total = (t.openOrders || []).reduce((s, o) => s + (o.subtotal || 0), 0);
              return (
                <g
                  key={t._id}
                  style={{ cursor: editMode ? 'move' : 'pointer' }}
                  onPointerDown={(e) => onTablePointerDown(e, t)}
                  onClick={() => onTableClick(t)}
                >
                  {t.shape === 'round' ? (
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={t.w / 2}
                      ry={t.h / 2}
                      fill={c.fill}
                      stroke={isSel ? '#f97316' : c.stroke}
                      strokeWidth={isSel ? 3 : 2}
                    />
                  ) : (
                    <rect
                      x={t.x}
                      y={t.y}
                      width={t.w}
                      height={t.h}
                      rx={10}
                      fill={c.fill}
                      stroke={isSel ? '#f97316' : c.stroke}
                      strokeWidth={isSel ? 3 : 2}
                    />
                  )}
                  <text
                    x={cx}
                    y={cy - 4}
                    textAnchor="middle"
                    fontWeight={700}
                    fontSize={18}
                    fill={c.text}
                  >
                    {t.label}
                  </text>
                  <text
                    x={cx}
                    y={cy + 14}
                    textAnchor="middle"
                    fontSize={11}
                    fill={c.text}
                    opacity={0.7}
                  >
                    {t.seats} seats
                  </text>
                  {total > 0 && (
                    <text
                      x={cx}
                      y={cy + 28}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      fill="#fde68a"
                    >
                      {fmtEur(total)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
          </svg>

          {/* Zoom controls — overlay top-right of the canvas. Mobile
              users can also pinch; desktop users can use the wheel. */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            <button
              onClick={() => zoomBy(1.25)}
              className="w-9 h-9 rounded-lg bg-white/90 dark:bg-surface-900/90 backdrop-blur border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-lg font-medium leading-none shadow-sm hover:bg-white dark:hover:bg-surface-800"
              title="Zoom in"
              aria-label="Zoom in"
            >+</button>
            <button
              onClick={() => zoomBy(0.8)}
              className="w-9 h-9 rounded-lg bg-white/90 dark:bg-surface-900/90 backdrop-blur border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-lg font-medium leading-none shadow-sm hover:bg-white dark:hover:bg-surface-800"
              title="Zoom out"
              aria-label="Zoom out"
            >−</button>
            <button
              onClick={resetView}
              className="w-9 h-9 rounded-lg bg-white/90 dark:bg-surface-900/90 backdrop-blur border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs font-medium tabular-nums leading-none shadow-sm hover:text-slate-900 dark:hover:text-slate-100"
              title="Reset zoom"
              aria-label="Reset zoom"
            >{Math.round(view.scale * 100)}%</button>
          </div>
        </div>

        {/* Side panel */}
        <div className="col-span-12 lg:col-span-3 space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Summary</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{zone}</div>
            </div>
            <SummaryStats tables={visibleTables} />
          </div>

          {/* Active tables list — quick actions without opening POS */}
          {!editMode && (
            <div className="card">
              <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Active tables</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {visibleTables.filter((t) => (t.openOrders || []).length).length}
                </span>
              </div>
              {visibleTables.filter((t) => (t.openOrders || []).length).length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-400 dark:text-slate-500 text-center">
                  All {zone} tables are free.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-white/5 max-h-[50vh] overflow-auto">
                  {visibleTables
                    .filter((t) => (t.openOrders || []).length)
                    .map((t) => {
                      const total = (t.openOrders || []).reduce((s, o) => s + (o.subtotal || 0), 0);
                      const status = tableStatus(t);
                      return (
                        <li key={t._id} className="px-4 py-2 flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${status === 'sent' ? 'bg-orange-500' : 'bg-amber-500'}`}
                            title={status === 'sent' ? 'Sent to kitchen' : 'Open'}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm leading-tight">{t.label}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{fmtEur(total)} · {t.room}</div>
                          </div>
                          <button
                            className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-surface-850 hover:bg-slate-200 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-200"
                            onClick={() => setPosTableId(t._id)}
                            title="Open POS"
                          >
                            POS
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                            onClick={() => markFree(t._id)}
                            title="Cancel unpaid items and free the table"
                          >
                            Free
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          )}
          {role === 'manager' && editMode && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Selected table</div>
                <button className="text-xs text-brand-700 dark:text-brand-400 hover:underline" onClick={addTable}>+ Add table</button>
              </div>
              {!sel && <div className="text-sm text-slate-400 dark:text-slate-500">Click a table to edit it.</div>}
              {sel && (
                <div className="space-y-2 text-sm">
                  <label className="block">
                    <span className="text-slate-600 dark:text-slate-300">Label</span>
                    <input className="input mt-1" value={sel.label}
                      onChange={(e) => updateSelected({ label: e.target.value })} />
                  </label>
                  <label className="block">
                    <span className="text-slate-600 dark:text-slate-300">Room</span>
                    <select
                      className="input mt-1"
                      value={rooms.includes(sel.room) ? sel.room : ''}
                      onChange={async (e) => {
                        const v = e.target.value;
                        if (v === '__new__') {
                          const name = prompt('New room name')?.trim();
                          if (!name) return;
                          await createRoom(name);
                          updateSelected({ room: name });
                        } else {
                          updateSelected({ room: v });
                        }
                      }}
                    >
                      {!rooms.includes(sel.room) && sel.room && (
                        <option value="">{sel.room}</option>
                      )}
                      {rooms.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                      <option value="__new__">+ New room…</option>
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-slate-600 dark:text-slate-300">Seats</span>
                      <input className="input mt-1" type="number" min="1" value={sel.seats}
                        onChange={(e) => updateSelected({ seats: Number(e.target.value) })} />
                    </label>
                    <label className="block">
                      <span className="text-slate-600 dark:text-slate-300">Shape</span>
                      <select className="input mt-1" value={sel.shape || 'square'}
                        onChange={(e) => updateSelected({ shape: e.target.value })}>
                        <option value="round">Round</option>
                        <option value="square">Square</option>
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-slate-600 dark:text-slate-300">Zone</span>
                    <select
                      className="input mt-1"
                      value={tableZone(sel)}
                      onChange={(e) => updateSelected({ zone: e.target.value })}
                    >
                      <option value="indoor">Indoor</option>
                      <option value="outdoor">Outdoor</option>
                    </select>
                  </label>
                  <span className="text-xs text-slate-400 dark:text-slate-500 -mt-1 block">Size scales with seat count automatically.</span>
                  <button
                    className="btn-ghost w-full justify-center mt-2"
                    onClick={() => setQrTable(sel)}
                    disabled={!sel._id}
                    title={!sel._id ? 'Save the layout first to generate a QR code' : 'Print or download the QR code for this table'}
                  >
                    QR code for table-side ordering
                  </button>
                  <button className="btn-danger w-full justify-center mt-2" onClick={deleteSelected}>Delete table</button>
                </div>
              )}
            </div>
          )}

          {role === 'manager' && editMode && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Rooms</div>
                <button
                  className="text-xs text-brand-700 dark:text-brand-400 hover:underline"
                  onClick={async () => {
                    const name = prompt('New room name')?.trim();
                    if (name) await createRoom(name);
                  }}
                >
                  + Add room
                </button>
              </div>
              <ul className="space-y-2">
                {roomDefs.map((r) => {
                  const tableCount = tables.filter((t) => t.room === r.name).length;
                  return (
                    <li key={r._id} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={r.color || FALLBACK_ROOM_COLOR}
                        onChange={(e) => updateRoomColor(r, e.target.value)}
                        className="w-8 h-8 rounded border border-slate-200 dark:border-white/5 bg-white dark:bg-surface-900 cursor-pointer"
                        title="Room color"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.name}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {tableCount} table{tableCount === 1 ? '' : 's'}
                        </div>
                      </div>
                      <button
                        onClick={() => removeRoom(r)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm disabled:opacity-30"
                        disabled={tableCount > 0}
                        title={tableCount > 0 ? 'Has tables — move them first' : 'Delete room'}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
                {!roomDefs.length && (
                  <li className="text-sm text-slate-400 dark:text-slate-500">No rooms yet.</li>
                )}
              </ul>
            </div>
          )}

          {!editMode && sel && (
            <div className="card p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Table {sel.label}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">{sel.room} · {sel.seats} seats</div>
              {sel.openOrders?.length ? (
                <div className="space-y-1 text-sm">
                  {sel.openOrders.map((o) => (
                    <div key={o._id} className="flex justify-between">
                      <span className="capitalize">{o.status}</span>
                      <span className="font-medium">{fmtEur(o.subtotal)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400 dark:text-slate-500">No active orders.</div>
              )}
              <button className="btn-primary w-full justify-center mt-3" onClick={() => setPosTableId(sel._id)}>
                Open POS
              </button>
              {sel.openOrders?.length > 0 && (
                <button
                  className="btn-ghost w-full justify-center mt-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => markFree(sel._id)}
                >
                  Mark table as free
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over POS panel */}
      <PosSlideOver tableId={posTableId} onClose={closePos} />
      <TableQRModal table={qrTable} onClose={() => setQrTable(null)} />
    </div>
  );
}

function PosSlideOver({ tableId, onClose }) {
  const open = !!tableId;
  return (
    <>
      {/* Backdrop — only visible on tablet+ where the sheet doesn't cover everything */}
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity hidden sm:block
                    ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      {/* Bottom sheet — full screen on mobile, peek-able on sm+ */}
      <div
        className={`fixed z-40 bg-white dark:bg-surface-900 shadow-2xl transition-transform duration-300 ease-out flex flex-col
                    inset-x-0 bottom-0 top-0
                    sm:top-auto sm:max-h-[88vh] sm:rounded-t-2xl sm:border-t sm:border-slate-200
                    ${open ? 'translate-y-0' : 'translate-y-full'}`}
        role="dialog"
        aria-modal="true"
      >
        {open && (
          <POSPanel
            tableId={tableId}
            onClose={onClose}
            onPaid={onClose}
            embedded
          />
        )}
      </div>
    </>
  );
}

function renderRoomBands(tables, roomColorByName) {
  // Compute bounding box per room and draw a soft band behind tables
  const groups = {};
  tables.forEach((t) => {
    const r = t.room || 'Main';
    const g = groups[r] || { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
    g.x1 = Math.min(g.x1, t.x - 12);
    g.y1 = Math.min(g.y1, t.y - 22);
    g.x2 = Math.max(g.x2, t.x + t.w + 12);
    g.y2 = Math.max(g.y2, t.y + t.h + 12);
    groups[r] = g;
  });
  return Object.entries(groups).map(([room, g]) => {
    const color = (roomColorByName && roomColorByName[room]) || FALLBACK_ROOM_COLOR;
    return (
      <g key={room}>
        <rect
          x={g.x1} y={g.y1} width={g.x2 - g.x1} height={g.y2 - g.y1}
          rx={14}
          fill={color}
          fillOpacity={0.10}
          stroke={color}
          strokeOpacity={0.45}
          strokeWidth={1.5}
        />
        <text x={g.x1 + 12} y={g.y1 + 16} fontSize={12} fontWeight={600} fill={color} opacity={0.9}>
          {room}
        </text>
      </g>
    );
  });
}

function SummaryStats({ tables }) {
  const open = tables.filter((t) => (t.openOrders || []).length > 0).length;
  const free = tables.length - open;
  const totalOpen = tables.reduce(
    (s, t) => s + (t.openOrders || []).reduce((a, o) => a + (o.subtotal || 0), 0),
    0
  );
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <Stat label="Free" value={free} />
      <Stat label="Active" value={open} />
      <Stat label="Open €" value={fmtEur(totalOpen)} />
    </div>
  );
}
function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 dark:bg-surface-950 rounded-lg p-2 text-center">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function ZoneToggle({ zone, onChange, counts }) {
  return (
    <div
      role="tablist"
      aria-label="Floor zone"
      className="flex bg-slate-100 dark:bg-surface-850 rounded-lg p-1 text-xs font-medium"
    >
      {ZONES.map((z) => {
        const active = zone === z;
        return (
          <button
            key={z}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(z)}
            className={[
              'px-3 py-1 rounded-md capitalize transition flex items-center gap-1.5',
              active ? 'bg-white dark:bg-surface-900 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
            ].join(' ')}
          >
            <ZoneIcon zone={z} className="w-3.5 h-3.5" />
            <span>{z}</span>
            {typeof counts?.[z] === 'number' && (
              <span className={`text-[10px] tabular-nums ${active ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'}`}>
                {counts[z]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ZoneIcon({ zone, className = '' }) {
  // Indoor: little house / roof. Outdoor: little sun.
  if (zone === 'outdoor') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

/**
 * ServiceRequestsBanner — small live inbox of pending QR-menu
 * service requests ("call the waiter", "bring the bill"). Subscribes
 * to the SSE channel so a guest's tap shows up in real time. Hides
 * itself when there's nothing pending so it stays out of the way on
 * a quiet shift.
 */
function ServiceRequestsBanner() {
  const { t } = useT();
  const [list, setList] = useState([]);

  async function load() {
    try {
      setList(await api.tableRequests('pending'));
    } catch (e) { /* ignore — silently empty */ }
  }
  useEffect(() => {
    load();
    const off = subscribe(
      ['table-request:created', 'table-request:updated'],
      () => load()
    );
    return off;
  }, []);

  async function ack(id) {
    setList((cur) => cur.filter((r) => r._id !== id));
    try { await api.ackTableRequest(id); } catch (e) { load(); /* roll back from server */ }
  }

  if (!list.length) return null;
  return (
    <div className="mb-3 sm:mb-4 card p-3 flex flex-wrap items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
      <span className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300 mr-1">
        {list.length} {t(list.length === 1 ? 'tableReq.one' : 'tableReq.other')}
      </span>
      {list.map((r) => (
        <button
          key={r._id}
          onClick={() => ack(r._id)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-surface-900 border border-amber-200 dark:border-amber-800 text-sm hover:bg-amber-100 dark:hover:bg-amber-950/60"
          title={t('tableReq.ack')}
        >
          <span className="font-semibold">{r.table?.label || '—'}</span>
          <span className="text-xs text-amber-700 dark:text-amber-300">
            {r.kind === 'waiter' ? t('tableReq.kind.waiter') : t('tableReq.kind.bill')}
          </span>
          <span className="text-amber-600 dark:text-amber-400">✓</span>
        </button>
      ))}
    </div>
  );
}

function Legend() {
  const items = [
    { color: '#2c2c2e', stroke: '#4d4d51', label: 'Free' },
    { color: '#3a2208', stroke: '#f59e0b', label: 'Open order' },
    { color: '#5a2208', stroke: '#fb923c', label: 'Sent to kitchen' },
  ];
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full inline-block border"
            style={{ background: i.color, borderColor: i.stroke }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}
