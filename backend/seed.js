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
const HaccpEquipment = require('./models/HaccpEquipment');
const HaccpTemperatureLog = require('./models/HaccpTemperatureLog');
const HaccpCleaningTask = require('./models/HaccpCleaningTask');
const HaccpCleaningLog = require('./models/HaccpCleaningLog');
const HaccpReceivingLog = require('./models/HaccpReceivingLog');

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
    HaccpEquipment.deleteMany({}),
    HaccpTemperatureLog.deleteMany({}),
    HaccpCleaningTask.deleteMany({}),
    HaccpCleaningLog.deleteMany({}),
    HaccpReceivingLog.deleteMany({}),
  ]);

  console.log('[seed] rooms...');
  await Room.create([
    { name: 'Main',    color: '#f59e0b', sortOrder: 1 },
    { name: 'Bar',     color: '#3b82f6', sortOrder: 2 },
    { name: 'Terrace', color: '#10b981', sortOrder: 3 },
  ]);

  console.log('[seed] categories...');
  const [drinks, beersTap, beersBottle, beersTemp, softDrinks, coffee, mains, desserts] = await Category.create([
    { name: 'Drinks', color: '#0ea5e9', sortOrder: 1 },
    { name: 'Beers (tap)', color: '#f59e0b', sortOrder: 2 },
    { name: 'Beers (bottle)', color: '#b45309', sortOrder: 3 },
    { name: 'Temporary beers', color: '#7c3aed', sortOrder: 4 },
    { name: 'Soft drinks', color: '#22c55e', sortOrder: 5 },
    { name: 'Coffee & Tea', color: '#a16207', sortOrder: 6 },
    { name: 'Mains', color: '#dc2626', sortOrder: 7 },
    { name: 'Desserts', color: '#db2777', sortOrder: 8 },
  ]);

  console.log('[seed] stock...');
  const stock = await StockItem.create([
    // --- Coffee & tea bar ---
    { name: 'Coffee beans', unit: 'g', quantity: 5000, minQuantity: 1000, costPerUnit: 0.025 },
    { name: 'Milk', unit: 'ml', quantity: 12000, minQuantity: 4000, costPerUnit: 0.0012 },
    { name: 'Satemwa tea bag', unit: 'pcs', quantity: 200, minQuantity: 50, costPerUnit: 0.30 },
    { name: 'Fresh mint', unit: 'g', quantity: 500, minQuantity: 100, costPerUnit: 0.05 },
    { name: 'Fresh ginger', unit: 'g', quantity: 1000, minQuantity: 200, costPerUnit: 0.04 },
    { name: 'Drinking chocolate', unit: 'g', quantity: 2000, minQuantity: 500, costPerUnit: 0.03 },

    // --- Tap kegs (Vleesmeester eigen brouwsels + Super Bavik) ---
    { name: 'Jour De Fête keg',     unit: 'ml', quantity: 30000, minQuantity: 5000, costPerUnit: 0.005 },
    { name: 'Bittere Bloemen keg',  unit: 'ml', quantity: 30000, minQuantity: 5000, costPerUnit: 0.005 },
    { name: 'Zieke Geest keg',      unit: 'ml', quantity: 20000, minQuantity: 4000, costPerUnit: 0.0055 },
    { name: 'Hoogheid keg',         unit: 'ml', quantity: 20000, minQuantity: 4000, costPerUnit: 0.006 },
    { name: 'Black Pudding keg',    unit: 'ml', quantity: 12000, minQuantity: 2000, costPerUnit: 0.0075 },
    { name: 'Super Bavik Pils keg', unit: 'ml', quantity: 50000, minQuantity: 10000, costPerUnit: 0.003 },

    // --- Bottle/can beers (33cl unless noted) ---
    { name: 'Ambtenaar Op Rust bottle',     unit: 'pcs', quantity: 36, minQuantity: 12, costPerUnit: 1.6 },
    { name: 'Bruismelk bottle',             unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 1.9 },
    { name: 'Guldenberg bottle',            unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 1.7 },
    { name: 'Jambe De Bois bottle',         unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 1.8 },
    { name: '3 Fonteinen Geuze 37.5cl',     unit: 'pcs', quantity: 18, minQuantity: 6,  costPerUnit: 3.5 },
    { name: '3 Fonteinen Geuze 75cl',       unit: 'pcs', quantity: 12, minQuantity: 4,  costPerUnit: 7.0 },
    { name: 'Kriek Boon 25cl',              unit: 'pcs', quantity: 36, minQuantity: 12, costPerUnit: 1.5 },
    { name: 'Oud Bruin Verzet bottle',      unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 2.0 },
    { name: 'Space Cadet bottle',           unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 1.7 },
    { name: 'Saison Dupont bottle',         unit: 'pcs', quantity: 36, minQuantity: 12, costPerUnit: 1.5 },
    { name: 'Energibajer bottle',           unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 1.8 },
    { name: 'Playground bottle',            unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 1.8 },
    { name: 'Sportzot bottle',              unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 1.9 },
    { name: 'Stouterik bottle',             unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 1.7 },
    { name: 'Fantasma bottle',              unit: 'pcs', quantity: 18, minQuantity: 6,  costPerUnit: 2.1 },
    { name: 'Gouden Carolus Classic bottle',unit: 'pcs', quantity: 36, minQuantity: 12, costPerUnit: 1.6 },
    { name: 'Orval bottle',                 unit: 'pcs', quantity: 36, minQuantity: 12, costPerUnit: 1.7 },
    { name: 'Chimay Bleue bottle',          unit: 'pcs', quantity: 36, minQuantity: 12, costPerUnit: 1.9 },
    { name: 'Chimay Tripel bottle',         unit: 'pcs', quantity: 36, minQuantity: 12, costPerUnit: 1.7 },
    { name: 'Westmalle Tripel bottle',      unit: 'pcs', quantity: 36, minQuantity: 12, costPerUnit: 1.7 },
    { name: 'Duvel bottle',                 unit: 'pcs', quantity: 48, minQuantity: 12, costPerUnit: 1.6 },

    // --- Soft drinks ---
    { name: 'Fritz Kola bottle',          unit: 'pcs', quantity: 48, minQuantity: 12, costPerUnit: 1.0 },
    { name: 'Tönissteiner Orange bottle', unit: 'pcs', quantity: 36, minQuantity: 12, costPerUnit: 1.0 },
    { name: 'Tönissteiner Citron bottle', unit: 'pcs', quantity: 36, minQuantity: 12, costPerUnit: 1.0 },
    { name: 'Spa Reine bottle',           unit: 'pcs', quantity: 60, minQuantity: 12, costPerUnit: 0.6 },
    { name: 'Spa Bruis bottle',           unit: 'pcs', quantity: 60, minQuantity: 12, costPerUnit: 0.6 },
    { name: 'Spa Reine 1L bottle',        unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 1.5 },
    { name: 'Spa Bruis 1L bottle',        unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 1.5 },
    { name: 'Homemade ice tea',           unit: 'ml', quantity: 8000, minQuantity: 1500, costPerUnit: 0.002 },
    { name: 'Homemade gember limonade',   unit: 'ml', quantity: 6000, minQuantity: 1500, costPerUnit: 0.0025 },
    { name: 'Appelsap',                   unit: 'ml', quantity: 6000, minQuantity: 1500, costPerUnit: 0.002 },
    { name: 'Worldshake bottle',          unit: 'pcs', quantity: 24, minQuantity: 6,  costPerUnit: 1.0 },
    { name: 'Sinaasappelsap',             unit: 'ml', quantity: 5000, minQuantity: 1500, costPerUnit: 0.003 },

    // --- Wine & bubbles ---
    { name: 'White wine',    unit: 'ml',  quantity: 9000, minQuantity: 1500, costPerUnit: 0.005 },
    { name: 'Rosé wine',     unit: 'ml',  quantity: 6000, minQuantity: 1500, costPerUnit: 0.005 },
    { name: 'Red wine',      unit: 'ml',  quantity: 9000, minQuantity: 1500, costPerUnit: 0.005 },
    { name: 'Crémant bottle',unit: 'pcs', quantity: 12,   minQuantity: 4,    costPerUnit: 9.0   },

    // --- Bar snacks ---
    { name: 'Chips bag', unit: 'pcs', quantity: 40, minQuantity: 12, costPerUnit: 0.5 },

    // --- Kitchen ---
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
  const stockId = (n) => byName[n]._id;
  await Item.create([
    // --- Beers (tap) — 25cl unless noted ---
    { name: 'Jour De Fête',           price: 4.2, category: beersTap._id, sortOrder: 1, recipe: [{ stockItem: stockId('Jour De Fête keg'),     qty: 250 }] },
    { name: 'Bittere Bloemen',        price: 4.2, category: beersTap._id, sortOrder: 2, recipe: [{ stockItem: stockId('Bittere Bloemen keg'),  qty: 250 }] },
    { name: 'Zieke Geest',            price: 4.5, category: beersTap._id, sortOrder: 3, recipe: [{ stockItem: stockId('Zieke Geest keg'),      qty: 250 }] },
    { name: 'Hoogheid',               price: 4.7, category: beersTap._id, sortOrder: 4, recipe: [{ stockItem: stockId('Hoogheid keg'),         qty: 250 }] },
    { name: 'Black Pudding (20cl)',   price: 4.7, category: beersTap._id, sortOrder: 5, recipe: [{ stockItem: stockId('Black Pudding keg'),    qty: 200 }] },
    { name: 'Super Bavik Pils',       price: 2.8, category: beersTap._id, sortOrder: 6, recipe: [{ stockItem: stockId('Super Bavik Pils keg'), qty: 250 }] },

    // --- Beers (bottle/can) — 33cl unless noted ---
    { name: 'Ambtenaar Op Rust',      price: 4.8, category: beersBottle._id, sortOrder: 1,  recipe: [{ stockItem: stockId('Ambtenaar Op Rust bottle'),      qty: 1 }] },
    { name: 'Bruismelk',              price: 5.5, category: beersBottle._id, sortOrder: 2,  recipe: [{ stockItem: stockId('Bruismelk bottle'),              qty: 1 }] },
    { name: 'Guldenberg',             price: 4.9, category: beersBottle._id, sortOrder: 3,  recipe: [{ stockItem: stockId('Guldenberg bottle'),             qty: 1 }] },
    { name: 'Jambe De Bois',          price: 5.1, category: beersBottle._id, sortOrder: 4,  recipe: [{ stockItem: stockId('Jambe De Bois bottle'),          qty: 1 }] },
    { name: '3 Fonteinen (37,5cl)',   price: 9.0, category: beersBottle._id, sortOrder: 5,  recipe: [{ stockItem: stockId('3 Fonteinen Geuze 37.5cl'),      qty: 1 }] },
    { name: '3 Fonteinen (75cl)',     price: 18.0,category: beersBottle._id, sortOrder: 6,  recipe: [{ stockItem: stockId('3 Fonteinen Geuze 75cl'),        qty: 1 }] },
    { name: 'Kriek Boon (25cl)',      price: 4.2, category: beersBottle._id, sortOrder: 7,  recipe: [{ stockItem: stockId('Kriek Boon 25cl'),               qty: 1 }] },
    { name: 'Oud Bruin',              price: 5.7, category: beersBottle._id, sortOrder: 8,  recipe: [{ stockItem: stockId('Oud Bruin Verzet bottle'),       qty: 1 }] },
    { name: 'Space Cadet',            price: 4.9, category: beersBottle._id, sortOrder: 9,  recipe: [{ stockItem: stockId('Space Cadet bottle'),            qty: 1 }] },
    { name: 'Saison Dupont',          price: 4.2, category: beersBottle._id, sortOrder: 10, recipe: [{ stockItem: stockId('Saison Dupont bottle'),          qty: 1 }] },
    { name: 'Energibajer (alcoholarm)', price: 5.1, category: beersBottle._id, sortOrder: 11, recipe: [{ stockItem: stockId('Energibajer bottle'),          qty: 1 }] },
    { name: 'Playground (alcoholarm)',  price: 5.1, category: beersBottle._id, sortOrder: 12, recipe: [{ stockItem: stockId('Playground bottle'),           qty: 1 }] },
    { name: 'Sportzot (alcoholarm)',    price: 5.3, category: beersBottle._id, sortOrder: 13, recipe: [{ stockItem: stockId('Sportzot bottle'),             qty: 1 }] },
    { name: 'Stouterik',              price: 4.9, category: beersBottle._id, sortOrder: 14, recipe: [{ stockItem: stockId('Stouterik bottle'),              qty: 1 }] },
    { name: 'Fantasma (glutenarm)',   price: 5.8, category: beersBottle._id, sortOrder: 15, recipe: [{ stockItem: stockId('Fantasma bottle'),               qty: 1 }] },
    { name: 'Gouden Carolus Classic', price: 4.9, category: beersBottle._id, sortOrder: 16, recipe: [{ stockItem: stockId('Gouden Carolus Classic bottle'), qty: 1 }] },
    { name: 'Orval',                  price: 4.9, category: beersBottle._id, sortOrder: 17, recipe: [{ stockItem: stockId('Orval bottle'),                  qty: 1 }] },
    { name: 'Chimay Bleue',           price: 5.2, category: beersBottle._id, sortOrder: 18, recipe: [{ stockItem: stockId('Chimay Bleue bottle'),           qty: 1 }] },
    { name: 'Chimay Tripel',          price: 4.9, category: beersBottle._id, sortOrder: 19, recipe: [{ stockItem: stockId('Chimay Tripel bottle'),          qty: 1 }] },
    { name: 'Westmalle Tripel',       price: 4.9, category: beersBottle._id, sortOrder: 20, recipe: [{ stockItem: stockId('Westmalle Tripel bottle'),       qty: 1 }] },
    { name: 'Duvel',                  price: 4.9, category: beersBottle._id, sortOrder: 21, recipe: [{ stockItem: stockId('Duvel bottle'),                  qty: 1 }] },

    // --- Soft drinks (Frisdrank) ---
    { name: 'Fritz Kola/Light',          price: 2.8, category: softDrinks._id, sortOrder: 1,  recipe: [{ stockItem: stockId('Fritz Kola bottle'),          qty: 1 }] },
    { name: 'Tönissteiner Orange',       price: 2.8, category: softDrinks._id, sortOrder: 2,  recipe: [{ stockItem: stockId('Tönissteiner Orange bottle'), qty: 1 }] },
    { name: 'Tönissteiner Citron',       price: 2.8, category: softDrinks._id, sortOrder: 3,  recipe: [{ stockItem: stockId('Tönissteiner Citron bottle'), qty: 1 }] },
    { name: 'Spa Reine / Spa Bruis',     price: 2.5, category: softDrinks._id, sortOrder: 4,  recipe: [{ stockItem: stockId('Spa Reine bottle'),           qty: 1 }] },
    { name: 'Spa Reine groot (1l)',      price: 8.0, category: softDrinks._id, sortOrder: 5,  recipe: [{ stockItem: stockId('Spa Reine 1L bottle'),        qty: 1 }] },
    { name: 'Spa Bruis groot (1l)',      price: 8.0, category: softDrinks._id, sortOrder: 6,  recipe: [{ stockItem: stockId('Spa Bruis 1L bottle'),        qty: 1 }] },
    { name: 'Homemade Ice Tea',          price: 3.9, category: softDrinks._id, sortOrder: 7,  recipe: [{ stockItem: stockId('Homemade ice tea'),           qty: 250 }] },
    { name: 'Homemade Gemberlimonade',   price: 3.9, category: softDrinks._id, sortOrder: 8,  recipe: [{ stockItem: stockId('Homemade gember limonade'),   qty: 250 }] },
    { name: 'Appelsap',                  price: 2.7, category: softDrinks._id, sortOrder: 9,  recipe: [{ stockItem: stockId('Appelsap'),                   qty: 200 }] },
    { name: 'Worldshake',                price: 2.7, category: softDrinks._id, sortOrder: 10, recipe: [{ stockItem: stockId('Worldshake bottle'),          qty: 1 }] },
    { name: 'Sinaasappelsap',            price: 2.7, category: softDrinks._id, sortOrder: 11, recipe: [{ stockItem: stockId('Sinaasappelsap'),             qty: 200 }] },

    // --- Wine & bubbles (Wijn/Bubbels) ---
    { name: 'Wit (glas)',        price: 5.0,  category: drinks._id, sortOrder: 1, recipe: [{ stockItem: stockId('White wine'), qty: 175 }] },
    { name: 'Wit (fles)',        price: 25.0, category: drinks._id, sortOrder: 2, recipe: [{ stockItem: stockId('White wine'), qty: 750 }] },
    { name: 'Rosé (glas)',       price: 5.0,  category: drinks._id, sortOrder: 3, recipe: [{ stockItem: stockId('Rosé wine'),  qty: 175 }] },
    { name: 'Rosé (fles)',       price: 25.0, category: drinks._id, sortOrder: 4, recipe: [{ stockItem: stockId('Rosé wine'),  qty: 750 }] },
    { name: 'Rood (glas)',       price: 5.0,  category: drinks._id, sortOrder: 5, recipe: [{ stockItem: stockId('Red wine'),   qty: 175 }] },
    { name: 'Rood (fles)',       price: 25.0, category: drinks._id, sortOrder: 6, recipe: [{ stockItem: stockId('Red wine'),   qty: 750 }] },
    { name: 'Crémant (glas)',    price: 6.0,  category: drinks._id, sortOrder: 7, recipe: [{ stockItem: stockId('Crémant bottle'), qty: 0.25 }] },
    { name: 'Crémant (fles)',    price: 27.5, category: drinks._id, sortOrder: 8, recipe: [{ stockItem: stockId('Crémant bottle'), qty: 1 }] },
    { name: 'Chips',             price: 2.0,  category: drinks._id, sortOrder: 9, recipe: [{ stockItem: stockId('Chips bag'),  qty: 1 }] },

    // --- Coffee, tea & chocolate (Koffie / Thee / Chocomelk) ---
    { name: 'Espresso',         price: 2.4, category: coffee._id, sortOrder: 1, recipe: [{ stockItem: stockId('Coffee beans'), qty: 8 }] },
    { name: 'Dubbele Espresso', price: 3.2, category: coffee._id, sortOrder: 2, recipe: [{ stockItem: stockId('Coffee beans'), qty: 16 }] },
    { name: 'Koffie',           price: 2.6, category: coffee._id, sortOrder: 3, recipe: [{ stockItem: stockId('Coffee beans'), qty: 10 }] },
    { name: 'Cappuccino',       price: 3.4, category: coffee._id, sortOrder: 4, recipe: [
      { stockItem: stockId('Coffee beans'), qty: 8 },
      { stockItem: stockId('Milk'),         qty: 120 },
    ] },
    { name: 'Latte',            price: 3.6, category: coffee._id, sortOrder: 5, recipe: [
      { stockItem: stockId('Coffee beans'), qty: 8 },
      { stockItem: stockId('Milk'),         qty: 200 },
    ] },
    { name: 'Satemwa thee',     price: 3.1, category: coffee._id, sortOrder: 6, recipe: [{ stockItem: stockId('Satemwa tea bag'), qty: 1 }] },
    { name: 'Verse munt',       price: 3.4, category: coffee._id, sortOrder: 7, recipe: [{ stockItem: stockId('Fresh mint'),     qty: 10 }] },
    { name: 'Homemade gember',  price: 3.9, category: coffee._id, sortOrder: 8, recipe: [{ stockItem: stockId('Fresh ginger'),   qty: 15 }] },
    { name: 'Warme Chocomelk',  price: 3.6, category: coffee._id, sortOrder: 9, recipe: [
      { stockItem: stockId('Drinking chocolate'), qty: 25 },
      { stockItem: stockId('Milk'),               qty: 200 },
    ] },

    // --- Kitchen ---
    { name: 'Cheeseburger & fries', price: 13.5, category: mains._id, sortOrder: 1, recipe: [
      { stockItem: stockId('Burger bun'),     qty: 1 },
      { stockItem: stockId('Beef patty'),     qty: 1 },
      { stockItem: stockId('Fries (frozen)'), qty: 200 },
    ] },
    { name: 'Spaghetti bolognese',  price: 12.0, category: mains._id, sortOrder: 2, recipe: [
      { stockItem: stockId('Pasta'),        qty: 130 },
      { stockItem: stockId('Tomato sauce'), qty: 100 },
    ] },
    { name: 'Tiramisu',       price: 5.5, category: desserts._id, sortOrder: 1, recipe: [{ stockItem: stockId('Tiramisu portion'),     qty: 1 }] },
    { name: 'Chocolate cake', price: 5.0, category: desserts._id, sortOrder: 2, recipe: [{ stockItem: stockId('Chocolate cake slice'), qty: 1 }] },
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

  console.log('[seed] HACCP equipment + tasks...');
  const equipment = await HaccpEquipment.create([
    { name: 'Walk-in cooler',  type: 'fridge',      location: 'Kitchen', minTempC: 0, maxTempC: 4,   sortOrder: 1 },
    { name: 'Bar fridge',      type: 'fridge',      location: 'Bar',     minTempC: 1, maxTempC: 7,   sortOrder: 2 },
    { name: 'Prep fridge',     type: 'fridge',      location: 'Kitchen', minTempC: 1, maxTempC: 4,   sortOrder: 3 },
    { name: 'Freezer',         type: 'freezer',     location: 'Kitchen', minTempC: -25, maxTempC: -18, sortOrder: 4 },
    { name: 'Hot bain-marie',  type: 'hot-holding', location: 'Pass',    minTempC: 63, maxTempC: 80,  sortOrder: 5 },
  ]);

  const cleaningTasks = await HaccpCleaningTask.create([
    { name: 'Mop kitchen floor',          area: 'Kitchen', frequency: 'daily',   sortOrder: 1 },
    { name: 'Sanitise prep surfaces',     area: 'Kitchen', frequency: 'daily',   sortOrder: 2 },
    { name: 'Empty + clean grease trap',  area: 'Kitchen', frequency: 'weekly',  sortOrder: 3 },
    { name: 'Defrost + clean freezer',    area: 'Kitchen', frequency: 'monthly', sortOrder: 4 },
    { name: 'Clean bar taps + drip tray', area: 'Bar',     frequency: 'daily',   sortOrder: 5 },
    { name: 'Toilets deep clean',         area: 'Toilets', frequency: 'daily',   sortOrder: 6 },
  ]);

  console.log('[seed] HACCP sample logs...');
  // Two readings per equipment per day for the past 7 days.
  const tempLogs = [];
  for (let d = 0; d < 7; d++) {
    for (const eq of equipment) {
      for (const hour of [9, 17]) {
        const target = (eq.minTempC + eq.maxTempC) / 2;
        const drift = (Math.random() - 0.5) * (eq.maxTempC - eq.minTempC) * 0.6;
        const tC = Math.round((target + drift) * 10) / 10;
        const recordedAt = new Date(now - d * day - (24 - hour) * 3600 * 1000);
        const inRange = tC >= eq.minTempC && tC <= eq.maxTempC;
        tempLogs.push({
          equipment: eq._id,
          recordedAt,
          recordedBy: staff[3 + (d % 2)]._id, // kitchen rotates
          temperatureC: tC,
          inRange,
          correctiveAction: inRange ? '' : 'Adjusted thermostat, monitored 30 min, stable.',
        });
      }
    }
  }
  await HaccpTemperatureLog.create(tempLogs);

  // Daily tasks logged most days, weekly tasks once or twice, monthly once.
  const cleaningLogs = [];
  for (const t of cleaningTasks) {
    const span = t.frequency === 'daily' ? 7 : t.frequency === 'weekly' ? 14 : 30;
    const stride = t.frequency === 'daily' ? 1 : t.frequency === 'weekly' ? 7 : 30;
    for (let d = 0; d < span; d += stride) {
      if (t.frequency === 'daily' && Math.random() < 0.15) continue; // simulate a missed day
      cleaningLogs.push({
        task: t._id,
        completedAt: new Date(now - d * day - (3 + Math.random() * 4) * 3600 * 1000),
        completedBy: staff[3 + Math.floor(Math.random() * 2)]._id,
      });
    }
  }
  await HaccpCleaningLog.create(cleaningLogs);

  await HaccpReceivingLog.create([
    {
      receivedAt: new Date(now - 1 * day),
      receivedBy: staff[3]._id,
      supplier: 'Vleesgroothandel Janssens',
      itemsSummary: '8 kg kalfslever, 5 kg gehakt, 12 kg kippenfilet',
      temperatureC: 3.4,
      packagingOk: true,
      expiryOk: true,
    },
    {
      receivedAt: new Date(now - 2 * day),
      receivedBy: staff[4]._id,
      supplier: 'Bakker De Smet',
      itemsSummary: '40× pistolets, 10× tarwebrood',
      packagingOk: true,
      expiryOk: true,
    },
    {
      receivedAt: new Date(now - 3 * day),
      receivedBy: staff[3]._id,
      supplier: 'Vishandel Oostende',
      itemsSummary: '4 kg zalmfilet, 2 kg kabeljauw',
      temperatureC: 6.2,
      packagingOk: true,
      expiryOk: false,
      correctiveAction: 'Short-dated kabeljauw — used same day, supplier notified.',
    },
  ]);

  console.log('[seed] done.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
