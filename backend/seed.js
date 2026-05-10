require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const Category = require("./models/Category");
const Item = require("./models/Item");
const StockItem = require("./models/StockItem");
const Room = require("./models/Room");
const Table = require("./models/Table");
const Staff = require("./models/Staff");
const Shift = require("./models/Shift");
const Order = require("./models/Order");
const Reservation = require("./models/Reservation");
const HaccpEquipment = require("./models/HaccpEquipment");
const HaccpTemperatureLog = require("./models/HaccpTemperatureLog");
const HaccpCleaningTask = require("./models/HaccpCleaningTask");
const HaccpCleaningLog = require("./models/HaccpCleaningLog");
const HaccpReceivingLog = require("./models/HaccpReceivingLog");
const Absence = require("./models/Absence");

async function run() {
  await connectDB(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/patron");

  console.log("[seed] clearing collections...");
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
    Absence.deleteMany({}),
  ]);

  console.log("[seed] rooms...");
  await Room.create([
    { name: "Main", color: "#f59e0b", sortOrder: 1 },
    { name: "Bar", color: "#3b82f6", sortOrder: 2 },
    { name: "Terrace", color: "#10b981", sortOrder: 3 },
  ]);

  console.log("[seed] categories...");
  // Two top-level parents: Food + Drinks. Existing categories become
  // their children, plus a fresh Wine sub-category under Drinks.
  // The customer menu (order.html) and the POS render this as a
  // two-tier filter: parent chips on top, sub-category chips below.
  const [food, drinks] = await Category.create([
    { name: "Food", color: "#dc2626", sortOrder: 1 },
    { name: "Drinks", color: "#0ea5e9", sortOrder: 2 },
  ]);
  const [
    mains,
    desserts,
    snacks,
    beersTap,
    beersBottle,
    beersTemp,
    softDrinks,
    coffee,
    wine,
  ] = await Category.create([
    // Food sub-categories
    { name: "Mains", color: "#dc2626", sortOrder: 1, parent: food._id },
    { name: "Desserts", color: "#db2777", sortOrder: 2, parent: food._id },
    { name: "Snacks", color: "#ca8a04", sortOrder: 3, parent: food._id },
    // Drinks sub-categories
    { name: "Beers (tap)", color: "#f59e0b", sortOrder: 1, parent: drinks._id },
    {
      name: "Beers (bottle)",
      color: "#b45309",
      sortOrder: 2,
      parent: drinks._id,
    },
    {
      name: "Temporary beers",
      color: "#7c3aed",
      sortOrder: 3,
      parent: drinks._id,
    },
    { name: "Soft drinks", color: "#22c55e", sortOrder: 4, parent: drinks._id },
    {
      name: "Coffee & Tea",
      color: "#a16207",
      sortOrder: 5,
      parent: drinks._id,
    },
    { name: "Wine", color: "#9f1239", sortOrder: 6, parent: drinks._id },
  ]);

  console.log("[seed] stock...");
  const stock = await StockItem.create([
    // --- Coffee & tea bar ---
    {
      name: "Coffee beans",
      unit: "g",
      quantity: 5000,
      minQuantity: 1000,
      costPerUnit: 0.025,
    },
    {
      name: "Milk",
      unit: "ml",
      quantity: 12000,
      minQuantity: 4000,
      costPerUnit: 0.0012,
    },
    {
      name: "Satemwa tea bag",
      unit: "pcs",
      quantity: 200,
      minQuantity: 50,
      costPerUnit: 0.3,
    },
    {
      name: "Fresh mint",
      unit: "g",
      quantity: 500,
      minQuantity: 100,
      costPerUnit: 0.05,
    },
    {
      name: "Fresh ginger",
      unit: "g",
      quantity: 1000,
      minQuantity: 200,
      costPerUnit: 0.04,
    },
    {
      name: "Drinking chocolate",
      unit: "g",
      quantity: 2000,
      minQuantity: 500,
      costPerUnit: 0.03,
    },

    // --- Tap kegs (Vleesmeester eigen brouwsels + Super Bavik) ---
    {
      name: "Jour De Fête keg",
      unit: "ml",
      quantity: 30000,
      minQuantity: 5000,
      costPerUnit: 0.005,
    },
    {
      name: "Bittere Bloemen keg",
      unit: "ml",
      quantity: 30000,
      minQuantity: 5000,
      costPerUnit: 0.005,
    },
    {
      name: "Zieke Geest keg",
      unit: "ml",
      quantity: 20000,
      minQuantity: 4000,
      costPerUnit: 0.0055,
    },
    {
      name: "Hoogheid keg",
      unit: "ml",
      quantity: 20000,
      minQuantity: 4000,
      costPerUnit: 0.006,
    },
    {
      name: "Black Pudding keg",
      unit: "ml",
      quantity: 12000,
      minQuantity: 2000,
      costPerUnit: 0.0075,
    },
    {
      name: "Super Bavik Pils keg",
      unit: "ml",
      quantity: 50000,
      minQuantity: 10000,
      costPerUnit: 0.003,
    },

    // --- Bottle/can beers (33cl unless noted) ---
    {
      name: "Ambtenaar Op Rust bottle",
      unit: "pcs",
      quantity: 36,
      minQuantity: 12,
      costPerUnit: 1.6,
    },
    {
      name: "Bruismelk bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 1.9,
    },
    {
      name: "Guldenberg bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 1.7,
    },
    {
      name: "Jambe De Bois bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 1.8,
    },
    {
      name: "3 Fonteinen Geuze 37.5cl",
      unit: "pcs",
      quantity: 18,
      minQuantity: 6,
      costPerUnit: 3.5,
    },
    {
      name: "3 Fonteinen Geuze 75cl",
      unit: "pcs",
      quantity: 12,
      minQuantity: 4,
      costPerUnit: 7.0,
    },
    {
      name: "Kriek Boon 25cl",
      unit: "pcs",
      quantity: 36,
      minQuantity: 12,
      costPerUnit: 1.5,
    },
    {
      name: "Oud Bruin Verzet bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 2.0,
    },
    {
      name: "Space Cadet bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 1.7,
    },
    {
      name: "Saison Dupont bottle",
      unit: "pcs",
      quantity: 36,
      minQuantity: 12,
      costPerUnit: 1.5,
    },
    {
      name: "Energibajer bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 1.8,
    },
    {
      name: "Playground bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 1.8,
    },
    {
      name: "Sportzot bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 1.9,
    },
    {
      name: "Stouterik bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 1.7,
    },
    {
      name: "Fantasma bottle",
      unit: "pcs",
      quantity: 18,
      minQuantity: 6,
      costPerUnit: 2.1,
    },
    {
      name: "Gouden Carolus Classic bottle",
      unit: "pcs",
      quantity: 36,
      minQuantity: 12,
      costPerUnit: 1.6,
    },
    {
      name: "Orval bottle",
      unit: "pcs",
      quantity: 36,
      minQuantity: 12,
      costPerUnit: 1.7,
    },
    {
      name: "Chimay Bleue bottle",
      unit: "pcs",
      quantity: 36,
      minQuantity: 12,
      costPerUnit: 1.9,
    },
    {
      name: "Chimay Tripel bottle",
      unit: "pcs",
      quantity: 36,
      minQuantity: 12,
      costPerUnit: 1.7,
    },
    {
      name: "Westmalle Tripel bottle",
      unit: "pcs",
      quantity: 36,
      minQuantity: 12,
      costPerUnit: 1.7,
    },
    {
      name: "Duvel bottle",
      unit: "pcs",
      quantity: 48,
      minQuantity: 12,
      costPerUnit: 1.6,
    },

    // --- Soft drinks ---
    {
      name: "Fritz Kola bottle",
      unit: "pcs",
      quantity: 48,
      minQuantity: 12,
      costPerUnit: 1.0,
    },
    {
      name: "Tönissteiner Orange bottle",
      unit: "pcs",
      quantity: 36,
      minQuantity: 12,
      costPerUnit: 1.0,
    },
    {
      name: "Tönissteiner Citron bottle",
      unit: "pcs",
      quantity: 36,
      minQuantity: 12,
      costPerUnit: 1.0,
    },
    {
      name: "Spa Reine bottle",
      unit: "pcs",
      quantity: 60,
      minQuantity: 12,
      costPerUnit: 0.6,
    },
    {
      name: "Spa Bruis bottle",
      unit: "pcs",
      quantity: 60,
      minQuantity: 12,
      costPerUnit: 0.6,
    },
    {
      name: "Spa Reine 1L bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 1.5,
    },
    {
      name: "Spa Bruis 1L bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 1.5,
    },
    {
      name: "Homemade ice tea",
      unit: "ml",
      quantity: 8000,
      minQuantity: 1500,
      costPerUnit: 0.002,
    },
    {
      name: "Homemade gember limonade",
      unit: "ml",
      quantity: 6000,
      minQuantity: 1500,
      costPerUnit: 0.0025,
    },
    {
      name: "Appelsap",
      unit: "ml",
      quantity: 6000,
      minQuantity: 1500,
      costPerUnit: 0.002,
    },
    {
      name: "Worldshake bottle",
      unit: "pcs",
      quantity: 24,
      minQuantity: 6,
      costPerUnit: 1.0,
    },
    {
      name: "Sinaasappelsap",
      unit: "ml",
      quantity: 5000,
      minQuantity: 1500,
      costPerUnit: 0.003,
    },

    // --- Wine & bubbles ---
    {
      name: "White wine",
      unit: "ml",
      quantity: 9000,
      minQuantity: 1500,
      costPerUnit: 0.005,
    },
    {
      name: "Rosé wine",
      unit: "ml",
      quantity: 6000,
      minQuantity: 1500,
      costPerUnit: 0.005,
    },
    {
      name: "Red wine",
      unit: "ml",
      quantity: 9000,
      minQuantity: 1500,
      costPerUnit: 0.005,
    },
    {
      name: "Crémant bottle",
      unit: "pcs",
      quantity: 12,
      minQuantity: 4,
      costPerUnit: 9.0,
    },

    // --- Bar snacks ---
    {
      name: "Chips bag salt",
      unit: "pcs",
      quantity: 40,
      minQuantity: 12,
      costPerUnit: 0.5,
    },
    {
      name: "Chips bag paprika",
      unit: "pcs",
      quantity: 40,
      minQuantity: 12,
      costPerUnit: 0.5,
    },
    {
      name: "Chips bag bolognese",
      unit: "pcs",
      quantity: 40,
      minQuantity: 12,
      costPerUnit: 0.5,
    },

    // --- Kitchen ---
    {
      name: "Burger bun",
      unit: "pcs",
      quantity: 50,
      minQuantity: 10,
      costPerUnit: 0.4,
    },
    {
      name: "Beef patty",
      unit: "pcs",
      quantity: 40,
      minQuantity: 10,
      costPerUnit: 1.8,
    },
    {
      name: "Fries (frozen)",
      unit: "g",
      quantity: 20000,
      minQuantity: 4000,
      costPerUnit: 0.003,
    },
    {
      name: "Pasta",
      unit: "g",
      quantity: 15000,
      minQuantity: 3000,
      costPerUnit: 0.002,
    },
    {
      name: "Tomato sauce",
      unit: "ml",
      quantity: 8000,
      minQuantity: 1500,
      costPerUnit: 0.003,
    },
    {
      name: "Tiramisu portion",
      unit: "pcs",
      quantity: 20,
      minQuantity: 5,
      costPerUnit: 1.4,
    },
    {
      name: "Chocolate cake slice",
      unit: "pcs",
      quantity: 18,
      minQuantity: 4,
      costPerUnit: 1.2,
    },
  ]);
  const byName = Object.fromEntries(stock.map((s) => [s.name, s]));

  console.log("[seed] items...");
  const stockId = (n) => byName[n]._id;
  // Helper — every beer gets an infoUrl pointing at Untappd. The
  // search URL pattern is guaranteed to resolve (Untappd never 404s
  // a search), so the in-app unfurl card always has something to
  // show; the manager can swap in the direct beer page URL later.
  const untappd = (name) =>
    "https://untappd.com/search?q=" + encodeURIComponent(name);
  // Generic placeholder image generator — deterministic per item name.
  // Picsum returns a real photo for every URL; the manager will swap
  // in real product photos via the Items page. Kept off most items
  // so the magazine placeholder disc is exercised too.
  const photo = (slug) =>
    "https://picsum.photos/seed/patron-" +
    encodeURIComponent(slug) +
    "/600/600";

  await Item.create([
    // --- Beers (tap) — 25cl unless noted ---
    {
      name: "Jour De Fête",
      price: 4.2,
      category: beersTap._id,
      sortOrder: 1,
      description: "Vleesmeester · table beer · 4.5%",
      infoUrl:
        "https://untappd.com/b/vleesmeester-brewery-jour-de-fete/1653091",
      imageUrl:
        "https://www.vleesmeesterbrewery.eu/wp-content/uploads/2020/12/Jour-De-Fe%CC%82te-Label-Shop-01.png",
      recipe: [{ stockItem: stockId("Jour De Fête keg"), qty: 250 }],
    },
    {
      name: "Bittere Bloemen",
      price: 4.2,
      category: beersTap._id,
      sortOrder: 2,
      description: "Vleesmeester · pale ale · 5.5%",
      infoUrl:
        "https://untappd.com/b/vleesmeester-brewery-bittere-bloemen/965931",
      imageUrl:
        "https://www.vleesmeesterbrewery.eu/wp-content/uploads/2020/12/Bittere-Bloemen-Label-Shop-01.png",
      recipe: [{ stockItem: stockId("Bittere Bloemen keg"), qty: 250 }],
    },
    {
      name: "Zieke Geest",
      price: 4.5,
      category: beersTap._id,
      sortOrder: 3,
      description: "Vleesmeester · IPA · 6.5%",
      infoUrl: "https://untappd.com/b/vleesmeester-brewery-zieke-geest/207880",
      imageUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZhnE2zpYWBkys8brvbjFyYdJTW_6DBJEcGQ&s",
      recipe: [{ stockItem: stockId("Zieke Geest keg"), qty: 250 }],
    },
    {
      name: "Hoogheid",
      price: 4.7,
      category: beersTap._id,
      sortOrder: 4,
      description: "Vleesmeester · tripel · 8%",
      infoUrl: "https://untappd.com/b/vleesmeester-brewery-hoogheid/579523",
      imageUrl:
        "https://www.vleesmeesterbrewery.eu/wp-content/uploads/2020/12/Hoogheid-Label-Shop-01.png",
      recipe: [{ stockItem: stockId("Hoogheid keg"), qty: 250 }],
    },
    {
      name: "Black Pudding (20cl)",
      price: 4.7,
      category: beersTap._id,
      sortOrder: 5,
      description: "Vleesmeester · imperial stout · 9%",
      infoUrl:
        "https://untappd.com/b/vleesmeester-brewery-black-pudding/3176111",
      imageUrl:
        "https://www.vleesmeesterbrewery.eu/wp-content/uploads/2020/12/Black-Pudding-Label-Shop-01.png",
      recipe: [{ stockItem: stockId("Black Pudding keg"), qty: 200 }],
    },
    {
      name: "Super Bavik Pils",
      price: 2.8,
      category: beersTap._id,
      sortOrder: 6,
      description: "Bavik · pils · 5.2%",
      infoUrl:
        "https://untappd.com/b/brouwerij-de-brabandere-bavik-super-pils/17265",
      imageUrl:
        "https://www.brouwerijdebrabandere.be/data/images/news/bavik-super-pils-wba-2021.png",
      recipe: [{ stockItem: stockId("Super Bavik Pils keg"), qty: 250 }],
    },

    // --- Beers (bottle/can) — 33cl unless noted ---
    {
      name: "Ambtenaar Op Rust",
      price: 4.8,
      category: beersBottle._id,
      sortOrder: 1,
      description: "Vleesmeester · barrel-aged sour",
      infoUrl:
        "https://untappd.com/b/vleesmeester-brewery-ambtenaar-op-rust/4043655",
      imageUrl:
        "https://postmybeer.be/cdn/shop/files/IMG_5623.jpg?v=1698858605&width=1206",
      recipe: [{ stockItem: stockId("Ambtenaar Op Rust bottle"), qty: 1 }],
    },
    {
      name: "Bruismelk",
      price: 5.5,
      category: beersBottle._id,
      sortOrder: 2,
      description: "Wild ale met melkzuur",
      infoUrl: "https://untappd.com/b/vleesmeester-brewery-bruismelk/4520540",
      imageUrl:
        "https://i0.wp.com/www.beerandcooking.be/wp-content/uploads/2023/05/bruismelk-e1683057168481.jpg",
      recipe: [{ stockItem: stockId("Bruismelk bottle"), qty: 1 }],
    },
    {
      name: "Guldenberg",
      price: 4.9,
      category: beersBottle._id,
      sortOrder: 3,
      description: "De Ranke · belgian tripel · 8%",
      infoUrl: "https://untappd.com/b/brouwerij-de-ranke-guldenberg/486",
      imageUrl:
        "https://www.deranke.be/foto.php?w=500&h=800&zc=2&src=files/bier/flesje/derankeguldenberg300clmg2094.jpg",
      recipe: [{ stockItem: stockId("Guldenberg bottle"), qty: 1 }],
    },
    {
      name: "Jambe De Bois",
      price: 5.1,
      category: beersBottle._id,
      sortOrder: 4,
      description: "Brasserie de la Senne · tripel · 8%",
      infoUrl:
        "https://untappd.com/b/brasserie-de-la-senne-jambe-de-bois/71015",
      imageUrl: "https://www.bierenwijnhuis.be/82/jambe-de-bois-33cl.jpg",
      recipe: [{ stockItem: stockId("Jambe De Bois bottle"), qty: 1 }],
    },
    {
      name: "3 Fonteinen (37,5cl)",
      price: 9.0,
      category: beersBottle._id,
      sortOrder: 5,
      description: "3 Fonteinen · oude geuze · 6%",
      infoUrl:
        "https://untappd.com/b/brouwerij-3-fonteinen-3-fonteinen-oude-geuze/4009",
      imageUrl:
        "https://www.rob-brussels.be/media/catalog/product/cache/4674fdbecbe8e81d26c2d902fe2fbc48/f/b/f-bi-guvep-1020-f-bi-guvep-1020-image_1-090519_4387.jpg",
      recipe: [{ stockItem: stockId("3 Fonteinen Geuze 37.5cl"), qty: 1 }],
    },
    {
      name: "3 Fonteinen (75cl)",
      price: 18.0,
      category: beersBottle._id,
      sortOrder: 6,
      description: "3 Fonteinen · oude geuze · te delen",
      infoUrl:
        "https://www.huisvandegeuze.be/wp-content/uploads/2022/11/3-Fonteinen-Oude-Geuze.webp",
      imageUrl:
        "https://www.vleesmeesterbrewery.eu/wp-content/uploads/2020/12/Jour-De-Fe%CC%82te-Label-Shop-01.png",
      recipe: [{ stockItem: stockId("3 Fonteinen Geuze 75cl"), qty: 1 }],
    },
    {
      name: "Kriek Boon (25cl)",
      price: 4.2,
      category: beersBottle._id,
      sortOrder: 7,
      description: "Brouwerij Boon · kriek lambic · 4%",
      infoUrl: "https://untappd.com/b/brouwerij-boon-kriek-boon/2565",
      imageUrl:
        "https://boon.be/media/pages/onze-bieren/fruitbieren/27a5dee762-1751362530/boon-3-424482-warmer-vert.jpg",
      recipe: [{ stockItem: stockId("Kriek Boon 25cl"), qty: 1 }],
    },
    {
      name: "Oud Bruin",
      price: 5.7,
      category: beersBottle._id,
      sortOrder: 8,
      description: "Brouwerij Verzet · oud bruin · 6%",
      infoUrl: "https://untappd.com/b/brouwerij-t-verzet-oud-bruin/238983",
      imageUrl:
        "https://www.belgianbrewed.com/Media/_T%20Verzet%20Oud%20Bruin%2033cl.JPG",
      recipe: [{ stockItem: stockId("Oud Bruin Verzet bottle"), qty: 1 }],
    },
    {
      name: "Space Cadet",
      price: 4.9,
      category: beersBottle._id,
      sortOrder: 9,
      description: "NEIPA · sappig en juicy",
      infoUrl: "https://untappd.com/b/brouwerij-t-verzet-space-cadet/2548028",
      imageUrl:
        "https://www.belgianbeerheaven.com/be/nl/thumbnail/detail/nv75L/'T-Verzet-Space-Cadet-33cl---16141-1700043162.png",
      recipe: [{ stockItem: stockId("Space Cadet bottle"), qty: 1 }],
    },
    {
      name: "Saison Dupont",
      price: 4.2,
      category: beersBottle._id,
      sortOrder: 10,
      description: "Brasserie Dupont · saison · 6.5%",
      infoUrl: "http://untappd.com/b/brasserie-dupont-saison-dupont/8073",
      imageUrl:
        "https://www.belgianbeerheaven.com/be/nl/thumbnail/detail/nv75L/'T-Verzet-Space-Cadet-33cl---16141-1700043162.png",
      recipe: [{ stockItem: stockId("Saison Dupont bottle"), qty: 1 }],
    },
    {
      name: "Energibajer (alcoholarm)",
      price: 5.1,
      category: beersBottle._id,
      sortOrder: 11,
      description: "Mikkeller · 0.3% · alcoholarm",
      infoUrl: "https://untappd.com/b/mikkeller-energibajer/1417905",
      imageUrl:
        "https://www.bierhandelwillems.be/media/images/catalog/article/7127/big/4084.jpg",
      recipe: [{ stockItem: stockId("Energibajer bottle"), qty: 1 }],
    },
    {
      name: "Playground (alcoholarm)",
      price: 5.1,
      category: beersBottle._id,
      sortOrder: 12,
      description: "NEIPA-stijl · 0.3% · alcoholarm",
      infoUrl:
        "https://untappd.com/b/vandestreek-bier-playground-non-alcoholic-ipa/2016153",
      imageUrl:
        "https://www.belgianbeerheaven.com/be/nl/thumbnail/detail/RVMqY/VandeStreek-Playground-Non-Alcoholic-IPA-33Cl---940172-1755184286.png",
      recipe: [{ stockItem: stockId("Playground bottle"), qty: 1 }],
    },
    {
      name: "Sportzot (alcoholarm)",
      price: 5.3,
      category: beersBottle._id,
      sortOrder: 13,
      description: "Brugge · 0.4% · alcoholarm",
      infoUrl: "https://untappd.com/b/brouwerij-de-halve-maan-sportzot/2707451",
      imageUrl:
        "https://www.halvemaan.be/sites/default/files/styles/ct_beer/public/2025-05/sz_33cl_fles_en_blik_0.png?itok=MG_v6ode",
      recipe: [{ stockItem: stockId("Sportzot bottle"), qty: 1 }],
    },
    {
      name: "Stouterik",
      price: 4.9,
      category: beersBottle._id,
      sortOrder: 14,
      description: "Brussels Beer Project · stout · 4.5%",
      infoUrl: "https://untappd.com/b/brasserie-de-la-senne-stouterik/212",
      imageUrl:
        "https://www.prikentik.be/media/catalog/product/s/t/stouterik_bouteille.jpg",
      recipe: [{ stockItem: stockId("Stouterik bottle"), qty: 1 }],
    },
    {
      name: "Fantasma (glutenarm)",
      price: 5.8,
      category: beersBottle._id,
      sortOrder: 15,
      description: "IPA · glutenarm · 6.6%",
      infoUrl: "https://untappd.com/b/magic-rock-brewing-fantasma/1950523",
      imageUrl:
        "https://cdn.webshopapp.com/shops/317814/files/470594615/1500x1500x2/magic-rock-magic-rock-fantasma-ipa-glutenvrij-33cl.jpg",
      recipe: [{ stockItem: stockId("Fantasma bottle"), qty: 1 }],
    },
    {
      name: "Gouden Carolus Classic",
      price: 4.9,
      category: beersBottle._id,
      sortOrder: 16,
      description: "Het Anker · belgian dark · 8.5%",
      infoUrl:
        "https://untappd.com/b/brouwerij-het-anker-gouden-carolus-classic/9087",
      imageUrl:
        "https://belgiancraftbeers.com/wp-content/uploads/2020/05/Gouden-Carolus-Classic-3.png",
      recipe: [{ stockItem: stockId("Gouden Carolus Classic bottle"), qty: 1 }],
    },
    {
      name: "Orval",
      price: 4.9,
      category: beersBottle._id,
      sortOrder: 17,
      description: "Trappist Orval · trappist ale · 6.2%",
      infoUrl: "https://untappd.com/b/brouwerij-t-verzet-space-cadet/2548028",
      imageUrl:
        "https://www.belgianbeerheaven.com/be/nl/thumbnail/detail/nv75L/'T-Verzet-Space-Cadet-33cl---16141-1700043162.png",
      recipe: [{ stockItem: stockId("Orval bottle"), qty: 1 }],
    },
    {
      name: "Chimay Bleue",
      price: 5.2,
      category: beersBottle._id,
      sortOrder: 18,
      description: "Trappist Chimay · grande réserve · 9%",
      infoUrl: "https://untappd.com/b/brasserie-d-orval-orval/851",
      imageUrl: "https://www.belgianbrewed.com/Media/Orval%2033cl.JPG",
      recipe: [{ stockItem: stockId("Chimay Bleue bottle"), qty: 1 }],
    },
    {
      name: "Chimay Tripel",
      price: 4.9,
      category: beersBottle._id,
      sortOrder: 19,
      description: "Trappist Chimay · cinq cents · 8%",
      infoUrl:
        "https://untappd.com/b/bieres-de-chimay-chimay-cinq-cents-white/10049",
      imageUrl:
        "https://asterx.be/sites/default/files/assortiment/chimay-tripel.jpg",
      recipe: [{ stockItem: stockId("Chimay Tripel bottle"), qty: 1 }],
    },
    {
      name: "Westmalle Tripel",
      price: 4.9,
      category: beersBottle._id,
      sortOrder: 20,
      description: "Trappist Westmalle · tripel · 9.5%",
      infoUrl:
        "https://untappd.com/b/brouwerij-der-trappisten-van-westmalle-westmalle-trappist-tripel/487",
      imageUrl:
        "https://www.trappistwestmalle.be/wp-content/uploads/2023/03/Westmalle-Tripel-e1679067890610.png",
      recipe: [{ stockItem: stockId("Westmalle Tripel bottle"), qty: 1 }],
    },
    {
      name: "Duvel",
      price: 4.9,
      category: beersBottle._id,
      sortOrder: 21,
      description: "Duvel Moortgat · golden ale · 8.5%",
      infoUrl: "https://untappd.com/b/duvel-moortgat-duvel/6868",
      imageUrl:
        "https://www.duvel.com/files/contentBuilder/Beer/Duvel/_960x960_crop_center-center_61_line/Duvel_ratebeer1000.png",
      recipe: [{ stockItem: stockId("Duvel bottle"), qty: 1 }],
    },

    // --- Soft drinks (Frisdrank) ---
    {
      name: "Fritz Kola/Light",
      price: 2.8,
      category: softDrinks._id,
      sortOrder: 1,
      description: "Fritz Kola · 33cl · gewoon of light",
      infoUrl:
        "https://fritz-kola-shop.com/products/fritz-kola-classic-light-0-33-l?srsltid=AfmBOopAecokUSUf0Kx7Xg_57Zf8JvWflJB05hQ0Yl99RC5nipH4BGM8",
      imageUrl:
        "https://fritz-kola-shop.com/cdn/shop/files/fritz-kola-classic-light-0_33-ice-cold.jpg?v=1722525496&width=1500",
      recipe: [{ stockItem: stockId("Fritz Kola bottle"), qty: 1 }],
    },
    {
      name: "Tönissteiner Orange",
      price: 2.8,
      category: softDrinks._id,
      sortOrder: 2,
      description: "Tönissteiner · sinaas · 25cl",
      infoUrl: "https://www.tonissteiner.be/fr/gamme/orange_fit",
      imageUrl:
        "https://www.tonissteiner.be/img/bottles/orange_fit/orange_fit_main.png",
      recipe: [{ stockItem: stockId("Tönissteiner Orange bottle"), qty: 1 }],
    },
    {
      name: "Tönissteiner Citron",
      price: 2.8,
      category: softDrinks._id,
      sortOrder: 3,
      description: "Tönissteiner · citroen · 25cl",
      infoUrl: "https://www.tonissteiner.be/fr/gamme/zitrone_fit",
      imageUrl:
        "https://www.tonissteiner.be/img/bottles/zitrone_fit/zitrone_fit_main.png",
      recipe: [{ stockItem: stockId("Tönissteiner Citron bottle"), qty: 1 }],
    },
    {
      name: "Spa Bruis",
      price: 2.5,
      category: softDrinks._id,
      sortOrder: 4,
      description: "Spa · bruis · 25cl",
      imageUrl:
        "https://thysshop.be/3985-large_default/Spa-water-Bruis-25-cl-Fles.jpg",
      recipe: [{ stockItem: stockId("Spa Bruis bottle"), qty: 1 }],
    },
    {
      name: "Spa Reine",
      price: 2.5,
      category: softDrinks._id,
      sortOrder: 4,
      description: "Spa · plat · 25cl",
      imageUrl:
        "https://www.javafoodservice.be/fr/image-service/_jcr_content.product.05410013105503.image/2/large.jpeg",
      recipe: [{ stockItem: stockId("Spa Reine bottle"), qty: 1 }],
    },
    {
      name: "Spa Reine groot (1l)",
      price: 8.0,
      category: softDrinks._id,
      sortOrder: 5,
      description: "Spa plat · 1L · te delen",
      imageUrl:
        "https://www.rob-brussels.be/media/catalog/product/cache/4674fdbecbe8e81d26c2d902fe2fbc48/b/e/b-ea-plcon-1015-b-ea-plcon-1015-image_1-230217_2412.jpg",
      recipe: [{ stockItem: stockId("Spa Reine 1L bottle"), qty: 1 }],
    },
    {
      name: "Spa Bruis groot (1l)",
      price: 8.0,
      category: softDrinks._id,
      sortOrder: 6,
      description: "Spa bruis · 1L · te delen",
      imageUrl:
        "https://thysshop.be/3971-large_default/Spa-water-Bruis-1-liter-Fles.jpg",
      recipe: [{ stockItem: stockId("Spa Bruis 1L bottle"), qty: 1 }],
    },
    {
      name: "Homemade Ice Tea",
      price: 3.9,
      category: softDrinks._id,
      sortOrder: 7,
      description: "Huisgemaakte ice tea · zwarte thee, citroen, perzik",
      imageUrl:
        "https://www.cocktails-road.com/images/recipe/2023/08/homemade-sweet-iced-tea-american-style.jpg",
      recipe: [{ stockItem: stockId("Homemade ice tea"), qty: 250 }],
    },
    {
      name: "Homemade Gemberlimonade",
      price: 3.9,
      category: softDrinks._id,
      sortOrder: 8,
      description:
        "Verse gember, limoen en honing · pittig en frisser dan een gewone limo",
      imageUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQI_VaxAdXnS-L4Oy9MZFtWZzNyW85sK5--HA&s",
      recipe: [{ stockItem: stockId("Homemade gember limonade"), qty: 250 }],
    },
    {
      name: "Appelsap",
      price: 2.7,
      category: softDrinks._id,
      sortOrder: 9,
      description: "Belgisch appelsap · troebel, ongezoet",
      imageUrl: "https://www.oxfamfairtrade.be/wp-content/uploads/21108.jpg",
      recipe: [{ stockItem: stockId("Appelsap"), qty: 200 }],
    },
    {
      name: "Worldshake",
      price: 2.7,
      category: softDrinks._id,
      sortOrder: 10,
      description:
        "Worldshake · vegan smoothie · vraag de smaak van de dag aan uw kelner",
      imageUrl:
        "https://www.oxfamfairtrade.be/wp-content/uploads/21102-1024x1024.jpg",
      recipe: [{ stockItem: stockId("Worldshake bottle"), qty: 1 }],
    },
    {
      name: "Sinaasappelsap",
      price: 2.7,
      category: softDrinks._id,
      sortOrder: 11,
      description: "sinaasappel",
      imageUrl:
        "https://www.javafoodservice.be/nl/image-service/_jcr_content.product.05400164211000.image/1/large.jpeg",
      recipe: [{ stockItem: stockId("Sinaasappelsap"), qty: 200 }],
    },
    // Chips moved to the Food → Snacks sub-category so the QR menu
    // shows them under "Food", not "Drinks".
    {
      name: "Chips zout",
      price: 2.0,
      category: snacks._id,
      sortOrder: 1,
      description: "Belgische artisan chips · zout",
      imageUrl:
        "https://cdn.webshopapp.com/shops/70983/files/318287052/800x1024x2/croky-chips-zout-40g-x-20st.jpg",
      recipe: [{ stockItem: stockId("Chips bag salt"), qty: 1 }],
    },
    {
      name: "Chips paprika",
      price: 2.0,
      category: snacks._id,
      sortOrder: 2,
      description: "Belgische artisan chips · paprika",
      imageUrl:
        "https://static.ah.nl/dam/product/AHI_4354523130313133323434?revLabel=1&rendition=400x400_JPG_Q85&fileType=binary",
      recipe: [{ stockItem: stockId("Chips bag paprika"), qty: 1 }],
    },
    {
      name: "Chips bolognese",
      price: 2.0,
      category: snacks._id,
      sortOrder: 3,
      description: "Belgische artisan chips · bolognese",
      imageUrl:
        "https://www.javafoodservice.be/nl/image-service/_jcr_content.product.05414359710520.image/1/large.jpeg",
      recipe: [{ stockItem: stockId("Chips bag bolognese"), qty: 1 }],
    },

    // --- Wine & bubbles (Wijn/Bubbels) — pinned to the new Wine sub-category ---
    {
      name: "Wit (glas)",
      price: 5.0,
      category: wine._id,
      sortOrder: 1,
      description: "Huiswijn · droog, fris · 17.5cl",
      imageUrl:
        "https://www.dewijnclubonline.nl/nl/img/product/720x960/201_1_1774893856",
      recipe: [{ stockItem: stockId("White wine"), qty: 175 }],
    },
    {
      name: "Wit (fles)",
      price: 25.0,
      category: wine._id,
      sortOrder: 2,
      description: "Huiswijn wit · 75cl",
      imageUrl:
        "https://www.dewijnclubonline.nl/nl/img/product/720x960/201_1_1774893856",
      recipe: [{ stockItem: stockId("White wine"), qty: 750 }],
    },
    {
      name: "Rosé (glas)",
      price: 5.0,
      category: wine._id,
      sortOrder: 3,
      description: "Huiswijn · droog, zomers · 17.5cl",
      imageUrl:
        "https://www.dewijnclubonline.nl/nl/img/product/720x960/201_1_1774893856",
      recipe: [{ stockItem: stockId("Rosé wine"), qty: 175 }],
    },
    {
      name: "Rosé (fles)",
      price: 25.0,
      category: wine._id,
      sortOrder: 4,
      description: "Huiswijn rosé · 75cl",
      imageUrl:
        "https://www.dewijnclubonline.nl/nl/img/product/720x960/201_1_1774893856",
      recipe: [{ stockItem: stockId("Rosé wine"), qty: 750 }],
    },
    {
      name: "Rood (glas)",
      price: 5.0,
      category: wine._id,
      sortOrder: 5,
      description: "Huiswijn · medium body · 17.5cl",
      imageUrl:
        "https://www.dewijnclubonline.nl/nl/img/product/720x960/201_1_1774893856",
      recipe: [{ stockItem: stockId("Red wine"), qty: 175 }],
    },
    {
      name: "Rood (fles)",
      price: 25.0,
      category: wine._id,
      sortOrder: 6,
      description: "Huiswijn rood · 75cl",
      imageUrl:
        "https://www.dewijnclubonline.nl/nl/img/product/720x960/201_1_1774893856",
      recipe: [{ stockItem: stockId("Red wine"), qty: 750 }],
    },
    {
      name: "Crémant (glas)",
      price: 6.0,
      category: wine._id,
      sortOrder: 7,
      description: "Crémant · methode champenoise · 12.5cl",
      imageUrl:
        "https://static.millesima.com/s3/attachements/editorial/h412px/cremants.jpg",
      recipe: [{ stockItem: stockId("Crémant bottle"), qty: 0.25 }],
    },
    {
      name: "Crémant (fles)",
      price: 27.5,
      category: wine._id,
      sortOrder: 8,
      description: "Crémant · 75cl · te delen",
      imageUrl:
        "https://static.millesima.com/s3/attachements/editorial/h412px/cremants.jpg",
      recipe: [{ stockItem: stockId("Crémant bottle"), qty: 1 }],
    },

    // --- Coffee, tea & chocolate (Koffie / Thee / Chocomelk) ---
    {
      name: "Espresso",
      price: 2.4,
      category: coffee._id,
      sortOrder: 1,
      description: "Single origin · korte shot",
      imageUrl:
        "https://www.wietec.nl/storage/2024/02/Voorbeeld-van-doppio-espresso.jpg",
      recipe: [{ stockItem: stockId("Coffee beans"), qty: 8 }],
    },
    {
      name: "Dubbele Espresso",
      price: 3.2,
      category: coffee._id,
      sortOrder: 2,
      description: "Twee shots · ristretto-stijl",

      imageUrl:
        "https://www.wietec.nl/storage/2024/02/Voorbeeld-van-doppio-espresso.jpg",
      recipe: [{ stockItem: stockId("Coffee beans"), qty: 16 }],
    },
    {
      name: "Koffie",
      price: 2.6,
      category: coffee._id,
      sortOrder: 3,
      description: "Lungo · klassieke filter",
      imageUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdtpTLMJ9frwNHNLIKdHQxkvNaN560wbP8hg&s",
      recipe: [{ stockItem: stockId("Coffee beans"), qty: 10 }],
    },
    {
      name: "Cappuccino",
      price: 3.4,
      category: coffee._id,
      sortOrder: 4,
      description: "Espresso met geschuimde melk",
      imageUrl: "https://www.napojoveautomaty.cz/images/recepty/cappucino.jpg",
      recipe: [
        { stockItem: stockId("Coffee beans"), qty: 8 },
        { stockItem: stockId("Milk"), qty: 120 },
      ],
    },
    {
      name: "Latte",
      price: 3.6,
      category: coffee._id,
      sortOrder: 5,
      description: "Espresso met veel warme melk",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/d/d8/Caffe_Latte_at_Pulse_Cafe.jpg",
      recipe: [
        { stockItem: stockId("Coffee beans"), qty: 8 },
        { stockItem: stockId("Milk"), qty: 200 },
      ],
    },
    {
      name: "Satemwa thee",
      price: 3.1,
      category: coffee._id,
      sortOrder: 6,
      description: "Single estate Malawi-thee · vraag de variant aan uw kelner",
      imageUrl:
        "https://cdn.tasteatlas.com//images/products/2c9d02c0909e455e94bcccfa62e56d64.png?w=700&h=656",
      recipe: [{ stockItem: stockId("Satemwa tea bag"), qty: 1 }],
    },
    {
      name: "Verse munt thee",
      price: 3.4,
      category: coffee._id,
      sortOrder: 7,
      description: "Verse muntblaadjes · honing op verzoek",
      imageUrl:
        "https://cdn.webshopapp.com/shops/35440/files/454019120/muntthee-de-natuurlijk-stress-reliever.jpg",
      recipe: [{ stockItem: stockId("Fresh mint"), qty: 10 }],
    },
    {
      name: "Homemade gember thee",
      price: 3.9,
      category: coffee._id,
      sortOrder: 8,
      description: "Verse gember met citroen · pittig",
      imageUrl:
        "https://sterkindekeuken.nl/wp-content/uploads/2024/01/hoe-maak-je-gemberthee.png",
      recipe: [{ stockItem: stockId("Fresh ginger"), qty: 15 }],
    },
    {
      name: "Warme Chocomelk",
      price: 3.6,
      category: coffee._id,
      sortOrder: 9,
      description: "Pure chocolade · volle melk",
      imageUrl:
        "https://www.heelhollandbakt.nl/wp-content/uploads/2024/01/Warme-chocomelk-950x550.jpg",
      recipe: [
        { stockItem: stockId("Drinking chocolate"), qty: 25 },
        { stockItem: stockId("Milk"), qty: 200 },
      ],
    },

    // --- Kitchen ---
    {
      name: "Chocolate cake",
      price: 5.0,
      category: desserts._id,
      sortOrder: 2,
      description: "Vloeibaar hart · pure chocolade · geserveerd lauwwarm",
      imageUrl: photo("chocolate-cake"),
      recipe: [{ stockItem: stockId("Chocolate cake slice"), qty: 1 }],
    },
  ]);

  console.log("[seed] tables...");
  await Table.create([
    {
      label: "T1",
      seats: 2,
      x: 80,
      y: 80,
      w: 80,
      h: 80,
      shape: "round",
      room: "Main",
      zone: "indoor",
    },
    {
      label: "T2",
      seats: 2,
      x: 220,
      y: 80,
      w: 80,
      h: 80,
      shape: "round",
      room: "Main",
      zone: "indoor",
    },
    {
      label: "T3",
      seats: 4,
      x: 360,
      y: 80,
      w: 110,
      h: 80,
      shape: "square",
      room: "Main",
      zone: "indoor",
    },
    {
      label: "T4",
      seats: 4,
      x: 510,
      y: 80,
      w: 110,
      h: 80,
      shape: "square",
      room: "Main",
      zone: "indoor",
    },
    {
      label: "T5",
      seats: 6,
      x: 80,
      y: 220,
      w: 160,
      h: 90,
      shape: "square",
      room: "Main",
      zone: "indoor",
    },
    {
      label: "T6",
      seats: 4,
      x: 280,
      y: 220,
      w: 110,
      h: 80,
      shape: "square",
      room: "Main",
      zone: "indoor",
    },
    {
      label: "T7",
      seats: 2,
      x: 430,
      y: 220,
      w: 80,
      h: 80,
      shape: "round",
      room: "Main",
      zone: "indoor",
    },
    {
      label: "T8",
      seats: 2,
      x: 550,
      y: 220,
      w: 80,
      h: 80,
      shape: "round",
      room: "Main",
      zone: "indoor",
    },
    {
      label: "B1",
      seats: 1,
      x: 700,
      y: 80,
      w: 60,
      h: 60,
      shape: "round",
      room: "Bar",
      zone: "indoor",
    },
    {
      label: "B2",
      seats: 1,
      x: 700,
      y: 160,
      w: 60,
      h: 60,
      shape: "round",
      room: "Bar",
      zone: "indoor",
    },
    {
      label: "B3",
      seats: 1,
      x: 700,
      y: 240,
      w: 60,
      h: 60,
      shape: "round",
      room: "Bar",
      zone: "indoor",
    },
    {
      label: "P1",
      seats: 4,
      x: 80,
      y: 100,
      w: 110,
      h: 80,
      shape: "square",
      room: "Terrace",
      zone: "outdoor",
    },
    {
      label: "P2",
      seats: 4,
      x: 220,
      y: 100,
      w: 110,
      h: 80,
      shape: "square",
      room: "Terrace",
      zone: "outdoor",
    },
    {
      label: "P3",
      seats: 2,
      x: 360,
      y: 100,
      w: 80,
      h: 80,
      shape: "round",
      room: "Terrace",
      zone: "outdoor",
    },
  ]);

  console.log("[seed] staff...");
  const staff = await Staff.create([
    {
      name: "Sophie Martens",
      role: "manager",
      hourlyRate: 22,
      email: "sophie@patron.cafe",
      mutuality: "CM (Christelijke Mutualiteit)",
      mealVouchersOptIn: true,
      commuteKm: 18,
    },
    {
      name: "Lucas De Smet",
      role: "waiter",
      hourlyRate: 14,
      email: "lucas@patron.cafe",
      mutuality: "Solidaris (Socialistische Mutualiteit)",
      mealVouchersOptIn: true,
      commuteKm: 9,
    },
    {
      name: "Emma Janssens",
      role: "waiter",
      hourlyRate: 14,
      email: "emma@patron.cafe",
      mutuality: "Liberale Mutualiteit",
      mealVouchersOptIn: true,
      commuteKm: 6,
    },
    {
      name: "Karim El Amrani",
      role: "kitchen",
      hourlyRate: 17,
      email: "karim@patron.cafe",
      mutuality: "Onafhankelijke Ziekenfondsen",
      mealVouchersOptIn: true,
      commuteKm: 22,
    },
    {
      name: "Noor Peeters",
      role: "kitchen",
      hourlyRate: 16,
      email: "noor@patron.cafe",
      mutuality: "Helan",
      mealVouchersOptIn: false,
      commuteKm: 0,
    },
  ]);

  console.log("[seed] sample shifts...");
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

  console.log("[seed] sample paid orders for P&L charts...");
  const items = await Item.find().populate("recipe.stockItem");
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
        lines.push({
          item: it._id,
          name: it.name,
          price: it.price,
          qty,
          status: "served",
        });
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
        status: "paid",
        subtotal,
        cogs,
        paidAt,
        paymentMethod: Math.random() < 0.6 ? "card" : "cash",
      });
    }
  }
  await Order.create(orders);

  console.log("[seed] reservations...");
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
    tablesById
      .filter((t) => t.seats >= seats)
      .sort((a, b) => a.seats - b.seats)[0];

  const seedRes = [
    {
      name: "Anna Janssens",
      email: "anna@example.com",
      phone: "+32 478 12 34 56",
      partySize: 2,
      startsAt: at(0, 19, 0),
      notes: "",
      status: "confirmed",
    },
    {
      name: "Marc De Vos",
      email: "marc@example.com",
      phone: "+32 478 22 33 44",
      partySize: 4,
      startsAt: at(0, 20, 0),
      notes: "Anniversary — quiet table if possible",
      status: "confirmed",
    },
    {
      name: "Sara El Idrissi",
      email: "sara@example.com",
      phone: "",
      partySize: 2,
      startsAt: at(1, 18, 30),
      notes: "",
      status: "confirmed",
    },
    {
      name: "Tom Vermeer",
      email: "",
      phone: "+32 472 99 11 22",
      partySize: 6,
      startsAt: at(1, 19, 30),
      notes: "One nut allergy",
      status: "pending",
    },
    {
      name: "Lisa Peeters",
      email: "lisa@example.com",
      phone: "",
      partySize: 2,
      startsAt: at(2, 12, 30),
      notes: "",
      status: "confirmed",
    },
  ];
  await Reservation.create(
    seedRes.map((r) => ({
      ...r,
      durationMinutes: 90,
      table: pickTable(r.partySize)?._id || null,
      source: "manual",
    }))
  );

  console.log("[seed] HACCP equipment + tasks...");
  const equipment = await HaccpEquipment.create([
    { name: "Walk-in cooler",  type: "fridge",      location: "Kitchen", minTempC: 0,   maxTempC: 4,   sortOrder: 1 },
    { name: "Bar fridge",      type: "fridge",      location: "Bar",     minTempC: 1,   maxTempC: 7,   sortOrder: 2 },
    { name: "Prep fridge",     type: "fridge",      location: "Kitchen", minTempC: 1,   maxTempC: 4,   sortOrder: 3 },
    { name: "Freezer",         type: "freezer",     location: "Kitchen", minTempC: -25, maxTempC: -18, sortOrder: 4 },
    { name: "Hot bain-marie",  type: "hot-holding", location: "Pass",    minTempC: 63,  maxTempC: 80,  sortOrder: 5 },
  ]);

  const cleaningTasks = await HaccpCleaningTask.create([
    { name: "Mop kitchen floor",          area: "Kitchen", frequency: "daily",   sortOrder: 1 },
    { name: "Sanitise prep surfaces",     area: "Kitchen", frequency: "daily",   sortOrder: 2 },
    { name: "Empty + clean grease trap",  area: "Kitchen", frequency: "weekly",  sortOrder: 3 },
    { name: "Defrost + clean freezer",    area: "Kitchen", frequency: "monthly", sortOrder: 4 },
    { name: "Clean bar taps + drip tray", area: "Bar",     frequency: "daily",   sortOrder: 5 },
    { name: "Toilets deep clean",         area: "Toilets", frequency: "daily",   sortOrder: 6 },
  ]);

  console.log("[seed] HACCP sample logs...");
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
          correctiveAction: inRange ? "" : "Adjusted thermostat, monitored 30 min, stable.",
        });
      }
    }
  }
  await HaccpTemperatureLog.create(tempLogs);

  // Daily tasks logged most days, weekly tasks once or twice, monthly once.
  const cleaningLogs = [];
  for (const t of cleaningTasks) {
    const span = t.frequency === "daily" ? 7 : t.frequency === "weekly" ? 14 : 30;
    const stride = t.frequency === "daily" ? 1 : t.frequency === "weekly" ? 7 : 30;
    for (let d = 0; d < span; d += stride) {
      if (t.frequency === "daily" && Math.random() < 0.15) continue; // simulate a missed day
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
      supplier: "Vleesgroothandel Janssens",
      itemsSummary: "8 kg kalfslever, 5 kg gehakt, 12 kg kippenfilet",
      temperatureC: 3.4,
      packagingOk: true,
      expiryOk: true,
    },
    {
      receivedAt: new Date(now - 2 * day),
      receivedBy: staff[4]._id,
      supplier: "Bakker De Smet",
      itemsSummary: "40× pistolets, 10× tarwebrood",
      packagingOk: true,
      expiryOk: true,
    },
    {
      receivedAt: new Date(now - 3 * day),
      receivedBy: staff[3]._id,
      supplier: "Vishandel Oostende",
      itemsSummary: "4 kg zalmfilet, 2 kg kabeljauw",
      temperatureC: 6.2,
      packagingOk: true,
      expiryOk: false,
      correctiveAction: "Short-dated kabeljauw — used same day, supplier notified.",
    },
  ]);

  console.log("[seed] absences...");
  // A handful of realistic absences across the past 30 days so the
  // payroll preview lights up: one short sick spell with a medical
  // certificate, one workplace accident, one block of paid holiday,
  // and one unpaid family-affairs day.
  await Absence.create([
    {
      staff: staff[1]._id, // Lucas
      kind: "sick",
      startsAt: new Date(now - 9 * day),
      endsAt: new Date(now - 7 * day),
      paidByEmployer: true,
      hasMedicalCertificate: true,
      notes: "Griep, attest van dokter Vermeulen.",
    },
    {
      staff: staff[3]._id, // Karim
      kind: "accident",
      startsAt: new Date(now - 21 * day),
      endsAt: new Date(now - 20 * day),
      paidByEmployer: true,
      hasMedicalCertificate: true,
      notes: "Snijwonde tijdens prep — aangifte Fedris ingediend.",
    },
    {
      staff: staff[2]._id, // Emma
      kind: "holiday",
      startsAt: new Date(now - 14 * day),
      endsAt: new Date(now - 10 * day),
      paidByEmployer: true,
      hasMedicalCertificate: false,
      notes: "Verlof — 5 dagen.",
    },
    {
      staff: staff[4]._id, // Noor
      kind: "family",
      startsAt: new Date(now - 4 * day),
      endsAt: new Date(now - 4 * day),
      paidByEmployer: true,
      hasMedicalCertificate: false,
      notes: "Klein verlet — overlijden grootouder.",
    },
  ]);

  console.log("[seed] done.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
