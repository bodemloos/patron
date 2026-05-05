require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const Category = require('./models/Category');
const Item = require('./models/Item');
const StockItem = require('./models/StockItem');
const Room = require('./models/Room');
const Table = require('./models/Table');
const Staff = require('./models/Staff');
const Shift = require('./models/Shift');
const Order = require('./models/Order');
const Reservation = require('./models/Reservation');

async function run() {
  await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/patron');

  console.log('[seed] clearing collections...');
  await Promise.all([
    Category.deleteMany({}),
    Item.deleteMany({}),
    StockItem.deleteMany({}),
    Room.deleteMany({}),
    Table.deleteMany({}),
    Staff.deleteMany({}),
    Shift.deleteMany({}),
    Order.deleteMany({}),
    Reservation.deleteMany({}),
  ]);

  console.log('[seed] rooms...');
  await Room.create([
    { name: 'Main',    color: '#f59e0b', sortOrder: 1 },
    { name: 'Bar',     color: '#3b82f6', sortOrder: 2 },
    { name: 'Terrace', color: '#10b981', sortOrder: 3 },
  ]);

  console.log('[seed] categories...');
  // Two top-level parents: Food + Drinks. Existing categories become
  // their children, plus a fresh Wine sub-category under Drinks.
  // The customer menu (order.html) and the POS render this as a
  // two-tier filter: parent chips on top, sub-category chips below.
  const [food, drinks] = await Category.create([
    { name: 'Food',   color: '#dc2626', sortOrder: 1 },
    { name: 'Drinks', color: '#0ea5e9', sortOrder: 2 },
  ]);
  const [mains, desserts, beersTap, beersBottle, beersTemp, softDrinks, coffee, wine] = await Category.create([
    // Food sub-categories
    { name: 'Mains',           color: '#dc2626', sortOrder: 1, parent: food._id },
    { name: 'Desserts',        color: '#db2777', sortOrder: 2, parent: food._id },
    // Drinks sub-categories
    { name: 'Beers (tap)',     color: '#f59e0b', sortOrder: 1, parent: drinks._id },
    { name: 'Beers (bottle)',  color: '#b45309', sortOrder: 2, parent: drinks._id },
    { name: 'Temporary beers', color: '#7c3aed', sortOrder: 3, parent: drinks._id },
    { name: 'Soft drinks',     color: '#22c55e', sortOrder: 4, parent: drinks._id },
    { name: 'Coffee & Tea',    color: '#a16207', sortOrder: 5, parent: drinks._id },
    { name: 'Wine',            color: '#9f1239', sortOrder: 6, parent: drinks._id },
  ]);

  console.log('[seed] stock...');
  const stock = await StockItem.create([
    { name: 'Coffee beans', unit: 'g', quantity: 5000, minQuantity: 1000, costPerUnit: 0.025 },
    { name: 'Milk', unit: 'ml', quantity: 12000, minQuantity: 4000, costPerUnit: 0.0012 },
    { name: 'Cola can', unit: 'pcs', quantity: 60, minQuantity: 24, costPerUnit: 0.6 },
    { name: 'Lemonade bottle', unit: 'pcs', quantity: 40, minQuantity: 12, costPerUnit: 0.7 },
    { name: 'Pils keg', unit: 'ml', quantity: 30000, minQuantity: 5000, costPerUnit: 0.003 },
    { name: 'IPA keg', unit: 'ml', quantity: 20000, minQuantity: 4000, costPerUnit: 0.0042 },
    { name: 'Beer bottle', unit: 'pcs', quantity: 80, minQuantity: 24, costPerUnit: 0.9 },
    { name: 'Trappist bottle', unit: 'pcs', quantity: 36, minQuantity: 12, costPerUnit: 1.6 },
    { name: 'Seasonal saison bottle', unit: 'pcs', quantity: 24, minQuantity: 6, costPerUnit: 1.8 },
    { name: 'House wine', unit: 'ml', quantity: 9000, minQuantity: 1500, costPerUnit: 0.004 },
    { name: 'Burger bun', unit: 'pcs', quantity: 50, minQuantity: 10, costPerUnit: 0.4 },
    { name: 'Beef patty', unit: 'pcs', quantity: 40, minQuantity: 10, costPerUnit: 1.8 },
    { name: 'Fries (frozen)', unit: 'g', quantity: 20000, minQuantity: 4000, costPerUnit: 0.003 },
    { name: 'Pasta', unit: 'g', quantity: 15000, minQuantity: 3000, costPerUnit: 0.002 },
    { name: 'Tomato sauce', unit: 'ml', quantity: 8000, minQuantity: 1500, costPerUnit: 0.003 },
    { name: 'Tiramisu portion', unit: 'pcs', quantity: 20, minQuantity: 5, costPerUnit: 1.4 },
    { name: 'Chocolate cake slice', unit: 'pcs', quantity: 18, minQuantity: 4, costPerUnit: 1.2 },
  ]);
  const byName = Object.fromEntries(stock.map((s) => [s.name, s]));

  console.log('[seed] items...');
  await Item.create([
    {
      name: 'Espresso',
      price: 2.5,
      category: coffee._id,
      recipe: [{ stockItem: byName['Coffee beans']._id, qty: 8 }],
      sortOrder: 1,
    },
    {
      name: 'Cappuccino',
      price: 3.2,
      category: coffee._id,
      recipe: [
        { stockItem: byName['Coffee beans']._id, qty: 8 },
        { stockItem: byName['Milk']._id, qty: 120 },
      ],
      sortOrder: 2,
    },
    {
      name: 'Latte',
      price: 3.5,
      category: coffee._id,
      recipe: [
        { stockItem: byName['Coffee beans']._id, qty: 8 },
        { stockItem: byName['Milk']._id, qty: 200 },
      ],
      sortOrder: 3,
    },
    {
      name: 'Cola',
      price: 2.8,
      category: softDrinks._id,
      recipe: [{ stockItem: byName['Cola can']._id, qty: 1 }],
      sortOrder: 1,
    },
    {
      name: 'Lemonade',
      price: 2.8,
      category: softDrinks._id,
      recipe: [{ stockItem: byName['Lemonade bottle']._id, qty: 1 }],
      sortOrder: 2,
    },
    {
      name: 'Pils (25cl)',
      price: 2.8,
      category: beersTap._id,
      recipe: [{ stockItem: byName['Pils keg']._id, qty: 250 }],
      sortOrder: 1,
    },
    {
      name: 'IPA (25cl)',
      price: 3.6,
      category: beersTap._id,
      recipe: [{ stockItem: byName['IPA keg']._id, qty: 250 }],
      sortOrder: 2,
    },
    {
      name: 'Lager bottle',
      price: 3.5,
      category: beersBottle._id,
      recipe: [{ stockItem: byName['Beer bottle']._id, qty: 1 }],
      sortOrder: 1,
    },
    {
      name: 'Trappist',
      price: 4.8,
      category: beersBottle._id,
      recipe: [{ stockItem: byName['Trappist bottle']._id, qty: 1 }],
      sortOrder: 2,
    },
    {
      name: 'Seasonal saison',
      price: 5.2,
      category: beersTemp._id,
      recipe: [{ stockItem: byName['Seasonal saison bottle']._id, qty: 1 }],
      sortOrder: 1,
    },
    {
      name: 'House wine (glass)',
      price: 4.5,
      category: wine._id,
      recipe: [{ stockItem: byName['House wine']._id, qty: 175 }],
      sortOrder: 1,
    },
    {
      name: 'Cheeseburger & fries',
      price: 13.5,
      category: mains._id,
      recipe: [
        { stockItem: byName['Burger bun']._id, qty: 1 },
        { stockItem: byName['Beef patty']._id, qty: 1 },
        { stockItem: byName['Fries (frozen)']._id, qty: 200 },
      ],
      sortOrder: 1,
    },
    {
      name: 'Spaghetti bolognese',
      price: 12.0,
      category: mains._id,
      recipe: [
        { stockItem: byName['Pasta']._id, qty: 130 },
        { stockItem: byName['Tomato sauce']._id, qty: 100 },
      ],
      sortOrder: 2,
    },
    {
      name: 'Tiramisu',
      price: 5.5,
      category: desserts._id,
      recipe: [{ stockItem: byName['Tiramisu portion']._id, qty: 1 }],
      sortOrder: 1,
    },
    {
      name: 'Chocolate cake',
      price: 5.0,
      category: desserts._id,
      recipe: [{ stockItem: byName['Chocolate cake slice']._id, qty: 1 }],
      sortOrder: 2,
    },
  ]);

  console.log('[seed] tables...');
  await Table.create([
    { label: 'T1', seats: 2, x: 80,  y: 80,  w: 80, h: 80, shape: 'round',  room: 'Main',    zone: 'indoor'  },
    { label: 'T2', seats: 2, x: 220, y: 80,  w: 80, h: 80, shape: 'round',  room: 'Main',    zone: 'indoor'  },
    { label: 'T3', seats: 4, x: 360, y: 80,  w: 110, h: 80, shape: 'square', room: 'Main',    zone: 'indoor'  },
    { label: 'T4', seats: 4, x: 510, y: 80,  w: 110, h: 80, shape: 'square', room: 'Main',    zone: 'indoor'  },
    { label: 'T5', seats: 6, x: 80,  y: 220, w: 160, h: 90, shape: 'square', room: 'Main',    zone: 'indoor'  },
    { label: 'T6', seats: 4, x: 280, y: 220, w: 110, h: 80, shape: 'square', room: 'Main',    zone: 'indoor'  },
    { label: 'T7', seats: 2, x: 430, y: 220, w: 80,  h: 80, shape: 'round',  room: 'Main',    zone: 'indoor'  },
    { label: 'T8', seats: 2, x: 550, y: 220, w: 80,  h: 80, shape: 'round',  room: 'Main',    zone: 'indoor'  },
    { label: 'B1', seats: 1, x: 700, y: 80,  w: 60,  h: 60, shape: 'round',  room: 'Bar',     zone: 'indoor'  },
    { label: 'B2', seats: 1, x: 700, y: 160, w: 60,  h: 60, shape: 'round',  room: 'Bar',     zone: 'indoor'  },
    { label: 'B3', seats: 1, x: 700, y: 240, w: 60,  h: 60, shape: 'round',  room: 'Bar',     zone: 'indoor'  },
    { label: 'P1', seats: 4, x: 80,  y: 100, w: 110, h: 80, shape: 'square', room: 'Terrace', zone: 'outdoor' },
    { label: 'P2', seats: 4, x: 220, y: 100, w: 110, h: 80, shape: 'square', room: 'Terrace', zone: 'outdoor' },
    { label: 'P3', seats: 2, x: 360, y: 100, w: 80,  h: 80, shape: 'round',  room: 'Terrace', zone: 'outdoor' },
  ]);

  console.log('[seed] staff...');
  const staff = await Staff.create([
    { name: 'Sophie Martens',  role: 'manager', hourlyRate: 22, email: 'sophie@patron.cafe' },
    { name: 'Lucas De Smet',   role: 'waiter',  hourlyRate: 14, email: 'lucas@patron.cafe' },
    { name: 'Emma Janssens',   role: 'waiter',  hourlyRate: 14, email: 'emma@patron.cafe' },
    { name: 'Karim El Amrani', role: 'kitchen', hourlyRate: 17, email: 'karim@patron.cafe' },
    { name: 'Noor Peeters',    role: 'kitchen', hourlyRate: 16, email: 'noor@patron.cafe' },
  ]);

  console.log('[seed] sample shifts...');
  // a few completed shifts in the past 14 days for paycheck demo
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const shifts = [];
  for (let d = 0; d < 14; d++) {
    for (const s of staff) {
      // skip some random days
      if ((d + s.name.length) % 3 === 0) continue;
      const start = new Date(now - d * day - 8 * 3600 * 1000);
      const end = new Date(now - d * day - 1 * 3600 * 1000);
      shifts.push({
        staff: s._id,
        clockIn: start,
        clockOut: end,
        hourlyRateSnapshot: s.hourlyRate,
      });
    }
  }
  await Shift.create(shifts);

  console.log('[seed] sample paid orders for P&L charts...');
  const items = await Item.find().populate('recipe.stockItem');
  const tables = await Table.find();
  const orders = [];
  // generate ~12 orders/day for the past 30 days
  for (let d = 0; d < 30; d++) {
    const date = new Date(now - d * day);
    const orderCount = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < orderCount; i++) {
      const lineCount = 1 + Math.floor(Math.random() * 4);
      const lines = [];
      let subtotal = 0;
      let cogs = 0;
      for (let j = 0; j < lineCount; j++) {
        const it = items[Math.floor(Math.random() * items.length)];
        const qty = 1 + Math.floor(Math.random() * 2);
        lines.push({ item: it._id, name: it.name, price: it.price, qty, status: 'served' });
        subtotal += it.price * qty;
        for (const r of it.recipe) {
          cogs += (r.stockItem.costPerUnit || 0) * r.qty * qty;
        }
      }
      const paidAt = new Date(
        date.getTime() - (Math.floor(Math.random() * 12) + 11) * 3600 * 1000
      );
      orders.push({
        table: tables[Math.floor(Math.random() * tables.length)]._id,
        waiter: staff[1 + Math.floor(Math.random() * 2)]._id,
        lines,
        status: 'paid',
        subtotal,
        cogs,
        paidAt,
        paymentMethod: Math.random() < 0.6 ? 'card' : 'cash',
      });
    }
  }
  await Order.create(orders);

  console.log('[seed] reservations...');
  // Sprinkle a handful across today + the next two days at sensible
  // dinner-time slots so the Reservations page has something to look at.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  function at(dayOffset, h, m) {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  }
  const tablesById = await Table.find().lean();
  const pickTable = (seats) =>
    tablesById.filter((t) => t.seats >= seats).sort((a, b) => a.seats - b.seats)[0];

  const seedRes = [
    { name: 'Anna Janssens',  email: 'anna@example.com',  phone: '+32 478 12 34 56', partySize: 2, startsAt: at(0, 19, 0),  notes: '',                                          status: 'confirmed' },
    { name: 'Marc De Vos',    email: 'marc@example.com',  phone: '+32 478 22 33 44', partySize: 4, startsAt: at(0, 20, 0),  notes: 'Anniversary — quiet table if possible',     status: 'confirmed' },
    { name: 'Sara El Idrissi',email: 'sara@example.com',  phone: '',                  partySize: 2, startsAt: at(1, 18, 30), notes: '',                                          status: 'confirmed' },
    { name: 'Tom Vermeer',    email: '',                   phone: '+32 472 99 11 22', partySize: 6, startsAt: at(1, 19, 30), notes: 'One nut allergy',                           status: 'pending' },
    { name: 'Lisa Peeters',   email: 'lisa@example.com',  phone: '',                  partySize: 2, startsAt: at(2, 12, 30), notes: '',                                          status: 'confirmed' },
  ];
  await Reservation.create(
    seedRes.map((r) => ({
      ...r,
      durationMinutes: 90,
      table: pickTable(r.partySize)?._id || null,
      source: 'manual',
    }))
  );

  console.log('[seed] done.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
