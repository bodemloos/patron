import { useMemo } from 'react';
import dayjs from 'dayjs';

/**
 * Ticket — premium dark KDS-style chit.
 *
 * One card per table holding the table's pending lines for either the
 * kitchen or the bar:
 *   ─ thin top accent bar tinted by ticket age (urgency cue)
 *   ─ table chip + clock + age in the header
 *   ─ course-grouped body (kitchen) or flat list (bar)
 *   ─ each line: brand-orange qty, item name, indented modifiers, amber
 *     note pill, per-line ✓ tap target
 *   ─ summary + full-width "Fire all ready" footer CTA
 *
 * Props:
 *   table        — the table label
 *   items        — [{ orderId, line }] from the queue endpoint
 *   onMarkReady  — (orderId, lineId) => Promise — flips a line to 'ready'
 *   mode         — 'kitchen' | 'bar' (course filtering + label)
 */
const COURSE_LABEL = {
  starter: 'Starters',
  main:    'Mains',
  dessert: 'Desserts',
  drink:   'Drinks',
  other:   'Sides & extras',
};
const COURSE_ORDER_KITCHEN = ['starter', 'main', 'dessert', 'other'];
const COURSE_ORDER_BAR = ['drink'];

export default function Ticket({ table, items, onMarkReady, mode = 'kitchen' }) {
  const courseOrder = mode === 'bar' ? COURSE_ORDER_BAR : COURSE_ORDER_KITCHEN;

  const groups = useMemo(() => {
    const g = {};
    for (const it of items) {
      const c = it.line.course || 'other';
      g[c] = g[c] || [];
      g[c].push(it);
    }
    return g;
  }, [items]);

  // Oldest pending line dictates ticket urgency.
  const { oldest, ageMin } = useMemo(() => {
    let o = new Date();
    for (const it of items) {
      const t = new Date(it.line.createdAt || it.line.updatedAt);
      if (t < o) o = t;
    }
    return { oldest: o, ageMin: (Date.now() - o.getTime()) / 60000 };
  }, [items]);

  const urgency = ageMin >= 20 ? 'late' : ageMin >= 10 ? 'aging' : 'fresh';
  const totalQty = items.reduce((a, it) => a + (it.line.qty || 1), 0);

  function fireAll() {
    items.forEach((it) => onMarkReady(it.orderId, it.line._id));
  }

  return (
    <article className={`ticket ticket-${urgency}`}>
      <div className="ticket-accent" aria-hidden="true" />

      <header className="ticket-head">
        <div className="ticket-table-block">
          <div className="ticket-eyebrow">Table</div>
          <div className="ticket-table">{table}</div>
        </div>
        <div className="ticket-time-block">
          <div className="ticket-time">{dayjs(oldest).format('HH:mm')}</div>
          <div className={`ticket-age ticket-age-${urgency}`}>
            <span className="ticket-age-dot" /> {formatAge(ageMin)}
          </div>
        </div>
      </header>

      <div className="ticket-body">
        {courseOrder.filter((c) => groups[c]?.length).map((c, idx) => (
          <section key={c} className="ticket-course">
            {mode === 'kitchen' && (
              <div className="ticket-course-label">
                <span>{COURSE_LABEL[c]}</span>
                <span className="ticket-course-count">{groups[c].length}</span>
              </div>
            )}
            <div className="ticket-lines">
              {groups[c].map((it) => (
                <TicketLine
                  key={it.line._id}
                  line={it.line}
                  onMarkReady={() => onMarkReady(it.orderId, it.line._id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="ticket-foot">
        <div className="ticket-summary">
          <span className="ticket-summary-num">{totalQty}</span>
          <span className="ticket-summary-label">item{totalQty === 1 ? '' : 's'}</span>
        </div>
        <button className="ticket-fire" onClick={fireAll}>
          Fire all ready
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </button>
      </footer>
    </article>
  );
}

function TicketLine({ line, onMarkReady }) {
  return (
    <div className="ticket-line">
      <div className="ticket-line-qty">{line.qty}</div>
      <div className="ticket-line-text">
        <div className="ticket-line-name">{line.name}</div>
        {line.modifiers?.length > 0 && (
          <div className="ticket-line-mods">
            {line.modifiers.map((m, i) => (
              <span key={i} className="ticket-mod-chip">{m.label}</span>
            ))}
          </div>
        )}
        {line.note && (
          <div className="ticket-line-note">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="10"/>
            </svg>
            <span>{line.note}</span>
          </div>
        )}
      </div>
      <button
        className="ticket-line-ready"
        onClick={onMarkReady}
        title="Mark this line ready"
        aria-label="Mark ready"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </button>
    </div>
  );
}

function formatAge(min) {
  if (min < 1) return 'just now';
  if (min < 60) return `${Math.floor(min)} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${Math.floor(min - h * 60)}m`;
}
