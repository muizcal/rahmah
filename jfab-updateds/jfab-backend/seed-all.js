// ============================================================
// J-FAB PERFUMES — FULL SEED SCRIPT
// Run once: node seed-all.js
// ============================================================

require('dotenv').config();
const mongoose  = require('mongoose');
const User      = require('./models/User');
const PromoCode = require('./models/PromoCode');
const Product   = require('./models/Product');

// ── All 13 J-Fab products (from data.js) ─────────────────────────────────────
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Oud Royale",
    brand: "Fragrance World",
    category: "luxury",
    price: 45000,
    originalPrice: 60000,
    discount: 25,
    stock: 12,
    lowStockThreshold: 3,
    description: "A majestic oud fragrance with rich amber, sandalwood, and rose. An opulent scent for those who command attention.",
    images: [
      "https://fragrances.com.ng/media/catalog/product/cache/0daeb07bb1d294c1f281fab47369d56a/s/w/swiss_arabian_shaghaf_oud_royale_edp_-6.jpg",
      "https://fragrances.com.ng/media/catalog/product/cache/0daeb07bb1d294c1f281fab47369d56a/s/w/swiss_arabian_shaghaf_oud_royale_edp_-1.jpg"
    ],
    featured: true,
    deal: true,
    tags: ["oud", "amber", "luxury"]
  },
  {
    id: 2,
    name: "Bleu de Chanel",
    brand: "Chanel",
    category: "designer",
    price: 285000,
    originalPrice: 300000,
    discount: 10,
    stock: 8,
    lowStockThreshold: 2,
    description: "A woody aromatic fragrance for men. Freshness, depth and the lingering resonance of wood make this an icon.",
    images: [
      "https://i.ebayimg.com/images/g/2uIAAOSwoe9iQD1a/s-l1600.webp",
      "https://i.ebayimg.com/images/g/dN8AAOSwqDdiQD1Z/s-l960.webp"
    ],
    featured: true,
    deal: false,
    tags: ["woody", "fresh", "designer"]
  },
  {
    id: 3,
    name: "Lavender Dream",
    brand: "J-Fab",
    category: "home",
    price: 8500,
    originalPrice: null,
    discount: 0,
    stock: 25,
    lowStockThreshold: 5,
    description: "Transform your home with the calming essence of French lavender blended with vanilla and musk.",
    images: [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3PkQMMPqUQQgsWjdJhmdxEu-CUMnAglZfmw&s",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3892472d-HATOmF8pu2XU2nWiq1Aw7sNJgw&s"
    ],
    featured: true,
    deal: false,
    tags: ["lavender", "home", "calming"]
  },
  {
    id: 4,
    name: "Mini Escape",
    brand: "Fragrance World",
    category: "mini",
    price: 3500,
    originalPrice: 5000,
    discount: 30,
    stock: 40,
    lowStockThreshold: 10,
    description: "Carry your signature scent everywhere. A pocket-sized burst of citrus, sea spray, and white woods.",
    images: [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCzCETJhlbMb1Zkr2Q8nrcGGxhONx01WDaTQ&s",
      "https://www.fragranceoutlet.com/cdn/shop/products/Calvin-Klein-Escape-Womens-Eau-de-Parfume-Spray-1.7-Best-Price-Fragrance-Parfume-FragranceOutlet.com-Main_1024x1024.jpeg?v=1626801686"
    ],
    featured: true,
    deal: true,
    tags: ["mini", "citrus", "fresh"]
  },
  {
    id: 5,
    name: "Night Blooming Jasmine",
    brand: "J-Fab",
    category: "oil",
    price: 12000,
    originalPrice: 15000,
    discount: 20,
    stock: 0,
    lowStockThreshold: 3,
    description: "A deeply sensual oil perfume with blooming jasmine, warm musk, and exotic sandalwood.",
    images: [
      "https://hellenicnatureshop.com/wp-content/uploads/2024/09/Night-blooming-Jasmine-Essential-Oil.jpg",
      "https://hellenicnatureshop.com/wp-content/uploads/imported/Rheas-Essential-Oils-Premium-Steam-Distilled-Essential-Oil-Imported-from-Greece-with-Gift-Rosemary-Single-B09MWDSFQM-450x450.jpg"
    ],
    featured: false,
    deal: false,
    tags: ["jasmine", "oil", "sensual"]
  },
  {
    id: 6,
    name: "FreshMist Body Spray",
    brand: "J-Fab",
    category: "deodorant",
    price: 4500,
    originalPrice: null,
    discount: 0,
    stock: 35,
    lowStockThreshold: 8,
    description: "All-day freshness with citrus burst and light floral notes. Long-lasting deodorant body mist.",
    images: [
      "https://m.media-amazon.com/images/I/71-QyQUGQtL._AC_SL1500_.jpg",
      "https://m.media-amazon.com/images/I/61g-DHm59sL._AC_SL1500_.jpg"
    ],
    featured: true,
    deal: false,
    tags: ["deodorant", "mist", "fresh"]
  },
  {
    id: 7,
    name: "Arabian Nights",
    brand: "Fragrance World",
    category: "fragrance",
    price: 330000,
    originalPrice: 350000,
    discount: 20,
    stock: 15,
    lowStockThreshold: 4,
    description: "An enchanting Eastern-inspired fragrance with rose, oud, and saffron. A journey through the spice markets.",
    images: [
      "https://i.ebayimg.com/images/g/yGwAAOSwUPZl8s-s/s-l1600.webp",
      "https://i.ebayimg.com/images/g/XE4AAOSw0Hll8s-X/s-l960.webp"
    ],
    featured: true,
    deal: true,
    tags: ["oud", "rose", "eastern"]
  },
  {
    id: 8,
    name: "La Vie Est Belle",
    brand: "Lancôme",
    category: "designer",
    price: 78000,
    originalPrice: 88000,
    discount: 11,
    stock: 6,
    lowStockThreshold: 2,
    description: "Life is beautiful — an iris floral fragrance for women combining iris, jasmine and orange blossom.",
    images: [
      "https://i.ebayimg.com/images/g/HX0AAeSwT1Bp0T7d/s-l1600.webp",
      "https://i.ebayimg.com/images/g/HX0AAeSwT1Bp0T7d/s-l1600.webp"
    ],
    featured: true,
    deal: false,
    tags: ["floral", "iris", "designer"]
  },
  {
    id: 9,
    name: "Amber Wood Oil",
    brand: "J-Fab",
    category: "oil",
    price: 290000,
    originalPrice: null,
    discount: 0,
    stock: 20,
    lowStockThreshold: 5,
    description: "Rich concentrated oil perfume with warm amber, cedarwood, and smoky vetiver. Long-lasting and intimate.",
    images: [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTTDnpP17NBVS8dwxFbQW5VZMAF8XvHa_3nYA&s",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQ08_VB0AVV7DMTNlgBZSbUSCMGGK4XYpMeQ&s"
    ],
    featured: false,
    deal: false,
    tags: ["amber", "oil", "woody"]
  },
  {
    id: 10,
    name: "Rose Oud Intense",
    brand: "Fragrance World",
    category: "luxury",
    price: 55000,
    originalPrice: 70000,
    discount: 21,
    stock: 9,
    lowStockThreshold: 3,
    description: "The ultimate luxury fusion — Bulgarian rose meets premium oud in an intense, long-lasting sillage.",
    images: [
      "https://fimgs.net/photogram/p180/lb/hf/fO45mLGzPRsnSnS2.jpg",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0ZBcnoRAgag8-mM4bJ7uSCTv8u9JmWxdnzw&s"
    ],
    featured: true,
    deal: true,
    tags: ["rose", "oud", "intense"]
  },
  {
    id: 11,
    name: "Coconut Breeze Mist",
    brand: "J-Fab",
    category: "deodorant",
    price: 3800,
    originalPrice: null,
    discount: 0,
    stock: 50,
    lowStockThreshold: 10,
    description: "Tropical coconut and vanilla body mist. Light, refreshing, and perfect for everyday wear.",
    images: [
      "https://images.unsplash.com/photo-1616765882484-b96caba08ef0?w=600&q=80"
    ],
    featured: false,
    deal: false,
    tags: ["coconut", "tropical", "mist"]
  },
  {
    id: 12,
    name: "Santal 33",
    brand: "Le Labo",
    category: "luxury",
    price: 120000,
    originalPrice: null,
    discount: 0,
    stock: 4,
    lowStockThreshold: 2,
    description: "Iconic cult fragrance. Sandalwood, cedar, cardamom and iris — the scent of understated luxury.",
    images: [
      "https://perfumebestbuy.ng/wp-content/uploads/2024/01/Le-labo-Santal-33-main.webp",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJ42yzBpM5FuGUQv1IdkXX5cmBeWq69Wvcaw&s"
    ],
    featured: false,
    deal: false,
    tags: ["sandalwood", "luxury", "unisex"]
  },
  {
    id: 13,
    name: "Korloff Royal Oud Gift Set",
    brand: "Fragrance World",
    category: "gift-men",
    price: 55000,
    originalPrice: 70000,
    discount: 21,
    stock: 10,
    lowStockThreshold: 3,
    description: "An exquisite men's gift set featuring Oud Royale EDP, a luxury body lotion, and an elegant pouch. Perfect for the distinguished gentleman.",
    images: [
      "https://cdn.fragrancenet.com/images/photos/600x600/492835.jpg",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-KvScXZkmSvExBy8vOaCkWEG7Ca1Og4hWKA&s"
    ],
    featured: true,
    deal: false,
    tags: ["gift", "men", "oud", "luxury"]
  }
];

