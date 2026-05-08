# Patron — Operator Wiki

This wiki is the field manual for **Patron**, a full-stack POS and management
app for restaurants and cafés. It walks through every screen, what it's for,
and how to use it. Aimed at restaurant managers, floor staff, and the person
deploying the app — not at developers reading the source.

If you're looking for engineering setup (env vars, npm scripts, deployment),
jump to [Deployment & operations](#deployment--operations) at the bottom.

---

## Table of contents

- [Concepts to learn first](#concepts-to-learn-first)
  - [Roles](#roles)
  - [Courses (food vs. drink routing)](#courses-food-vs-drink-routing)
  - [Recipes link items to stock](#recipes-link-items-to-stock)
  - [Real-time updates](#real-time-updates)
  - [Languages (i18n)](#languages-i18n)
- [Sidebar pages — manager](#sidebar-pages--manager)
  - [Floor plan & POS](#floor-plan--pos)
  - [Kitchen queue](#kitchen-queue)
  - [Bar queue](#bar-queue)
  - [Reservations](#reservations)
  - [Customers](#customers)
  - [Menu (items & categories)](#menu-items--categories)
  - [Stock](#stock)
  - [Staff & shifts](#staff--shifts)
  - [Schedule](#schedule)
  - [Contracts](#contracts)
  - [RSZ / ONSS](#rsz--onss)
  - [HACCP-registratie](#haccp-registratie)
  - [Reports](#reports)
  - [Settings](#settings)
  - [QR sheet](#qr-sheet)
- [Customer-facing pages](#customer-facing-pages)
  - [Welcome](#welcome)
  - [Patronize](#patronize)
  - [Tablebookers (booking widget)](#tablebookers-booking-widget)
  - [Tableside ordering (`/order.html`)](#tableside-ordering-orderhtml)
- [Native app (Capacitor)](#native-app-capacitor)
- [Deployment & operations](#deployment--operations)
- [Glossary](#glossary)

---

## Concepts to learn first

### Roles

A user picks a role from the **role switcher in the top-right header**. Each
role sees a different navigation and home page:

| Role      | Lands on    | Sees in nav                                                                                       |
| --------- | ----------- | ------------------------------------------------------------------------------------------------- |
| Manager   | `/floor`    | Everything                                                                                        |
| Waiter    | `/floor`    | Floor, Kitchen (read-only), Bar (read-only), Reservations                                         |
| Kitchen   | `/kitchen`  | Kitchen queue, HACCP                                                                              |
| Bar       | `/bar`      | Bar queue                                                                                         |

Roles are stored in browser local-storage, so each iPad / laptop can sit on
its own role. There is no real authentication yet — the role switcher is a
soft guard, suitable for trusted single-tenant deployments.

### Courses (food vs. drink routing)

Every order line carries a **course** (`starter`, `main`, `dessert`,
`drink`, `other`). Courses determine which queue picks the line up:

- The **kitchen queue** shows everything that isn't `drink`.
- The **bar queue** shows only `drink`.

Course is derived automatically from the item's category name. Categories
whose name contains *drink, coffee, tea, bar, beer, wine, cocktail* route to
the bar; *starter, appetizer*, *main*, *dessert/desert* go to the
corresponding kitchen course; everything else lands as `other`.

Tip: if you add a new category like "Mocktails" and it doesn't show up at
the bar, rename it to include "drink" (or any keyword above) — or override
the line course manually from the POS panel.

### Recipes link items to stock

A menu item can have a **recipe**: a list of stock entries plus the quantity
each consumes. When an order is paid, stock decrements automatically and
the order's COGS (cost of goods sold) is computed for the P&L. Items
without recipes still sell but won't decrement stock or show COGS.

### Real-time updates

The backend exposes a Server-Sent Events (SSE) stream at
`GET /api/events`. The frontend subscribes to it on the floor plan,
kitchen, bar, and reservations pages, so changes propagate to every open
device within ~1 second. Events you'll see flow: `order:sent`,
`order:updated`, `order:paid`, `order:cancelled`, `reservation:created`,
`reservation:updated`, plus a few HACCP and contract topics.

If the network drops, the frontend reconnects automatically. There's no
polling fallback — make sure your reverse proxy (nginx, Vercel, …)
doesn't buffer SSE responses.

### Languages (i18n)

The app ships in **Dutch (nl, default), French (fr), and English (en)**.
Every operator-facing string flows through a `t('key')` lookup in
`frontend/src/i18n/messages.js`. The language switcher lives in the
header. Each device picks its own language; nothing is synced server-side.

The customer-facing menu (`/order.html`) and booking widget have their own
language picker so a guest can switch to French even if the iPad is in
Dutch.

---

## Sidebar pages — manager

### Floor plan & POS

**Path:** `/floor` · **Roles:** manager, waiter

The most-used screen in the building. A canvas with rooms (Main, Bar,
Terrace, …) and tables drawn as round/square shapes. Colour codes:

- Grey — table is free
- Amber — table has an open order with unsent lines (still on the cart)
- Orange — table has an order that's been sent to the kitchen/bar
- Green dot on the corner — a table-side request is pending (see [Tableside ordering](#tableside-ordering-orderhtml))

**Editing the floor plan** — click the pencil to enter Edit mode. You can:
drag tables to reposition them, resize them, change shape (round/square),
re-assign room or zone (indoor/outdoor), bulk-add tables. Save commits
positions; the change is broadcast via SSE so every other device updates.

**Taking an order** — tap a table. A POS slide-over opens on the right with:
1. **Menu picker** on the left, filtered by category. Tap an item to add it.
2. **Modifier popup** appears for items in categories that need it (mains,
   desserts) — choose size, milk, extras, custom note, quantity. Each
   modifier carries an optional price delta that's applied per unit.
3. **Cart on the right** shows lines, quantities, and a running subtotal.
   Each line can be edited (qty, note, modifiers) before sending.
4. **Send to kitchen / bar** — sets line status to `pending` and emits
   `order:sent`. Lines disappear from "unsent" highlighting, table colour
   flips to orange, the kitchen/bar queue picks them up.
5. **Pay** — opens the payment dialog: split between card / cash, optional
   tip (controls visible if enabled in Settings → Tax). Marks the order
   `paid`, decrements stock based on recipes, and frees the table.

Other affordances: cancel an order (sets status `cancelled`), free a table
without paying (for staff comps / errors), assign a waiter to the order,
and link the order to a customer record from the customer search.

### Kitchen queue

**Path:** `/kitchen` · **Roles:** manager, kitchen

One ticket per (table × course) combination, sorted oldest first. Each line
shows item name, quantity, modifiers / notes, and a status pill. Lines move
through `pending → preparing → ready → served`. Kitchen taps the pill to
advance the status; the table on the floor plan picks up the colour change
in real time.

The page also has an **86-list toggle** (top-right). Opening it shows every
kitchen item as a chip; tap one to mark it unavailable. Unavailable items
are hidden from the POS picker and crossed out on the customer menu, so
you stop selling something the moment you run out.

The waiter role can also reach `/kitchen` to peek at the queue (read-only
in spirit — they shouldn't be marking lines done).

### Bar queue

**Path:** `/bar` · **Roles:** manager, bar

Same UI as the kitchen, filtered to the `drink` course. The 86-list here
shows drink-category items only — useful when a tap kicks or a wine runs
out. Toggling unavailability is identical to the kitchen.

### Reservations

**Path:** `/reservations` · **Roles:** manager, waiter

Date picker at the top, plus tabs for **All / Pending / Confirmed / Seated
/ Cancelled / No-show** with live counts. Each card shows guest name,
party size, time, table assignment, and status buttons.

- **Capacity check** — when creating or moving a reservation, the system
  refuses overlapping bookings on the same table.
- **Auto-link to customer** — saving a reservation creates or updates a
  Customer record (matched by email, falling back to phone). The
  reservation card carries a link through to the customer profile.
- **Public booking widget** at `/tablebookers.html` is an embeddable iframe
  that calls `/api/public/reservations/availability` to show open slots
  for a chosen date and party size. It respects opening hours, slot
  interval, closures, and current table occupancy. The widget submits to
  `/api/public/reservations` so embedding it on a third-party website is
  fine — no API key needed.
- **Reminder cron** sends a stub email/SMS the morning of (configurable in
  Settings → Reminders). Wire a real sender into `backend/lib/reminders.js`
  before relying on it.

### Customers

**Path:** `/customers` · **Roles:** manager

A guest database that builds itself. Whenever a reservation is saved or an
order is paid, the system finds-or-creates a Customer record (keyed by
email, then phone) and updates: visit count, lifetime spend, last-visit
date, and any notes from the reservation. The list shows everyone, with
search by name / email / phone.

Click a row to open the right-side panel: full contact, last 20 orders,
last 20 reservations, and a VIP toggle. The VIP flag is just a badge for
your team — there's no behavioural change, but it's helpful for service.

### Menu (items & categories)

**Path:** `/items` · **Roles:** manager

Two stacked sections: **Categories** (top) and **Items** (bottom).

**Categories** are organised in a two-tier hierarchy: a parent category
(e.g. *Food*, *Drinks*) can contain sub-categories (e.g. *Mains*,
*Desserts*; *Beers (tap)*, *Beers (bottle)*, *Soft drinks*, *Wine*, …).
The customer menu and POS render the parent chips on top, sub-category
chips underneath. Each category has:

- Name
- Colour (used as the badge wherever the category appears)
- Sort order
- Optional parent (creates a sub-category)
- Optional tax-rate override (otherwise items use Settings → Tax → default
  VAT rate)

**Items** carry: name, price, optional description, image URL, info URL
(handy for beer info pages on Untappd), assigned category, available flag,
and two structured extras:

- **Sizes** — small / medium / large, each with a price delta. The POS
  modifier popup shows them as selectable chips.
- **Recipe** — list of `{ stock item, quantity }` pairs. Used both for
  stock decrement on payment and for COGS reporting.

There's an availability toggle on each row so you can 86 something without
opening the modifier dialog (the bar/kitchen 86-list toggles the same flag
behind the scenes).

### Stock

**Path:** `/stock` · **Roles:** manager

Inventory ledger. Each row: name, unit (`pcs`, `g`, `ml`, `kg`), current
quantity, minimum quantity (the alert threshold), cost per unit, optional
supplier and supplier email, and an optional reorder quantity used by the
shopping list.

- **Quick-adjust buttons** (+1, −1, +10) for fast counts; for a precise
  count, edit the row.
- Items below their minimum show a red dot.
- **Shopping list** modal (button at the top) groups under-stock items by
  supplier, calculates suggested reorder quantities (default `2 × min −
  on-hand`, overridden by the row's reorder quantity), and offers a
  pre-filled `mailto:` link per supplier. Print-friendly.

Decrement is automatic: paying an order subtracts each item's recipe
quantities from the linked stock items, and emits an `order:paid` event.

### Staff & shifts

**Path:** `/staff` · **Roles:** manager

The staff list captures both **operational** fields (name, role, hourly
rate, email, phone, active flag) and **payroll** fields needed for valid
Belgian Dimona / RSZ filings (NISS / national number, date of birth,
nationality, IBAN, address). The payroll fields are optional for using
the app day-to-day but mandatory for the Contracts / RSZ flows.

**Clock in / clock out** sits at the top of the page. Tap a staff name to
clock them in (creates an open shift); tap again to clock out. Active
shifts are highlighted at the top so the team can see who's currently on.

**Payroll summary** lets you pick a date range, totals hours and labour
cost per employee, and shows a list of the underlying shifts. Edit a
shift to fix typos in start/end time.

### Schedule

**Path:** `/schedule` · **Roles:** manager

Forward-looking planner — distinct from Shifts (which are clocked time).
Two views:

- **Week view** — one column per day, drag a staff chip onto a day to
  create a planned shift. Click the chip to edit start/end.
- **Month view** — calendar grid of pills, useful for big-picture
  staffing.

The header shows estimated labour cost for the visible range (sum of
planned hours × hourly rate), so you can sanity-check before publishing
the rota.

### Contracts

**Path:** `/contracts` · **Roles:** manager

Belgian-style employment contracts attached to staff. Statute types
covered: permanent, fixed-term, flexi-job, student, extra (occasional),
interim, internship — each with the right Dutch / French wording.

Lifecycle: **draft → signed → active → terminated**. A contract gathers:
job title, workplace, start date, optional end date, hours per week,
hourly rate or monthly salary, and free-text additional clauses. The
**Sign** button records both signatory names and timestamps and flips
status to `signed` (then `active` once the start date passes).

**Dimona submission** ("opening" for new hire, "closing" for departure)
is *stubbed* — it returns a fake confirmation number locally. Plug a real
RSZ web-service client into `backend/routes/contracts.js`'s
`/contracts/:id/dimona` handler before going to production. The local
record stays whether the upstream call succeeds or not, so you have an
audit trail.

### RSZ / ONSS

**Path:** `/rsz` · **Roles:** manager

The other half of the Belgian payroll story: **DmfA quarterly hours
declarations**. Pick a date range, preview the aggregated hours per
worker (computed from clocked Shifts), and submit a batch. As with
Dimona, submission is stubbed — confirmation numbers come back as
`STUB-####` until you wire the real RSZ web service. Locally the
declaration is stored so you can audit what was filed.

The page also lists past declarations with their status and confirmation
number.

### HACCP-registratie

**Path:** `/haccp` · **Roles:** manager, kitchen

Food-safety registration aligned with FAVV / AFSCA expectations. Four
tabs:

1. **Temperatures** — equipment cards (fridges, freezers, hot-hold
   cabinets) showing the last reading and a "stale" badge when older than
   24 h. Tap a card to register a new reading: enter °C, optional
   recorder, and notes. If the temperature falls outside the equipment's
   target range the form requires a *corrective action* (e.g. "moved
   goods, called engineer"). Out-of-range readings flag in red on the log
   table at the bottom and are kept verbatim — the in-range flag is
   captured at write time so changing thresholds later doesn't rewrite
   history.
2. **Cleaning** — daily / weekly / monthly task tiles with the time of the
   last completion. Overdue tiles glow red (overdue thresholds: daily
   > 36 h, weekly > 9 d, monthly > 35 d). Tap to mark done; record who and
   any notes.
3. **Deliveries** — register every incoming delivery: supplier, items
   summary, optional cold-chain temperature, packaging OK / fail, expiry
   OK / fail. A failure prompts for a corrective action. Useful for the
   "ingrediënten ontvangst" log inspectors typically ask for.
4. **Setup** — manage the equipment list (fridges, freezers, …) and the
   recurring cleaning tasks. Each equipment unit has a name, type
   (fridge / freezer / hot-holding / other), location, and target min/max
   °C. Each cleaning task has a name, area, and frequency.

The seed populates a realistic week of readings + cleanings + a few
deliveries so the page isn't empty after a fresh install.

### Reports

**Path:** `/reports` · **Roles:** manager

The financial and operational dashboard:

- **Range toggle** — Day / Week / Month / Year (relative to today).
- **P&L summary cards** — Orders count, Subtotal, Total, VAT, Tips, COGS,
  payment method breakdown (card / cash / other).
- **Revenue trend** chart (Recharts).
- **Top items** table — best sellers by quantity and revenue.
- **Z-report** — modal where you pick a date and get the daily close-out
  (orders, subtotals, tax by rate, payment methods). Useful for handover
  at end of service.
- **CSV exports** for orders and shifts. Pick a date range and click the
  link; the file streams from `/api/exports/orders.csv` and
  `/api/exports/shifts.csv`.

### Settings

**Path:** `/settings` · **Roles:** manager

Single page split into sections:

- **Language** — per-device locale switch (mirrors the header switcher).
- **Branding** — restaurant name, currency symbol, timezone.
- **Opening hours** — per-day open/close, plus the reservation slot
  interval (5–120 min) and default duration of a booking.
- **Tax** — default VAT rate (used when a category doesn't override it),
  and the tip prompt configuration (off, percentage suggestions).
- **Closures** — date ranges that block the public booking widget
  (holidays, training days, private events).
- **Customer menu** — theme presets (Patron, Bistro, Minimal, Coastal,
  …), manual colour pickers, light / dark / auto, optional Google Font
  for headings, tagline, and cover image URL. Drives the look of
  `/order.html` and `/patronize.html`.
- **Reminders** — email / SMS reminders before reservations. Currently
  logs to console; replace the stub in `backend/lib/reminders.js` with a
  real provider (SendGrid, Twilio, …).

### QR sheet

**Path:** `/qr-sheet` · **Roles:** manager

Print-friendly A4 sheet with one QR code per table. Configurable grid
(2–4 columns) and QR size (160–400 px). Optional zone filter (indoor /
outdoor only). Cmd-P / Ctrl-P hides the chrome so the print is just the
codes.

Each QR encodes `https://your-host/order.html?table=<id>`. Customers
scan, the menu loads on their phone, and they can place an order without
flagging down a waiter (see next section).

---

## Customer-facing pages

These live at the root of the frontend and have no manager UI. They run
the same backend but only hit the public endpoints in
`backend/routes/public.js`.

### Welcome

`/welcome.html` — the marketing splash for the deployment URL. Edit
in `frontend/public/welcome.html`.

### Patronize

`/patronize.html` — restaurant info / about page. Theme-styled (uses the
*Customer menu* settings), with cover image, tagline, and links to the
menu and booking widget.

### Tablebookers (booking widget)

`/tablebookers.html` — embeddable iframe for putting a "Book a table"
widget on any third-party website. Workflow:

1. Guest picks a date and party size.
2. Widget calls `GET /api/public/reservations/availability?date=…&partySize=…`
   and renders open slots (respecting opening hours, slot interval, and
   closures).
3. Guest enters name + email + phone, picks a slot, submits.
4. Widget calls `POST /api/public/reservations` and shows confirmation.

CORS is open for any origin. The widget never reveals other guests'
reservations.

### Tableside ordering (`/order.html`)

When a guest scans a table QR they land here. Features:

- Theme styled from Settings → Customer menu.
- Two-tier category chips with the new parent / child structure.
- Product cards with photo, price, description, *info* link (e.g.
  Untappd), size picker, modifier popup, quantity.
- Cart with running total. **Send order** posts to the backend; the
  kitchen / bar queue picks it up just as if a waiter sent it.
- Two **table-request** buttons: "Vraag de bediening" and "Vraag de
  rekening". Each creates a `TableRequest` (kind `waiter` or `bill`,
  status `pending`). On the floor plan a green dot appears on the
  affected table. Tapping the dot acknowledges the request (status
  flips, timestamp + staff name recorded). Acknowledged requests
  auto-expire from the database after 6 hours via a TTL index.
- Language switcher in the header (independent of the iPad's language).

---

## Native app (Capacitor)

Patron's frontend is wrapped as native iOS / Android apps with
[Capacitor](https://capacitorjs.com/). Config lives at
`frontend/capacitor.config.json` (app id `be.bodemloos.patron`, app name
`Patron`, web dir `dist`).

Plugins configured:

- **SplashScreen** — long launch (600 ms) with the dark Patron splash.
- **StatusBar** — dark style, dark background, no overlay.
- **Keyboard** — native resize behaviour, dark style.

To build native shells:

```bash
cd frontend
npm run build               # produces dist/
npx cap sync                # mirrors dist/ + plugins into iOS/Android projects
npx cap open ios            # opens Xcode (Mac only)
npx cap open android        # opens Android Studio
```

A native build needs `VITE_API_BASE` set at build time, otherwise the app
ships with same-origin `/api` requests that go nowhere on a phone. The
runtime override `window.__patronApiBase` is also honoured for staging
builds — see the comment block at the top of
`frontend/src/api.js`.

`frontend/src/lib/native.js` exposes a small wrapper around Capacitor
plugin APIs (status bar style, splash hide, etc.); the rest of the
codebase doesn't import `@capacitor/core` directly so the web bundle stays
lean.

A more detailed Capacitor walkthrough lives in `frontend/CAPACITOR.md`.

---

## Deployment & operations

### Local development

Requires Node 18+ and a MongoDB instance (local or Atlas).

```bash
# 1. Backend
cd backend
cp .env.example .env       # adjust MONGO_URI if needed
npm install
npm run seed               # populates demo data
npm run dev                # http://localhost:4000

# 2. Frontend (second terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:4000`, so no env var is needed
in dev. Open the role switcher in the top-right to try
Manager / Waiter / Kitchen / Bar.

### Environment variables (backend)

| Var           | Default                                       | Purpose                                                           |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| `PORT`        | `4000`                                        | HTTP port                                                         |
| `MONGO_URI`   | `mongodb://127.0.0.1:27017/patron`            | MongoDB connection string. Atlas works fine.                      |
| `CORS_ORIGIN` | `*`                                           | CORS allow-list. Tighten in production.                           |

### Environment variables (frontend, build-time)

| Var               | Effect                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE`   | Absolute URL of the backend. Required for native builds and any deployment where the SPA isn't proxying `/api`. |

### Production deployment

The repo carries a `vercel.json` for Vercel hosting of the frontend with
an `/api` rewrite, plus the README's notes on running the backend on
Render or similar. Either:

- Deploy frontend on Vercel + backend on Render (or any Node host), and
  set `VITE_API_BASE=https://your-render-url` so the SSE stream goes
  direct to the backend (Vercel's rewrite layer doesn't love SSE).
- Or run both behind the same domain (e.g. nginx → frontend `dist/` and
  reverse-proxy `/api/*` to Node) and leave `VITE_API_BASE` empty.

The seed (`npm run seed`) wipes and rebuilds the demo dataset. **Don't
run it against a production database** — there is no opt-out flag.

### Reseeding & inspection

Useful one-liners:

```bash
# wipe and reseed against an Atlas URI
MONGO_URI='mongodb+srv://user:pass@cluster.mongodb.net/patron' npm run seed

# open a Mongo shell
mongosh "$MONGO_URI"

# tail backend logs
npm run dev    # uses morgan in dev format
```

### Real-time notes for ops

- The SSE endpoint is `GET /api/events`. It streams plain `text/event-stream`
  with keep-alive comments; reverse proxies must not buffer it
  (`X-Accel-Buffering: no` on nginx; Vercel: serve direct from the Node
  host instead of through their edge).
- The Mongoose connection survives transient drops; if Atlas pauses (M0
  free tier), TCP to port 27017 silently times out — typical signature is
  `MongooseServerSelectionError: ReplicaSetNoPrimary` with empty server
  descriptions while port 443 on the same host stays open. Resume the
  cluster.

---

## Glossary

| Term       | Meaning                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| **86-list**| Bar/restaurant slang for items currently unavailable. Toggle in the kitchen or bar page.             |
| **AFSCA**  | French acronym for Belgium's federal food agency — same body as FAVV.                                |
| **Capacitor** | Ionic's web-to-native runtime; wraps the SPA as iOS / Android apps.                               |
| **COGS**   | Cost of Goods Sold — sum of recipe costs against a paid order.                                       |
| **Course** | One of `starter / main / dessert / drink / other` — drives kitchen vs. bar routing.                  |
| **Dimona** | Belgian arrival/departure declaration to RSZ. Submit on hire and on departure.                       |
| **DmfA**   | Belgian quarterly multifunctional declaration — the per-quarter hours filing to RSZ.                 |
| **FAVV**   | Federaal Agentschap voor de Veiligheid van de Voedselketen — Belgian food safety inspector.          |
| **HACCP**  | Hazard Analysis & Critical Control Points — food-safety methodology FAVV expects you to log against. |
| **NISS / Rijksregister** | Belgian national identification number; required on staff records for valid Dimona / RSZ filings. |
| **POS**    | Point of Sale — the slide-over on the floor plan that takes orders and payments.                     |
| **RSZ / ONSS** | Belgian National Social Security Office (Dutch / French names).                                  |
| **SSE**    | Server-Sent Events — one-way HTTP stream the backend uses for real-time updates.                     |
| **VAT**    | Value-added tax. Default rate in Settings; per-category overrides on the menu.                       |
