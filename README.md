# Patron — Restaurant & Café Management

A full-stack POS and management app for restaurants and cafés. Built with React + Tailwind + Express + MongoDB.

## Features

- **POS** — slide-over panel from the floor plan. Tap a menu item to open a modifier popup (size, milk type, extras, special instructions, quantity); the kitchen ticket and bill reflect every modifier and the price delta is applied per unit.
- **Items & Categories** — manage the menu, link recipes to stock so sales auto-decrement inventory.
- **Stock management** — track raw inventory with units, costs, and low-stock alerts.
- **Visual floor plan** — drag-and-drop tables with seats; tap a table to open its order. Color-coded by status.
- **Staff & paychecks** — staff records with hourly rates, clock-in/out shifts, and payroll calculations.
- **Profit & loss** — revenue, cost-of-goods, payroll, and net profit by day, week, month, year.
- **Roles** — Manager (full access), Waiter (POS + floor plan), Kitchen (incoming orders).

## Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Recharts
- **Backend**: Node.js, Express, Mongoose
- **Database**: MongoDB

## Quick start

You need Node 18+ and MongoDB running locally (default `mongodb://127.0.0.1:27017`).

```bash
# 1. Backend
cd backend
cp .env.example .env       # adjust if needed
npm install
npm run seed               # populate sample data
npm run dev                # http://localhost:4000

# 2. Frontend (in a second terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Open http://localhost:5173 and use the role switcher in the top-right to try Manager / Waiter / Kitchen views.

## Project layout

```
patron/
├── backend/         Express API + Mongoose models
│   ├── models/      Item, Category, StockItem, Table, Order, Staff, Shift
│   ├── routes/      REST endpoints
│   ├── server.js    Entry point
│   └── seed.js      Sample data
└── frontend/        Vite + React + Tailwind
    └── src/
        ├── pages/   FloorPlan, Items, Stock, Staff, Kitchen, Reports
        ├── components/
        ├── api.js   Backend client
        └── store.js Role state
```

## API summary

| Resource     | Endpoints                                                     |
| ------------ | ------------------------------------------------------------- |
| Categories   | `GET/POST/PUT/DELETE /api/categories`                         |
| Items        | `GET/POST/PUT/DELETE /api/items`                              |
| Stock        | `GET/POST/PUT/DELETE /api/stock`                              |
| Tables       | `GET/POST/PUT/DELETE /api/tables` (x, y, w, h, seats)         |
| Orders       | `GET/POST /api/orders`, `PATCH /api/orders/:id` (status)      |
| Staff        | `GET/POST/PUT/DELETE /api/staff`                              |
| Shifts       | `GET/POST /api/shifts`, `PATCH /api/shifts/:id/clock-out`     |
| Reports      | `GET /api/reports/pnl?range=day\|week\|month\|year`           |

## Notes

- Stock decrement happens on order **paid** transition.
- Floor-plan coordinates are stored in pixels relative to a 1000×700 canvas.
- This is a starter — auth and multi-restaurant support are intentionally not included.