// ── Default promo codes ───────────────────────────────────────────────────────
const DEFAULT_PROMOS = [
  { code: 'JFAB10',    type: 'percent',  value: 10,  description: '10% off your order',   active: true },
  { code: 'WELCOME15', type: 'percent',  value: 15,  description: '15% welcome discount',  active: true },
  { code: 'FREESHIP',  type: 'shipping', value: 100, description: 'Free delivery',          active: true },
  { code: 'JFAB500',   type: 'fixed',    value: 500, description: '₦500 off order',         active: true }
];

async function seed() {
  console.log('\n🌱 J-Fab Perfumes — Database Seed');
  console.log('──────────────────────────────────');
  console.log('Connecting to MongoDB...');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // ── Admin user ───────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@jfab.com';
  const adminPass  = process.env.ADMIN_PASSWORD || 'JFab@2024!';
  const existing   = await User.findOne({ email: adminEmail });
  if (!existing) {
    await User.create({ name: 'J-Fab Admin', email: adminEmail, password: adminPass, role: 'admin' });
    console.log(`✅ Admin created:  ${adminEmail}`);
    console.log(`   Password:       ${adminPass}`);
    console.log(`   ⚠️  Change this password after first login!\n`);
  } else {
    console.log(`ℹ️  Admin already exists: ${adminEmail}\n`);
  }

  // ── Products ─────────────────────────────────────────────────────────────
  console.log('Seeding products...');
  let created = 0, updated = 0;
  for (const p of DEFAULT_PRODUCTS) {
    const existing = await Product.findOne({ id: p.id });
    if (existing) {
      await Product.findOneAndUpdate({ id: p.id }, p);
      updated++;
    } else {
      await Product.create(p);
      created++;
    }
    process.stdout.write(`  ✓ [${p.id.toString().padStart(2,'0')}] ${p.name}\n`);
  }
  console.log(`\n✅ Products: ${created} created, ${updated} updated (${DEFAULT_PRODUCTS.length} total)\n`);

  // ── Promo codes ──────────────────────────────────────────────────────────
  console.log('Seeding promo codes...');
  for (const p of DEFAULT_PROMOS) {
    await PromoCode.findOneAndUpdate(
      { code: p.code },
      p,
      { upsert: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✓ ${p.code}`);
  }
  console.log(`\n✅ ${DEFAULT_PROMOS.length} promo codes seeded\n`);

  await mongoose.disconnect();

  console.log('──────────────────────────────────');
  console.log('🎉 Seed complete! Your store is ready.');
  console.log(`\n📌 Admin login: ${adminEmail}`);
  console.log('🔗 Backend should be running on Railway\n');
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});