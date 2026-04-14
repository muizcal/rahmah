// J-FAB PERFUMES — PRODUCT DATA
// Admin can override this via localStorage (admin portal)

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
    images: [ "https://perfumebestbuy.ng/wp-content/uploads/2024/01/Le-labo-Santal-33-main.webp",
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

// PROMO CODES
const PROMO_CODES = {
  "JFAB10": { type: "percent", value: 10, description: "10% off your order" },
  "WELCOME15": { type: "percent", value: 15, description: "15% welcome discount" },
  "FREESHIP": { type: "shipping", value: 100, description: "Free delivery" },
  "JFAB500": { type: "fixed", value: 500, description: "₦500 off" }
};

// DELIVERY RATES
const DELIVERY_RATES = {
  island: 2500,
  mainland: 3500,
  outside: 5000,
  pickup: 0
};

// FAQs
const FAQS = [
  {
    q: "Are all your perfumes authentic?",
    a: "Yes! Every product sold at J-Fab Perfumes is 100% authentic. We source directly from certified suppliers and authorized distributors. We do not sell counterfeits."
  },
  {
    q: "How long does delivery take?",
    a: "Island and Mainland Lagos: 1–2 business days. Outside Lagos: 2–5 business days. We also offer same-day delivery within Lagos for orders placed before 12 noon (subject to availability)."
  },
  {
    q: "What are your delivery charges?",
    a: "Island delivery is ₦2,500 | Mainland delivery is ₦3,500 | Outside Lagos is ₦5,000. Store pickup is free — come visit us at Ikota Shopping Complex, VGC."
  },
  {
    q: "Can I return or exchange a product?",
    a: "We accept returns/exchanges within 7 days of delivery if the product is unused, in original packaging, and damaged or incorrectly sent. Contact us on WhatsApp at 09139059530."
  },
  {
    q: "How does the loyalty points system work?",
    a: "You earn 1 point for every order you place. Accumulated points can be redeemed as a promo code discount on your next purchase. Log in to your account to view your points balance."
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major debit/credit cards and bank transfers via Paystack — Nigeria's most trusted payment gateway. Your payment is 100% secure."
  },
  {
    q: "Can I pick up my order in-store?",
    a: "Absolutely! Select 'Store Pickup' at checkout and visit us at No 1022 Road 5, Stanbic Bank Ikota Shopping Complex, VGC, Lagos. We'll have your order ready."
  },
  {
    q: "What if a product I want is out of stock?",
    a: "Click the 'Notify Me' button on any out-of-stock product. Enter your email and/or WhatsApp number and we'll alert you the moment it's back in stock."
  }
];

// Load products from localStorage (admin overrides)
function getProducts() {
  const stored = localStorage.getItem('jfab_products');
  return stored ? JSON.parse(stored) : DEFAULT_PRODUCTS;
}

function getAnnouncement() {
  const stored = localStorage.getItem('jfab_announcement');
  return stored ? JSON.parse(stored) : null;
}

// ===================================
// CATEGORIES (admin-editable)
// ===================================
// =====================================================
// CATEGORY IMAGES — REPLACE THESE WITH YOUR OWN PHOTOS
// Each image should be ~1200x800px (landscape) or
// ~800x1200px (portrait) for best results.
// =====================================================
const DEFAULT_CATEGORIES = [
  {
    id: 'designer',
    name: 'Designer Perfumes',
    image: '/images/designers.jpg'
    // ↑ REPLACE with your Designer Perfumes photo
  },
  {
    id: 'luxury',
    name: 'Luxury Perfumes',
    image: '/images/luxury.jpg'
    // ↑ REPLACE with your Luxury Perfumes photo
  },
  {
    id: 'gift-men',
    name: 'Gift Sets — Men',
    image: '/images/men.jpeg'
    // ↑ REPLACE with your Men's Gift Sets photo
  },
  {
    id: 'gift-women',
    name: 'Gift Sets — Women',
    image: '/images/women.jpg'
    // ↑ REPLACE with your Women's Gift Sets photo
  },
  {
    id: 'fragrance',
    name: 'Fragrance World',
    image: '/images/fragrance.jpg'
    // ↑ REPLACE with your Fragrance World photo
  },
  {
    id: 'home',
    name: 'Home Fragrances',
    image: '/images/home.png'
    // ↑ REPLACE with your Home Fragrances photo
  },
  {
    id: 'mini',
    name: 'Mini Perfumes',
    image: '/images/mini.jpg'
    // ↑ REPLACE with your Mini Perfumes photo
  },
  {
    id: 'oil',
    name: 'Oil Perfumes',
    image: '/images/oil.jpg'
    // ↑ REPLACE with your Oil Perfumes photo
  },
  {
    id: 'deodorant',
    name: 'Deodorants',
    image: '/images/deodorant.jpg'
    // ↑ REPLACE with your Deodorants photo
  }
];

function getCategories() {
  const stored = localStorage.getItem('jfab_categories');
  return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
}

// ===================================
// FLASH SALE (admin-created)
// ===================================
function getFlashSale() {
  const stored = localStorage.getItem('jfab_flash_sale');
  return stored ? JSON.parse(stored) : null;
}
