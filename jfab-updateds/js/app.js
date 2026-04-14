// J-FAB PERFUMES — MAIN APP JS

let cart = JSON.parse(localStorage.getItem('jfab_cart') || '[]');
let currentUser = JSON.parse(localStorage.getItem('jfab_user') || 'null');
let _backendProducts = null; // cache from API
let currentFilter = 'all';
let currentProductId = null;
let currentDeliveryType = null;
let currentDeliveryCost = 0;
let appliedPromo = null;
let displayedCount = 8;
let checkoutStep = 1;
let isGuestCheckout = true;
let notifyProductId = null;

// === INIT ===
document.addEventListener('DOMContentLoaded', async () => {
  const fyEl = document.getElementById('footer-year');
  if (fyEl) fyEl.textContent = new Date().getFullYear();

  // Load products from backend first, then render everything
  await loadProductsFromBackend();

  loadAnnouncement();
  loadFlashSale();
  renderCategories();

  const pendingCat = localStorage.getItem('jfab_goto_cat');
  if (pendingCat) {
    localStorage.removeItem('jfab_goto_cat');
    setTimeout(() => openCategoryPage(pendingCat), 300);
  }

  const pendingPanel = localStorage.getItem('jfab_open_panel');
  if (pendingPanel) {
    localStorage.removeItem('jfab_open_panel');
    if (pendingPanel === 'wishlist') setTimeout(openWishlist,       500);
    if (pendingPanel === 'cart')     setTimeout(openCart,           500);
    if (pendingPanel === 'account')  setTimeout(handleAccountClick, 500);
  }
  renderProducts('all');

  renderDeals();
  renderFAQ();
  initCountdown();
  updateCartUI();
  updateWishlistUI();
  if (currentUser) updateUserUI();

  const hash = window.location.hash;
  if (hash === '#cart')     { setTimeout(openCart,     400); }
  if (hash === '#wishlist') { setTimeout(openWishlist, 400); }
  if (hash === '#account')  { setTimeout(handleAccountClick, 400); }
  if (hash) history.replaceState(null, '', window.location.pathname + window.location.search);
});

// Load products from backend and cache them
async function loadProductsFromBackend() {
  try {
    const res  = await fetch(API_BASE + '/products');
    const data = await res.json();
    if (data.success && data.products.length > 0) {
      _backendProducts = data.products;
      // Keep localStorage in sync as offline fallback
      localStorage.setItem('jfab_products', JSON.stringify(data.products));
    }
  } catch (_) {
    // Offline — fall through to localStorage / data.js defaults
    console.warn('Could not load products from backend, using cached data');
  }
}

// === ANNOUNCEMENT ===
async function loadAnnouncement() {
  const bar = document.getElementById('announcement-bar');
  try {
    const res  = await fetch(API_BASE + '/config/announcement');
    const data = await res.json();
    const ann  = data.announcement;
    if (ann && ann.text) {
      document.getElementById('announcement-text').innerHTML = ann.text;
      bar.style.display = 'flex';
      // Cache locally so offline still works
      localStorage.setItem('jfab_announcement', JSON.stringify(ann));
      return;
    }
    bar.style.display = 'none';
  } catch (_) {
    // Fallback to localStorage if API unreachable
    const ann = JSON.parse(localStorage.getItem('jfab_announcement') || 'null');
    if (ann && ann.text) {
      document.getElementById('announcement-text').innerHTML = ann.text;
      bar.style.display = 'flex';
    } else {
      bar.style.display = 'none';
    }
  }
}
function closeAnnouncement() {
  document.getElementById('announcement-bar').style.display = 'none';
}

// === PRODUCTS ===
function renderProducts(filter, btn) {
  currentFilter = filter;
  displayedCount = 8;
  if (btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';
  const products = getProducts();
  const filtered = filter === 'all' ? products : products.filter(p => p.category === filter);
  const toShow = filtered.slice(0, displayedCount);
  if (toShow.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:#aaa;grid-column:1/-1;padding:40px">No products found in this category yet.</p>';
    return;
  }
  toShow.forEach(p => grid.appendChild(createProductCard(p)));
}

function filterCategory(cat, btn) {
  renderProducts(cat, btn);
  document.getElementById('featured').scrollIntoView({ behavior: 'smooth' });
}

function loadMore() {
  displayedCount += 8;
  const grid = document.getElementById('products-grid');
  const products = getProducts();
  const filtered = currentFilter === 'all' ? products : products.filter(p => p.category === currentFilter);
  grid.innerHTML = '';
  filtered.slice(0, displayedCount).forEach(p => grid.appendChild(createProductCard(p)));
}

function createProductCard(p) {
  const div = document.createElement('div');
  div.className = 'product-card';
  const isOOS = p.stock === 0;
  const liveDiscount = p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const discountBadge = liveDiscount > 0 ? `<span class="badge badge-red">-${liveDiscount}%</span>` : '';
  const newBadge = p.featured ? `<span class="badge badge-gold">Featured</span>` : '';
  const oosBadge = isOOS ? `<span class="badge badge-oos">Out of Stock</span>` : '';
  const priceHtml = p.originalPrice
    ? `<span class="price-new">₦${p.price.toLocaleString()}</span><span class="price-old">₦${p.originalPrice.toLocaleString()}</span><span class="price-save">Save ₦${(p.originalPrice - p.price).toLocaleString()}</span>`
    : `<span class="price-new">₦${p.price.toLocaleString()}</span>`;
  const btnHtml = isOOS
    ? `<button class="product-btn notify-btn" onclick="openNotifyModal(${p.id})">Notify Me</button>`
    : `<button class="product-btn" onclick="addToCart(${p.id})">Add to Cart</button>`;

  // Image logic: if 2+ images, show first (carton) and second (perfume) on hover
  // If only 1 image, apply float animation
  const hasSecondImg = p.images && p.images.length >= 2;
  const imgHtml = hasSecondImg
    ? `<img src="${p.images[0]}" alt="${p.name}" loading="lazy" class="product-img-primary">
       <img src="${p.images[1]}" alt="${p.name} detail" loading="lazy" class="product-img-second">`
    : `<img src="${p.images[0]}" alt="${p.name}" loading="lazy" class="product-img-primary product-img-float">`;

  div.innerHTML = `
    <div class="product-img-wrap" onclick="openProductModal(${p.id})" style="cursor:pointer">
      ${imgHtml}
      <div class="product-badges">${oosBadge}${discountBadge}${newBadge}</div>
      <div class="product-actions">
        <button class="pa-btn" onclick="event.stopPropagation();openProductModal(${p.id})" title="Quick View">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="pa-btn" onclick="event.stopPropagation();addToCart(${p.id})" title="Add to Cart">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        </button>
      </div>
    </div>
    <div class="product-info">
      <div class="product-cat">${categoryLabel(p.category)}</div>
      <h3 class="product-name" onclick="openProductModal(${p.id})" style="cursor:pointer">${p.name}</h3>
      <p class="product-brand">${p.brand}</p>
      <div class="product-price">${priceHtml}</div>
      <div class="product-bottom-row">
        ${btnHtml}
        <button class="wish-heart-btn ${isWishlisted(p.id) ? 'wishlisted' : ''}" onclick="toggleWishlist(${p.id})" title="Add to Wishlist" id="wish-btn-${p.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isWishlisted(p.id) ? '#e91e63' : 'none'}" stroke="${isWishlisted(p.id) ? '#e91e63' : '#aaa'}" stroke-width="2.2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </button>
      </div>
    </div>`;
  return div;
}

function categoryLabel(cat) {
  const map = {
    mini: 'Mini Perfumes', luxury: 'Luxury', designer: 'Designer',
    oil: 'Oil Perfumes', home: 'Home Fragrance', deodorant: 'Deodorant',
    fragrance: 'Fragrance World', 'gift-men': 'Gift Sets — Men', 'gift-women': 'Gift Sets — Women'
  };
  return map[cat] || cat;
}

// === WISHLIST ===
let wishlist = JSON.parse(localStorage.getItem('jfab_wishlist') || '[]');

function isWishlisted(id) {
  return wishlist.includes(id);
}

function toggleWishlist(id) {
  const products = getProducts();
  const p = products.find(x => x.id === id);
  if (!p) return;

  if (isWishlisted(id)) {
    wishlist = wishlist.filter(x => x !== id);
    showToast(`Removed from wishlist`);
  } else {
    wishlist.push(id);
    showToast(`❤️ Added to Wishlist — ${p.name}`);
  }
  localStorage.setItem('jfab_wishlist', JSON.stringify(wishlist));
  updateWishlistUI();

  // Update button in product grid if visible
  const btn = document.getElementById(`wish-btn-${id}`);
  if (btn) {
    const loved = isWishlisted(id);
    btn.classList.toggle('wishlisted', loved);
    btn.querySelector('svg').setAttribute('fill', loved ? '#e91e63' : 'none');
    btn.querySelector('svg').setAttribute('stroke', loved ? '#e91e63' : '#aaa');
  }
}

function updateWishlistUI() {
  const count = wishlist.length;
  const countEl = document.getElementById('wishlist-count');
  if (countEl) {
    countEl.textContent = count;
    countEl.style.display = count > 0 ? 'inline' : 'none';
  }
  const mw = document.getElementById('mbn-wishlist-badge');
  if (mw) { mw.textContent = count; mw.style.display = count > 0 ? 'flex' : 'none'; }
  renderWishlistItems();
}

function renderWishlistItems() {
  const container = document.getElementById('wishlist-items');
  if (!container) return;
  const products = getProducts();
  const items = products.filter(p => wishlist.includes(p.id));

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" style="margin:0 auto 12px;display:block"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        Your wishlist is empty
      </div>`;
    return;
  }

  container.innerHTML = items.map(p => {
    const priceStr = `₦${p.price.toLocaleString()}`;
    return `
      <div class="wishlist-item">
        <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
        <div class="wishlist-item-info">
          <h4>${p.name}</h4>
          <p>${p.brand}</p>
          <span class="price-new">${priceStr}</span>
        </div>
        <div class="wishlist-item-actions">
          <button class="wishlist-remove" onclick="toggleWishlist(${p.id})" title="Remove">✕</button>
          <button class="wishlist-add-cart" onclick="addToCart(${p.id});closeWishlist()">Add to Cart</button>
        </div>
      </div>`;
  }).join('');
}

function openWishlist() {
  renderWishlistItems();
  document.getElementById('wishlist-overlay').classList.add('open');
  document.getElementById('wishlist-sidebar').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeWishlist() {
  document.getElementById('wishlist-overlay').classList.remove('open');
  document.getElementById('wishlist-sidebar').classList.remove('open');
  document.body.style.overflow = '';
}

function renderCategories() {
  const products = getProducts();
  const categories = getCategories();
  const grid = document.getElementById('cat-grid');
  const filterBar = document.getElementById('filter-bar');
  if (!grid) return;

  grid.innerHTML = '';
  categories.forEach((cat) => {
    const count = products.filter(p => p.category === cat.id).length;
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.onclick = () => openCategoryPage(cat.id);
    card.innerHTML = `
      <img src="${cat.image}" alt="${cat.name}" loading="lazy">
      <div class="cat-overlay"></div>
      <div class="cat-body">
        <h3>${cat.name}</h3>
        <span class="cat-count-badge">${count} Product${count !== 1 ? 's' : ''}</span>
        <button class="cat-shop-btn" onclick="event.stopPropagation();openCategoryPage('${cat.id}')">Shop Now</button>
      </div>`;
    grid.appendChild(card);
  });

  // rebuild filter bar (still used for Featured Products section)
  if (filterBar) {
    filterBar.innerHTML = `<button class="filter-btn active" onclick="filterCategory('all', this)">All</button>`;
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.textContent = cat.name;
      btn.onclick = function() { filterCategory(cat.id, this); };
      filterBar.appendChild(btn);
    });
  }
}

// === CATEGORY PAGE ===
function openCategoryPage(catId) {
  const categories = getCategories();
  const products = getProducts();
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;

  const catProducts = products.filter(p => p.category === catId);
  const inStock = catProducts.filter(p => p.stock > 0);
  const outOfStock = catProducts.filter(p => p.stock === 0);

  // Build product cards HTML
  function buildCard(p) {
    const isOOS = p.stock === 0;
    const liveDiscount = p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
    const discountBadge = liveDiscount > 0 ? `<span class="badge badge-red">-${liveDiscount}%</span>` : '';
    const newBadge = p.featured ? `<span class="badge badge-gold">Featured</span>` : '';
    const oosBadge = isOOS ? `<span class="badge badge-oos">Out of Stock</span>` : '';
    const priceHtml = p.originalPrice
      ? `<span class="price-new">₦${p.price.toLocaleString()}</span><span class="price-old">₦${p.originalPrice.toLocaleString()}</span>`
      : `<span class="price-new">₦${p.price.toLocaleString()}</span>`;
    const btnHtml = isOOS
      ? `<button class="product-btn notify-btn" onclick="closeCategoryPage();openNotifyModal(${p.id})">Notify Me</button>`
      : `<button class="product-btn" onclick="closeCategoryPage();openProductModal(${p.id})">View & Buy</button>`;
    const hasSecond = p.images && p.images.length >= 2;
    const imgHtml = hasSecond
      ? `<img src="${p.images[0]}" alt="${p.name}" loading="lazy" class="product-img-primary"><img src="${p.images[1]}" alt="${p.name}" loading="lazy" class="product-img-second">`
      : `<img src="${p.images[0]}" alt="${p.name}" loading="lazy" class="product-img-primary product-img-float">`;
    return `
      <div class="product-card">
        <div class="product-img-wrap" onclick="closeCategoryPage();openProductModal(${p.id})" style="cursor:pointer">
          ${imgHtml}
          <div class="product-badges">${oosBadge}${discountBadge}${newBadge}</div>
        </div>
        <div class="product-info">
          <h3 class="product-name">${p.name}</h3>
          <p class="product-brand">${p.brand}</p>
          <div class="product-price">${priceHtml}</div>
          ${btnHtml}
        </div>
      </div>`;
  }

  let html = '';

  if (inStock.length > 0) {
    html += `<div class="catpage-group-title"><span class="catpage-dot catpage-dot--green"></span>Available (${inStock.length})</div>`;
    html += `<div class="catpage-grid">${inStock.map(buildCard).join('')}</div>`;
  }

  if (outOfStock.length > 0) {
    html += `<div class="catpage-group-title" style="margin-top:36px"><span class="catpage-dot catpage-dot--red"></span>Out of Stock (${outOfStock.length})</div>`;
    html += `<div class="catpage-grid catpage-grid--oos">${outOfStock.map(buildCard).join('')}</div>`;
  }

  if (catProducts.length === 0) {
    html = `<div class="catpage-empty">No products in this category yet. Check back soon!</div>`;
  }

  // Inject into overlay
  document.getElementById('catpage-title').textContent = cat.name;
  document.getElementById('catpage-subtitle').textContent = `${catProducts.length} product${catProducts.length !== 1 ? 's' : ''}`;
  document.getElementById('catpage-body').innerHTML = html;

  // Hero image
  const heroEl = document.getElementById('catpage-hero');
  if (heroEl) heroEl.style.backgroundImage = `url(${cat.image})`;

  document.getElementById('catpage-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCategoryPage() {
  document.getElementById('catpage-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function updateCategoryCounts() {
  // Kept for compatibility
  renderCategories();
}

// === DEALS ===
function renderDeals() {
  const dealProducts = getProducts().filter(p => p.deal);
  const grid = document.getElementById('deal-products');
  if (!grid) return;
  grid.innerHTML = '';
  dealProducts.slice(0, 4).forEach(p => {
    const sold = Math.floor(Math.random() * 60) + 20;
    const total = sold + p.stock;
    const pct = Math.round((sold / total) * 100);
    const div = document.createElement('div');
    div.className = 'deal-card';
    div.innerHTML = `
      <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
      <div class="deal-info">
        <div class="badge badge-red" style="margin-bottom:6px">-${p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : p.discount}%</div>
        <h4>${p.name}</h4>
        <div class="deal-price-row">
          <span class="new">₦${p.price.toLocaleString()}</span>
          <span class="old">₦${p.originalPrice ? p.originalPrice.toLocaleString() : ''}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <p class="deal-stock">Sold: ${sold} | Remaining: ${p.stock}</p>
        <button class="btn btn-gold" style="margin-top:10px;padding:8px 18px;font-size:0.75rem" onclick="addToCart(${p.id})">Add to Cart</button>
      </div>`;
    grid.appendChild(div);
  });
}

// === COUNTDOWN ===
function initCountdown() {
  const end = new Date();
  end.setHours(end.getHours() + 23, end.getMinutes() + 59, 59);
  function tick() {
    const now = new Date();
    let diff = Math.max(0, Math.floor((end - now) / 1000));
    const h = Math.floor(diff / 3600);
    diff %= 3600;
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    const hEl = document.getElementById('cd-h');
    const mEl = document.getElementById('cd-m');
    const sEl = document.getElementById('cd-s');
    if (hEl) hEl.textContent = String(h).padStart(2, '0');
    if (mEl) mEl.textContent = String(m).padStart(2, '0');
    if (sEl) sEl.textContent = String(s).padStart(2, '0');
  }
  tick();
  setInterval(tick, 1000);
}

// === CART ===
function addToCart(id) {
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if (!product || product.stock === 0) return;
  const existing = cart.find(i => i.id === id);
  if (existing) {
    if (existing.qty >= product.stock) { showToast('Max stock reached!'); return; }
    existing.qty++;
  } else {
    cart.push({ id, qty: 1, name: product.name, price: product.price, image: product.images[0], brand: product.brand });
  }
  saveCart();
  updateCartUI();
  showToast(`"${product.name}" added to cart!`);
  closeProductModal();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
}

function changeQty(id, delta) {
  const products = getProducts();
  const product = products.find(p => p.id === id);
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { removeFromCart(id); return; }
  if (product && item.qty > product.stock) { item.qty = product.stock; showToast('Max stock reached!'); }
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('jfab_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cart-count').textContent = count;
  const mb = document.getElementById('mbn-cart-badge');
  if (mb) { mb.textContent = count; mb.style.display = count > 0 ? 'flex' : 'none'; }

  const itemsDiv = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  if (cart.length === 0) {
    itemsDiv.innerHTML = '<div class="empty-cart">🛍️ Your cart is empty</div>';
    footer.style.display = 'none';
    return;
  }
  footer.style.display = 'block';
  itemsDiv.innerHTML = '';
  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p>${item.brand}</p>
        <div class="cart-item-qty">
          <button onclick="changeQty(${item.id}, -1)">-</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${item.id}, 1)">+</button>
        </div>
      </div>
      <div>
        <div class="cart-item-price">₦${(item.price * item.qty).toLocaleString()}</div>
        <div class="cart-item-remove" onclick="removeFromCart(${item.id})">🗑</div>
      </div>`;
    itemsDiv.appendChild(div);
  });
  updateCartTotals();
}

function getPromoObject() {
  if (!appliedPromo) return null;
  return PROMO_CODES[appliedPromo] || null;
}

function updateCartTotals() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const promo    = getPromoObject();

  let discount       = 0;
  let freeShipping   = false;

  if (promo) {
    if (promo.type === 'percent')  discount     = Math.round(subtotal * promo.value / 100);
    else if (promo.type === 'fixed') discount   = Math.min(promo.value, subtotal);
    else if (promo.type === 'shipping') freeShipping = true;
  }

  // Effective delivery cost (zero if free-shipping promo or pickup)
  const effectiveDelivery = freeShipping ? 0 : currentDeliveryCost;
  const total             = subtotal - discount + effectiveDelivery;

  // Subtotal
  document.getElementById('cart-subtotal').textContent = `₦${subtotal.toLocaleString()}`;

  // Discount row
  const discRow = document.getElementById('discount-row');
  if (discount > 0) {
    discRow.style.display = 'flex';
    document.getElementById('cart-discount').textContent = `-₦${discount.toLocaleString()}`;
  } else {
    discRow.style.display = 'none';
  }

  // Delivery row — show FREE tag when shipping promo active
  const deliveryEl = document.getElementById('cart-delivery');
  if (freeShipping && currentDeliveryType && currentDeliveryType !== 'pickup') {
    deliveryEl.innerHTML = `<span style="text-decoration:line-through;color:#aaa;font-size:0.82rem">₦${currentDeliveryCost.toLocaleString()}</span> <span style="color:#27ae60;font-weight:700;font-size:0.82rem">FREE</span>`;
  } else if (currentDeliveryCost === 0 && currentDeliveryType !== 'pickup') {
    deliveryEl.textContent = 'TBD';
  } else {
    deliveryEl.textContent = `₦${effectiveDelivery.toLocaleString()}`;
  }

  // Total
  document.getElementById('cart-total').textContent = currentDeliveryType
    ? `₦${total.toLocaleString()}`
    : `₦${(subtotal - discount).toLocaleString()} + delivery`;

  // Applied promo tag + remove button
  const promoTagEl = document.getElementById('applied-promo-tag');
  if (promoTagEl) {
    if (promo) {
      const label = freeShipping ? '🚚 Free Shipping' : promo.description;
      promoTagEl.style.display = 'flex';
      promoTagEl.querySelector('.promo-tag-text').textContent = label;
    } else {
      promoTagEl.style.display = 'none';
    }
  }
}

async function applyPromo() {
  const code = document.getElementById('promo-input').value.trim().toUpperCase();
  if (!code) { showToast('Enter a promo code first'); return; }

  // Loyalty points redemption
  if (code === 'POINTS') {
    const pts = currentUser ? currentUser.points || 0 : 0;
    if (pts >= 10) {
      appliedPromo = 'POINTS_REDEEM';
      PROMO_CODES['POINTS_REDEEM'] = { type: 'fixed', value: pts * 50, description: `${pts} loyalty points redeemed` };
      showToast(`✅ ${pts} points redeemed — ₦${pts * 50} off!`);
      updateCartTotals();
      return;
    }
    showToast('❌ You need at least 10 points to redeem');
    return;
  }

  // Always validate fresh from backend so admin-created codes work instantly.
  // Fall back to hardcoded cache only if server is unreachable.
  showToast('Checking code…');
  try {
    const res  = await fetch(API_BASE + '/promos/validate/' + encodeURIComponent(code));
    const data = await res.json();
    if (data.success) {
      const p = data.promo;
      // Update cache with latest values from DB
      PROMO_CODES[p.code] = { type: p.type, value: p.value, description: p.description };
      appliedPromo = p.code;
      const msg = p.type === 'shipping'
        ? `🚚 ${p.description} applied!`
        : `✅ ${p.description} applied!`;
      showToast(msg);
      updateCartTotals();
    } else {
      // Maybe the backend is seeded but code really is invalid
      showToast('❌ ' + (data.message || 'Invalid or expired promo code'));
    }
  } catch (_) {
    // Offline fallback — check local PROMO_CODES cache
    if (PROMO_CODES[code]) {
      appliedPromo = code;
      showToast(`✅ ${PROMO_CODES[code].description} applied!`);
      updateCartTotals();
    } else {
      showToast('❌ Could not validate promo — check your connection.');
    }
  }
}

// BUG 6: Remove promo
function removePromo() {
  appliedPromo = null;
  const input = document.getElementById('promo-input');
  if (input) input.value = '';
  showToast('Promo code removed');
  updateCartTotals();
}

function openCart() {
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-sidebar').classList.add('open');
}
function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-sidebar').classList.remove('open');
}

// === PRODUCT MODAL ===
function openProductModal(id) {
  const products = getProducts();
  const p = products.find(pr => pr.id === id);
  if (!p) return;
  currentProductId = id;
  let mainImg = p.images[0];
  const thumbsHtml = p.images.map((img, i) =>
    `<img src="${img}" class="pm-thumb ${i===0?'active':''}" onclick="switchPMImg(this, '${img}')" alt="view ${i+1}">`
  ).join('');
  const priceHtml = p.originalPrice
    ? `<span class="price-new">₦${p.price.toLocaleString()}</span> <span class="price-old">₦${p.originalPrice.toLocaleString()}</span> <span class="price-save">Save ₦${(p.originalPrice - p.price).toLocaleString()}</span>`
    : `<span class="price-new">₦${p.price.toLocaleString()}</span>`;
  const btnHtml = p.stock === 0
    ? `<button class="product-btn notify-btn" onclick="openNotifyModal(${p.id})">🔔 Notify Me When Available</button>`
    : `<div class="pm-qty-row"><label>Qty</label><div class="qty-ctrl"><button onclick="pmQtyChange(-1)">-</button><span id="pm-qty">1</span><button onclick="pmQtyChange(1)">+</button></div></div>
       <button class="btn btn-gold w-full" onclick="pmAddToCart()">Add to Cart</button>`;

  document.getElementById('pm-content').innerHTML = `
    <div class="pm-gallery">
      <img src="${mainImg}" alt="${p.name}" class="pm-main-img" id="pm-main-img">
      <div class="pm-thumbs">${thumbsHtml}</div>
    </div>
    <div class="pm-details">
      <div class="product-cat">${categoryLabel(p.category)}</div>
      <h2 class="product-name">${p.name}</h2>
      <p class="product-brand">${p.brand}</p>
      <div class="product-price">${priceHtml}</div>
      <p>${p.description}</p>
      <p style="font-size:0.78rem;color:${p.stock > 0 ? 'green' : 'red'};margin-bottom:12px">
        ${p.stock > 5 ? '✅ In Stock' : p.stock > 0 ? `⚠️ Only ${p.stock} left!` : '❌ Out of Stock'}
      </p>
      ${btnHtml}
    </div>`;

  document.getElementById('product-modal-overlay').classList.add('open');
}

function switchPMImg(el, src) {
  document.getElementById('pm-main-img').src = src;
  document.querySelectorAll('.pm-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

function pmQtyChange(d) {
  const el = document.getElementById('pm-qty');
  if (!el) return;
  let qty = parseInt(el.textContent) + d;
  if (qty < 1) qty = 1;
  const p = getProducts().find(pr => pr.id === currentProductId);
  if (p && qty > p.stock) qty = p.stock;
  el.textContent = qty;
}

function pmAddToCart() {
  const qty = parseInt(document.getElementById('pm-qty')?.textContent || 1);
  for (let i = 0; i < qty; i++) addToCart(currentProductId);
}

function closeProductModal() {
  document.getElementById('product-modal-overlay').classList.remove('open');
}

// === CHECKOUT ===
function proceedToCheckout() {
  if (cart.length === 0) { showToast('Your cart is empty'); return; }
  closeCart();
  checkoutStep = 1;
  document.getElementById('checkout-modal-overlay').classList.add('open');
  showStep(1);
}

function goToStep(n) {
  if (n === 2 && !validateStep1()) return;
  if (n === 3 && !validateStep2()) return;
  checkoutStep = n;
  showStep(n);
}

function showStep(n) {
  [1,2,3].forEach(i => {
    document.getElementById(`checkout-step${i}`).style.display = i === n ? 'block' : 'none';
    document.getElementById(`step${i}-tab`).classList.toggle('active', i === n);
  });
  if (n === 3) renderOrderSummary();
}

function validateStep1() {
  const name = document.getElementById('co-name')?.value;
  const email = document.getElementById('co-email')?.value;
  const phone = document.getElementById('co-phone')?.value;
  if (!name || !email || !phone) { showToast('Please fill all required fields'); return false; }
  return true;
}

function validateStep2() {
  if (!currentDeliveryType) { showToast('Please select a fulfillment method'); return false; }
  if (currentDeliveryType === 'delivery') {
    const zone = document.getElementById('delivery-zone')?.value;
    const addr = document.getElementById('co-address')?.value;
    if (!zone || !addr) { showToast('Please select zone and enter address'); return false; }
  }
  return true;
}

function setGuestMode(guest, btn) {
  isGuestCheckout = guest;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('guest-form').style.display = guest ? 'block' : 'none';
  document.getElementById('auth-form').style.display = guest ? 'none' : 'block';
}

function setDelivery(type) {
  currentDeliveryType = type;
  document.getElementById('delivery-options').style.display = type === 'delivery' ? 'block' : 'none';
  document.getElementById('pickup-info').style.display = type === 'pickup' ? 'block' : 'none';
  currentDeliveryCost = type === 'pickup' ? 0 : currentDeliveryCost;
  if (type === 'pickup') updateCartTotals();
}

function updateDeliveryCost() {
  const zone = document.getElementById('delivery-zone')?.value;
  currentDeliveryCost = DELIVERY_RATES[zone] || 0;
  updateCartTotals();
}

function renderOrderSummary() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const promo    = getPromoObject();

  let discount     = 0;
  let freeShipping = false;

  if (promo) {
    if (promo.type === 'percent')    discount     = Math.round(subtotal * promo.value / 100);
    else if (promo.type === 'fixed') discount     = Math.min(promo.value, subtotal);
    else if (promo.type === 'shipping') freeShipping = true;
  }

  const effectiveDelivery = freeShipping ? 0 : currentDeliveryCost;
  const total             = subtotal - discount + effectiveDelivery;

  const items = cart.map(i =>
    `<div style="display:flex;justify-content:space-between;margin-bottom:6px">
       <span>${i.name} ×${i.qty}</span>
       <span>₦${(i.price * i.qty).toLocaleString()}</span>
     </div>`
  ).join('');

  const deliveryLine = freeShipping && currentDeliveryType !== 'pickup'
    ? `<div style="display:flex;justify-content:space-between">
         <span>Delivery</span>
         <span><s style="color:#aaa">₦${currentDeliveryCost.toLocaleString()}</s> <span style="color:#27ae60;font-weight:700">FREE</span></span>
       </div>`
    : `<div style="display:flex;justify-content:space-between">
         <span>Delivery</span>
         <span>₦${effectiveDelivery.toLocaleString()}</span>
       </div>`;

  document.getElementById('order-summary-mini').innerHTML = `
    ${items}
    ${discount > 0 ? `<div style="display:flex;justify-content:space-between;color:#e74c3c;margin-bottom:4px"><span>Discount (${promo.description})</span><span>-₦${discount.toLocaleString()}</span></div>` : ''}
    ${promo && freeShipping ? `<div style="display:flex;justify-content:space-between;color:#27ae60;margin-bottom:4px"><span>Promo (${promo.description})</span><span>Applied</span></div>` : ''}
    ${deliveryLine}
    <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.05rem;border-top:1px solid #eee;padding-top:10px;margin-top:8px">
      <span>Total</span><span>₦${total.toLocaleString()}</span>
    </div>`;

  document.getElementById('paystack-btn-wrap').innerHTML = `
    <button class="btn btn-gold w-full" onclick="initPaystack(${total})">
      🔒 Pay ₦${total.toLocaleString()} via Paystack
    </button>`;
}

function initPaystack(amount) {
  const email = document.getElementById('co-email')?.value || 'customer@jfab.com';
  const name = document.getElementById('co-name')?.value || 'Customer';
  const phone = document.getElementById('co-phone')?.value || '';
  // Paystack inline integration
  if (typeof PaystackPop !== 'undefined') {
    const handler = PaystackPop.setup({
      key: window.PAYSTACK_PUBLIC_KEY || 'pk_live_YOUR_PAYSTACK_KEY',
      email,
      amount: amount * 100,
      currency: 'NGN',
      ref: 'JFAB-' + Date.now(),
      metadata: { name, phone, cart: JSON.stringify(cart), delivery: currentDeliveryType },
      callback: (response) => {
        orderSuccess(response.reference, name, email, amount);
      },
      onClose: () => showToast('Payment window closed')
    });
    handler.openIframe();
  } else {
    // Fallback simulation for demo
    const ref = 'JFAB-DEMO-' + Date.now();
    orderSuccess(ref, name, email, amount);
  }
}

async function orderSuccess(paystackRef, name, email, amount) {
  // Show a "processing" state immediately so the customer knows something is happening
  const overlay = document.getElementById('checkout-modal-overlay');
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:50px;text-align:center;max-width:440px;width:100%;position:relative">
      <div style="font-size:3rem;margin-bottom:16px;animation:spin 1s linear infinite;display:inline-block">⏳</div>
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;margin-bottom:10px">Confirming your order…</h2>
      <p style="color:#aaa;font-size:0.88rem">Please wait — do not close this window</p>
    </div>`;
  overlay.classList.add('open');

  // ── Build order payload ────────────────────────────────────────────────────
  const _promo       = getPromoObject();
  const _rawSub      = cart.reduce((s, i) => s + i.price * i.qty, 0);
  let   _discount    = 0;
  let   _freeShip    = false;
  if (_promo) {
    if (_promo.type === 'percent')      _discount = Math.round(_rawSub * _promo.value / 100);
    else if (_promo.type === 'fixed')   _discount = Math.min(_promo.value, _rawSub);
    else if (_promo.type === 'shipping') _freeShip = true;
  }
  const _delivery = _freeShip ? 0 : (currentDeliveryCost || 0);
  const _total    = _rawSub - _discount + _delivery;

  const payload = {
    customerName:    name,
    customerEmail:   email,
    customerPhone:   document.getElementById('co-phone')?.value?.trim() || '',
    deliveryType:    currentDeliveryType,
    deliveryZone:    document.getElementById('delivery-zone')?.value || '',
    deliveryAddress: document.getElementById('co-address')?.value?.trim() ||
                     (currentDeliveryType === 'pickup' ? 'Store Pickup — Ikota Shopping Complex, VGC, Lagos' : ''),
    items: cart.map(i => ({
      name:  i.name,
      brand: i.brand  || '',
      price: i.price,
      qty:   i.qty,
      image: i.image  || (i.images?.[0] || '')
    })),
    subtotal:     _rawSub,
    deliveryCost: _delivery,
    discount:     _discount,
    total:        _total,
    promoUsed:    appliedPromo || null,
    paymentRef:   paystackRef,
    paymentStatus: 'paid'
  };

  // ── POST to backend — backend creates the canonical ref + sends both emails ─
  let finalRef  = paystackRef; // fallback if backend unreachable
  let backendOk = false;

  try {
    const data = await apiCall('/orders', 'POST', payload);
    if (data.success && data.order?.ref) {
      finalRef  = data.order.ref;   // use backend's canonical JFAB-... ref
      backendOk = true;
    } else {
      console.warn('⚠️ Backend order issue:', data.message);
    }
  } catch (err) {
    console.warn('⚠️ Could not reach backend:', err.message);
  }

  // ── Local cleanup ──────────────────────────────────────────────────────────
  // Award loyalty point locally (backend also does this for logged-in users)
  if (currentUser) {
    currentUser.points = (currentUser.points || 0) + 1;
    localStorage.setItem('jfab_user', JSON.stringify(currentUser));
  }

  // Keep a local copy for offline resilience
  const localOrders = JSON.parse(localStorage.getItem('jfab_orders') || '[]');
  localOrders.push({ ...payload, ref: finalRef, date: new Date().toISOString() });
  localStorage.setItem('jfab_orders', JSON.stringify(localOrders));

  reduceStock(cart);
  appliedPromo = null;
  cart = [];
  saveCart();
  updateCartUI();
  closeCheckout();

  // ── Success screen ─────────────────────────────────────────────────────────
  const emailNote = backendOk
    ? `<p style="font-size:0.85rem;color:#27ae60;margin-bottom:6px">✅ Confirmation email sent to <strong>${email}</strong></p>`
    : `<p style="font-size:0.82rem;color:#e67e22;margin-bottom:6px">⚠️ Email may be delayed — save your reference number</p>`;

  const promoNote = _promo
    ? `<p style="font-size:0.82rem;color:#888;margin-bottom:16px">
         ${_freeShip ? '🚚 Free shipping applied' : `💰 Discount of ₦${_discount.toLocaleString()} applied`}
       </p>`
    : '';

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:40px 32px;text-align:center;max-width:460px;width:100%;position:relative">
      <div style="font-size:3.5rem;margin-bottom:14px">🎉</div>
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.9rem;margin-bottom:10px;color:#1a1a1a">Order Confirmed!</h2>
      <p style="color:#555;margin-bottom:6px">Thank you, <strong>${name}</strong>!</p>
      <div style="background:#faf7f2;border:1px solid #e8dfc9;border-radius:8px;padding:14px 20px;margin:16px 0;display:inline-block">
        <div style="font-size:0.65rem;letter-spacing:2px;text-transform:uppercase;color:#aaa;margin-bottom:4px">Your Order Reference</div>
        <div style="font-size:1.3rem;font-weight:700;color:#C9A84C;letter-spacing:1.5px">${finalRef}</div>
      </div>
      ${emailNote}
      ${promoNote}
      <p style="font-size:0.82rem;color:#aaa;margin-bottom:20px">
        ${currentDeliveryType === 'pickup'
          ? '🏪 Your order will be ready for pickup at Ikota Shopping Complex, VGC, Lagos'
          : '🚚 Expected delivery: 1–3 business days'}
      </p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-gold" onclick="document.getElementById('checkout-modal-overlay').classList.remove('open')">
          Continue Shopping
        </button>
        <a href="https://wa.me/2348147474278?text=${encodeURIComponent('Hi! My order ref is ' + finalRef)}"
           target="_blank"
           style="display:inline-flex;align-items:center;gap:6px;padding:13px 20px;border:2px solid #1a1a1a;border-radius:4px;font-size:0.78rem;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#1a1a1a;text-decoration:none">
          💬 WhatsApp Us
        </a>
      </div>
    </div>`;
}

function reduceStock(items) {
  // Reduce in localStorage cache immediately for UI responsiveness
  const products = getProducts();
  items.forEach(item => {
    const p = products.find(pr => pr.id === item.id);
    if (p) p.stock = Math.max(0, p.stock - item.qty);
  });
  localStorage.setItem('jfab_products', JSON.stringify(products));
  if (_backendProducts) {
    items.forEach(item => {
      const p = _backendProducts.find(pr => pr.id === item.id);
      if (p) p.stock = Math.max(0, p.stock - item.qty);
    });
  }

  // Also deduct on backend (non-blocking)
  fetch(API_BASE + '/products/deduct-stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: items.map(i => ({ id: i.id, qty: i.qty })) })
  }).catch(() => console.warn('Stock deduct API call failed'));
}

function closeCheckout() {
  document.getElementById('checkout-modal-overlay').classList.remove('open');
}

// === AUTH ===
function openAuthModal(mode) {
  const modal = document.getElementById('auth-modal-overlay');
  const content = document.getElementById('auth-modal-content');
  if (mode === 'login') {
    content.innerHTML = `
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.8rem;margin-bottom:20px">Login</h2>
      <input type="email" id="login-email" placeholder="Email Address">
      <input type="password" id="login-pass" placeholder="Password">
      <button class="btn btn-gold w-full" onclick="loginUser()" style="margin-bottom:12px">Login</button>
      <p style="text-align:center;font-size:0.85rem">
        <a href="#" onclick="openAuthModal('forgot')" style="color:#C9A84C">Forgot password?</a>
      </p>
      <p style="text-align:center;font-size:0.85rem;margin-top:8px">No account? <a href="#" onclick="openAuthModal('register')" style="color:#C9A84C">Register</a></p>`;
  } else if (mode === 'forgot') {
    content.innerHTML = `
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.8rem;margin-bottom:8px">Forgot Password</h2>
      <p style="color:#888;font-size:0.88rem;margin-bottom:20px">Enter your email and we'll send you a reset link.</p>
      <input type="email" id="forgot-email" placeholder="Email Address">
      <button class="btn btn-gold w-full" onclick="sendForgotPassword()" style="margin-bottom:12px">Send Reset Link</button>
      <p style="text-align:center;font-size:0.85rem"><a href="#" onclick="openAuthModal('login')" style="color:#C9A84C">← Back to Login</a></p>`;
  } else {
    content.innerHTML = `
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.8rem;margin-bottom:20px">Create Account</h2>
      <input type="text" id="reg-name" placeholder="Full Name">
      <input type="email" id="reg-email" placeholder="Email Address">
      <input type="tel" id="reg-phone" placeholder="Phone Number">
      <input type="password" id="reg-pass" placeholder="Password">
      <button class="btn btn-gold w-full" onclick="registerUser()" style="margin-bottom:12px">Create Account</button>
      <p style="text-align:center;font-size:0.85rem">Have an account? <a href="#" onclick="openAuthModal('login')" style="color:#C9A84C">Login</a></p>`;
  }
  modal.classList.add('open');
}

async function sendForgotPassword() {
  const email = document.getElementById('forgot-email')?.value?.trim();
  if (!email) { showToast('Please enter your email address'); return; }
  try {
    const data = await apiCall('/auth/forgot-password', 'POST', { email });
    showToast(data.message || 'Reset link sent! Check your inbox.', 'success');
    // Close modal after short delay
    setTimeout(() => document.getElementById('auth-modal-overlay').classList.remove('open'), 2500);
  } catch (err) {
    showToast('Could not send reset email. Please try again.');
  }
}

// ─── BACKEND API CONFIG ──────────────────────────────────────────────────────
// API_BASE: set window.JFAB_API in a <script> tag in your HTML to override
// e.g. <script>window.JFAB_API = 'https://your-backend.railway.app/api';</script>
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : (window.JFAB_API || 'https://j-fab-production.up.railway.app/api');

function getAuthToken() { return localStorage.getItem('jfab_token'); }
function setAuthData(token, user) {
  localStorage.setItem('jfab_token', token);
  localStorage.setItem('jfab_user', JSON.stringify(user));
}
function clearAuthData() {
  localStorage.removeItem('jfab_token');
  localStorage.removeItem('jfab_user');
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + endpoint, opts);
  return res.json();
}

async function loginUser() {
  const email = document.getElementById('login-email')?.value?.trim();
  const pass = document.getElementById('login-pass')?.value;
  if (!email || !pass) { showToast('Please enter email and password'); return; }

  showToast('Logging in...');
  try {
    const data = await apiCall('/auth/login', 'POST', { email, password: pass });
    if (data.success) {
      setAuthData(data.token, data.user);
      currentUser = data.user;
      closeAuthModal();
      showToast(`Welcome back, ${data.user.name.split(' ')[0]}! 👋`);
      updateUserUI();
    } else {
      showToast(data.message || 'Login failed');
    }
  } catch (e) {
    showToast('Could not reach server. Please try again.');
  }
}

async function registerUser() {
  const name = document.getElementById('reg-name')?.value?.trim();
  const email = document.getElementById('reg-email')?.value?.trim();
  const phone = document.getElementById('reg-phone')?.value?.trim();
  const pass = document.getElementById('reg-pass')?.value;
  if (!name || !email || !pass) { showToast('Please fill all required fields'); return; }

  showToast('Creating your account...');
  try {
    const data = await apiCall('/auth/register', 'POST', { name, email, phone, password: pass });
    if (data.success) {
      setAuthData(data.token, data.user);
      currentUser = data.user;
      closeAuthModal();
      showToast(`Welcome to J-Fab, ${name}! 🌹 Check your email.`);
      updateUserUI();
    } else {
      showToast(data.message || 'Registration failed');
    }
  } catch (e) {
    showToast('Could not reach server. Please try again.');
  }
}

function logoutUser() {
  clearAuthData();
  currentUser = null;
  updateUserUI();
  closeProfile();
  showToast('You have been logged out.');
}

function handleAccountClick() {
  if (currentUser) {
    openProfile();
  } else {
    openAuthModal('login');
  }
}

function updateUserUI() {
  const label = document.getElementById('account-label');
  const mbnLabel = document.getElementById('mbn-account-label');
  if (currentUser) {
    const first = currentUser.name.split(' ')[0];
    if (label) label.textContent = first;
    if (mbnLabel) mbnLabel.textContent = first;
  } else {
    if (label) label.textContent = 'Account';
    if (mbnLabel) mbnLabel.textContent = 'Account';
  }
}

// ─── PROFILE PANEL ──────────────────────────────────────────────────────────
function openProfile() {
  renderProfilePanel('dashboard');
  document.getElementById('profile-overlay').classList.add('open');
  document.getElementById('profile-sidebar').classList.add('open');
}

function closeProfile() {
  document.getElementById('profile-overlay').classList.remove('open');
  document.getElementById('profile-sidebar').classList.remove('open');
}

function renderProfilePanel(tab) {
  const body = document.getElementById('profile-body');
  const u = currentUser;
  const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);

  const tabs = [
    { id:'dashboard', icon:'🏠', label:'Dashboard' },
    { id:'orders',    icon:'📦', label:'My Orders' },
    { id:'addresses', icon:'📍', label:'Addresses' },
    { id:'settings',  icon:'⚙️',  label:'Settings' },
  ];

  const tabHtml = tabs.map(t => `
    <button class="prof-tab ${tab===t.id?'active':''}" onclick="renderProfilePanel('${t.id}')">
      <span>${t.icon}</span> ${t.label}
    </button>`).join('');

  let contentHtml = '';

  if (tab === 'dashboard') {
    contentHtml = `
      <div class="prof-avatar-wrap">
        <div class="prof-avatar">${initials}</div>
        <div>
          <div class="prof-name">${u.name}</div>
          <div class="prof-email">${u.email}</div>
          ${u.phone ? `<div class="prof-phone">${u.phone}</div>` : ''}
        </div>
      </div>
      <div class="prof-points-card">
        <div class="prof-points-num">${u.points || 0}</div>
        <div class="prof-points-label">Loyalty Points</div>
        <div class="prof-points-hint">Earn 1 point per order · Redeem as discount</div>
      </div>
      <div class="prof-quick-links">
        <button class="prof-qlink" onclick="renderProfilePanel('orders')">📦 My Orders</button>
        <button class="prof-qlink" onclick="renderProfilePanel('addresses')">📍 Addresses</button>
        <button class="prof-qlink" onclick="renderProfilePanel('settings')">⚙️ Settings</button>
      </div>
      <button class="prof-logout-btn" onclick="logoutUser()">Sign Out</button>`;
  }

  else if (tab === 'orders') {
    contentHtml = `<div class="prof-section-title">Order History</div>
      <div id="prof-orders-list"><div class="prof-loading">Loading orders…</div></div>`;
  }

  else if (tab === 'addresses') {
    const addrs = u.addresses || [];
    const addrCards = addrs.length
      ? addrs.map((a, i) => `
          <div class="prof-addr-card">
            <div class="prof-addr-label">${a.label || 'Address'}</div>
            <div class="prof-addr-text">${a.address}</div>
            <div class="prof-addr-zone">${a.zone || ''}</div>
            <button class="prof-addr-del" onclick="deleteAddress(${i})">Remove</button>
          </div>`).join('')
      : '<p class="prof-empty">No saved addresses yet.</p>';

    contentHtml = `<div class="prof-section-title">Saved Addresses</div>
      <div id="prof-addr-list">${addrCards}</div>
      <div class="prof-form" id="addr-form">
        <div class="prof-form-title">Add New Address</div>
        <input class="prof-input" id="addr-label" placeholder="Label (e.g. Home, Office)">
        <textarea class="prof-input" id="addr-text" placeholder="Full address" rows="2"></textarea>
        <select class="prof-input" id="addr-zone">
          <option value="">Select delivery zone</option>
          <option value="island">Lagos Island (₦2,500)</option>
          <option value="mainland">Lagos Mainland (₦3,500)</option>
          <option value="outside">Outside Lagos (₦5,000)</option>
        </select>
        <button class="btn btn-gold" style="width:100%;margin-top:4px" onclick="saveAddress()">Save Address</button>
      </div>`;
  }

  else if (tab === 'settings') {
    contentHtml = `<div class="prof-section-title">Profile Settings</div>
      <div class="prof-form">
        <div class="prof-form-title">Update Details</div>
        <input class="prof-input" id="set-name" value="${u.name}" placeholder="Full Name">
        <input class="prof-input" id="set-phone" value="${u.phone||''}" placeholder="Phone Number">
        <button class="btn btn-gold" style="width:100%;margin-top:4px" onclick="saveProfileSettings()">Save Changes</button>
      </div>
      <div class="prof-form" style="margin-top:20px">
        <div class="prof-form-title">Change Password</div>
        <input class="prof-input" type="password" id="set-curpass" placeholder="Current Password">
        <input class="prof-input" type="password" id="set-newpass" placeholder="New Password (min 6 chars)">
        <button class="btn btn-gold" style="width:100%;margin-top:4px" onclick="saveNewPassword()">Update Password</button>
      </div>`;
  }

  body.innerHTML = `
    <div class="prof-tabs">${tabHtml}</div>
    <div class="prof-content">${contentHtml}</div>`;

  if (tab === 'orders') loadProfileOrders();
}

async function loadProfileOrders() {
  try {
    const data = await apiCall('/orders/my', 'GET');
    const el = document.getElementById('prof-orders-list');
    if (!el) return;
    if (!data.success || !data.orders || data.orders.length === 0) {
      el.innerHTML = '<p class="prof-empty">No orders yet. Start shopping! 🛍️</p>';
      return;
    }
    el.innerHTML = data.orders.map(o => `
      <div class="prof-order-card">
        <div class="prof-order-top">
          <span class="prof-order-id">#${o._id.slice(-6).toUpperCase()}</span>
          <span class="prof-order-status prof-order-status--${o.status}">${o.status}</span>
        </div>
        <div class="prof-order-date">${new Date(o.createdAt).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</div>
        <div class="prof-order-items">${o.items.map(i=>`${i.name} ×${i.qty}`).join(', ')}</div>
        <div class="prof-order-total">₦${o.total.toLocaleString()}</div>
      </div>`).join('');
  } catch(e) {
    const el = document.getElementById('prof-orders-list');
    if (el) el.innerHTML = '<p class="prof-empty">Could not load orders.</p>';
  }
}

async function saveAddress() {
  const label = document.getElementById('addr-label')?.value.trim();
  const address = document.getElementById('addr-text')?.value.trim();
  const zone = document.getElementById('addr-zone')?.value;
  if (!address) { showToast('Please enter an address'); return; }

  const newAddresses = [...(currentUser.addresses || []), { label: label||'Address', address, zone }];
  try {
    const data = await apiCall('/auth/profile', 'PUT', { addresses: newAddresses });
    if (data.success) {
      currentUser.addresses = data.user.addresses;
      localStorage.setItem('jfab_user', JSON.stringify(currentUser));
      showToast('Address saved!');
      renderProfilePanel('addresses');
    } else { showToast(data.message || 'Failed to save'); }
  } catch(e) { showToast('Server error. Please try again.'); }
}

async function deleteAddress(index) {
  const newAddresses = (currentUser.addresses || []).filter((_,i) => i !== index);
  try {
    const data = await apiCall('/auth/profile', 'PUT', { addresses: newAddresses });
    if (data.success) {
      currentUser.addresses = data.user.addresses;
      localStorage.setItem('jfab_user', JSON.stringify(currentUser));
      showToast('Address removed');
      renderProfilePanel('addresses');
    }
  } catch(e) { showToast('Server error.'); }
}

async function saveProfileSettings() {
  const name = document.getElementById('set-name')?.value.trim();
  const phone = document.getElementById('set-phone')?.value.trim();
  if (!name) { showToast('Name cannot be empty'); return; }
  try {
    const data = await apiCall('/auth/profile', 'PUT', { name, phone });
    if (data.success) {
      currentUser.name = data.user.name;
      currentUser.phone = data.user.phone;
      localStorage.setItem('jfab_user', JSON.stringify(currentUser));
      updateUserUI();
      showToast('Profile updated!');
      renderProfilePanel('settings');
    } else { showToast(data.message || 'Failed to update'); }
  } catch(e) { showToast('Server error.'); }
}

async function saveNewPassword() {
  const currentPassword = document.getElementById('set-curpass')?.value;
  const newPassword = document.getElementById('set-newpass')?.value;
  if (!currentPassword || !newPassword) { showToast('Please fill both fields'); return; }
  if (newPassword.length < 6) { showToast('New password must be at least 6 characters'); return; }
  try {
    const data = await apiCall('/auth/change-password', 'PUT', { currentPassword, newPassword });
    if (data.success) {
      showToast('Password updated successfully!');
      document.getElementById('set-curpass').value = '';
      document.getElementById('set-newpass').value = '';
    } else { showToast(data.message || 'Failed to change password'); }
  } catch(e) { showToast('Server error.'); }
}

function closeAuthModal() {
  document.getElementById('auth-modal-overlay').classList.remove('open');
}

// === NOTIFY ME ===
function openNotifyModal(id) {
  notifyProductId = id;
  document.getElementById('notify-modal-overlay').classList.add('open');
}
function closeNotifyModal() {
  document.getElementById('notify-modal-overlay').classList.remove('open');
}
async function submitNotify() {
  const email = document.getElementById('notify-email')?.value?.trim();
  if (!email) { showToast('Please enter your email'); return; }

  const name      = document.getElementById('notify-name')?.value?.trim() || '';
  const phone     = document.getElementById('notify-phone')?.value?.trim() || '';
  const products  = getProducts();
  const product   = products.find(p => p.id === notifyProductId);
  const productName = product ? product.name : '';

  showToast('Saving your alert…');
  try {
    const res  = await fetch(API_BASE + '/notifications/stock-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, phone, productId: notifyProductId, productName })
    });
    const data = await res.json();
    closeNotifyModal();
    showToast(data.success ? '✅ You\'ll be notified when it\'s back!' : (data.message || 'Could not save alert.'));
  } catch (_) {
    // Fallback — save locally so we don't lose it
    const notifies = JSON.parse(localStorage.getItem('jfab_notifies') || '[]');
    notifies.push({ productId: notifyProductId, productName, name, email, phone, date: new Date().toISOString() });
    localStorage.setItem('jfab_notifies', JSON.stringify(notifies));
    closeNotifyModal();
    showToast('✅ Alert saved — we\'ll let you know when it\'s back!');
  }
}

// === FAQ ===
function renderFAQ() {
  const list = document.getElementById('faq-list');
  if (!list) return;
  list.innerHTML = FAQS.map((faq, i) => `
    <div class="faq-item" id="faq-${i}">
      <div class="faq-q" onclick="toggleFAQ(${i})">${faq.q}<span>+</span></div>
      <div class="faq-a">${faq.a}</div>
    </div>`).join('');
}

function toggleFAQ(i) {
  const item = document.getElementById('faq-' + i);
  item.classList.toggle('open');
}

// === SEARCH ===
function openSearch() {
  document.getElementById('search-overlay').classList.add('open');
  setTimeout(() => document.getElementById('search-input')?.focus(), 100);
}
function closeSearch() {
  document.getElementById('search-overlay').classList.remove('open');
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('search-input').value = '';
}

// Mobile header search bar
function mobileSearchLive(val) {
  const clear = document.getElementById('mobile-search-clear');
  if (clear) clear.style.display = val.length ? 'block' : 'none';
  if (val.length < 2) return;
  // Open the main search overlay and populate it
  openSearch();
  const input = document.getElementById('search-input');
  if (input) { input.value = val; doSearch(val); }
}
function mobileSearchFocus() {
  const val = document.getElementById('mobile-search-input')?.value || '';
  if (val.length >= 2) mobileSearchLive(val);
}
function mobileSearchBlur() {
  // Small delay so clicks on results register first
  setTimeout(() => {
    const val = document.getElementById('mobile-search-input')?.value || '';
    if (!val) clearMobileSearch();
  }, 200);
}
function clearMobileSearch() {
  const inp = document.getElementById('mobile-search-input');
  const clear = document.getElementById('mobile-search-clear');
  if (inp) inp.value = '';
  if (clear) clear.style.display = 'none';
  closeSearch();
}
function doSearch(q) {
  const results = document.getElementById('search-results');
  if (q.length < 2) { results.innerHTML = ''; return; }
  const products = getProducts().filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.brand.toLowerCase().includes(q.toLowerCase()) ||
    p.tags.some(t => t.includes(q.toLowerCase()))
  );
  results.innerHTML = products.slice(0,9).map(p => `
    <div onclick="closeSearch();openProductModal(${p.id})" style="background:#1a1a1a;border-radius:8px;cursor:pointer;overflow:hidden">
      <img src="${p.images[0]}" style="width:100%;height:130px;object-fit:cover">
      <div style="padding:10px">
        <p style="color:#C9A84C;font-size:0.7rem;font-weight:600">${categoryLabel(p.category)}</p>
        <p style="color:#fff;font-size:0.88rem">${p.name}</p>
        <p style="color:#C9A84C;font-weight:700">₦${p.price.toLocaleString()}</p>
      </div>
    </div>`).join('');
  if (products.length === 0) results.innerHTML = '<p style="color:#aaa;text-align:center;grid-column:1/-1">No products found</p>';
}

// === CHAT ===
const chatFAQAnswers = {
  'track': 'To track your order, please contact us on WhatsApp at 08147474278 with your order reference number.',
  'delivery': 'Delivery rates: Island ₦2,500 | Mainland ₦3,500 | Outside Lagos ₦5,000. Pickup is FREE from our store at Ikota Shopping Complex, VGC.',
  'promo': 'Current promos: Use code JFAB10 for 10% off your first order! Also use WELCOME15 for 15% off. Check our announcement bar for live deals.',
  'choose': 'I\'d love to help you find the perfect scent! Could you tell me: Do you prefer floral, woody, fresh, or oriental fragrances? And is it for daily wear or special occasions?',
  'return': 'We accept returns within 7 days for unused products in original packaging. Contact us on WhatsApp: 08147474278',
  'authentic': 'Absolutely! All J-Fab products are 100% authentic, sourced directly from certified suppliers.',
  'payment': 'We accept all debit/credit cards and bank transfers via Paystack — Nigeria\'s most trusted payment gateway.',
  'hours': 'We\'re available online 24/7! Our store at Ikota Shopping Complex, VGC is open Monday–Saturday 9am–7pm.'
};

function toggleChat() {
  const chatbox = document.getElementById('chatbox');
  const trigger = document.getElementById('chat-trigger');
  chatbox.classList.toggle('open');
}

function quickReply(msg) {
  document.getElementById('chat-input').value = msg;
  sendChat();
}

function sendChat() {
  const input = document.getElementById('chat-input');
  const msgs = document.getElementById('chat-messages');
  const msg = input.value.trim();
  if (!msg) return;
  msgs.innerHTML += `<div class="chat-msg user">${msg}</div>`;
  input.value = '';
  msgs.scrollTop = msgs.scrollHeight;
  setTimeout(() => {
    const lower = msg.toLowerCase();
    let reply = 'Thanks for reaching out! For immediate assistance, please WhatsApp us at <a href="https://wa.me/2348147474278" style="color:#C9A84C">08147474278</a>';
    for (const [key, val] of Object.entries(chatFAQAnswers)) {
      if (lower.includes(key)) { reply = val; break; }
    }
    msgs.innerHTML += `<div class="chat-msg bot">${reply}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }, 800);
}

// === CONTACT FORM ===
function submitContact(e) {
  e.preventDefault();
  showToast('✅ Message sent! We\'ll get back to you shortly.');
  e.target.reset();
}

// === MOBILE MENU ===
function toggleMobileMenu() {
  document.getElementById('mobile-menu').classList.toggle('open');
}

// === HEADER SCROLL ===
window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (window.scrollY > 60) header.style.boxShadow = '0 4px 30px rgba(0,0,0,0.15)';
  else header.style.boxShadow = '';
});

// === TOAST ===
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===================================
// FLASH SALE
// ===================================
async function loadFlashSale() {
  const bar     = document.getElementById('flash-sale-bar');
  const section = document.getElementById('flash-sale-section');

  let sale = null;
  try {
    const res  = await fetch(API_BASE + '/config/flash-sale');
    const data = await res.json();
    sale = data.flashSale || null;
    if (sale) localStorage.setItem('jfab_flash_sale', JSON.stringify(sale));
  } catch (_) {
    sale = getFlashSale(); // offline fallback
  }

  // Hide if no sale, inactive, or expired
  if (!sale || !sale.active) {
    if (bar)     bar.style.display     = 'none';
    if (section) section.style.display = 'none';
    return;
  }
  const now = new Date();
  const end = new Date(sale.endTime);
  if (end <= now) {
    if (bar)     bar.style.display     = 'none';
    if (section) section.style.display = 'none';
    return;
  }

  // Show top flash bar
  const barText = document.getElementById('flash-sale-text');
  if (bar && barText) {
    barText.innerHTML = `<strong>${sale.title}</strong>${sale.description ? ' — ' + sale.description : ''}`;
    bar.style.display = 'flex';
    startFlashBarCountdown(end);
  }

  // Show flash sale section
  const titleEl    = document.getElementById('flash-sale-title');
  const productsEl = document.getElementById('flash-products');
  if (!section || !productsEl) return;

  section.style.display = 'block';
  if (titleEl) titleEl.textContent = sale.title;

  const products   = getProducts();
  const flashItems = sale.productIds && sale.productIds.length
    ? products.filter(p => sale.productIds.map(Number).includes(Number(p.id)))
    : products.filter(p => p.deal).slice(0, 4);

  productsEl.innerHTML = '';
  flashItems.forEach(p => {
    const sold  = Math.floor(Math.random() * 50) + 20;
    const total = sold + p.stock;
    const pct   = Math.round((sold / total) * 100);
    const card  = document.createElement('div');
    card.className = 'flash-card';
    card.innerHTML = `
      <span class="flash-card-badge">-${p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : (p.discount || 0)}% OFF</span>
      <button class="flash-wish-btn ${isWishlisted(p.id) ? 'wishlisted' : ''}" onclick="event.stopPropagation();toggleWishlist(${p.id})" title="Wishlist" id="wish-btn-${p.id}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="${isWishlisted(p.id) ? '#e91e63' : 'none'}" stroke="${isWishlisted(p.id) ? '#e91e63' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      </button>
      <img src="${p.images[0]}" alt="${p.name}">
      <div class="flash-card-info">
        <h4>${p.name}</h4>
        <div class="flash-price-row">
          <span class="flash-price-new">₦${p.price.toLocaleString()}</span>
          ${p.originalPrice ? `<span class="flash-price-old">₦${p.originalPrice.toLocaleString()}</span>` : ''}
        </div>
        <div class="flash-progress"><div class="flash-progress-fill" style="width:${pct}%"></div></div>
        <p class="flash-stock-text">Sold: ${sold} | Remaining: ${p.stock}</p>
        <button class="btn btn-gold" style="padding:9px 20px;font-size:0.75rem;width:100%" onclick="addToCart(${p.id})">Add to Cart</button>
      </div>`;
    productsEl.appendChild(card);
  });

  startFlashSectionCountdown(end);
}

function startFlashSectionCountdown(end) {
  function tick() {
    const now = new Date();
    let diff = Math.max(0, Math.floor((end - now) / 1000));
    const h = Math.floor(diff / 3600); diff %= 3600;
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    const hEl = document.getElementById('fcd-h');
    const mEl = document.getElementById('fcd-m');
    const sEl = document.getElementById('fcd-s');
    if (hEl) hEl.textContent = String(h).padStart(2,'0');
    if (mEl) mEl.textContent = String(m).padStart(2,'0');
    if (sEl) sEl.textContent = String(s).padStart(2,'0');
    if (diff <= 0) {
      const section = document.getElementById('flash-sale-section');
      if (section) section.style.display = 'none';
      const bar = document.getElementById('flash-sale-bar');
      if (bar) bar.style.display = 'none';
    }
  }
  tick();
  setInterval(tick, 1000);
}

function startFlashBarCountdown(end) {
  function tick() {
    const now = new Date();
    let diff = Math.max(0, Math.floor((end - now) / 1000));
    const h = Math.floor(diff / 3600); diff %= 3600;
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    const el = document.getElementById('flash-countdown-mini');
    if (el) el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  tick();
  setInterval(tick, 1000);
}

function closeFlashBar() {
  const bar = document.getElementById('flash-sale-bar');
  if (bar) bar.style.display = 'none';
}

// ===================================
// NEWSLETTER
// ===================================
async function submitNewsletter(e) {
  e.preventDefault();
  const email   = document.getElementById('newsletter-email')?.value?.trim();
  const consent = document.getElementById('newsletter-consent')?.checked;
  if (!email || !consent) { showToast('Please fill all required fields'); return; }

  showToast('Subscribing…');
  try {
    const res  = await fetch(API_BASE + '/notifications/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ ' + (data.message || 'Subscribed! Check your inbox.'));
      e.target.reset();
    } else {
      showToast(data.message || 'Could not subscribe. Try again.');
    }
  } catch (_) {
    showToast('✅ Subscribed! We\'ll be in touch.');
    e.target.reset();
  }
}

// ===================================
// REQUEST A PERFUME
// ===================================
const JFAB_EMAIL = 'muizcal@gmail.com';
const JFAB_WHATSAPP = '2348147474278';

let requestImageBase64 = null;

function previewRequestImage(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    requestImageBase64 = e.target.result;
    document.getElementById('request-img-preview').style.display = 'block';
    document.getElementById('request-preview-img').src = e.target.result;
    document.getElementById('request-upload-area').style.display = 'none';
  };
  reader.readAsDataURL(input.files[0]);
}

function clearRequestImage() {
  requestImageBase64 = null;
  document.getElementById('request-img-preview').style.display = 'none';
  document.getElementById('request-upload-area').style.display = 'block';
  document.getElementById('request-img-input').value = '';
}

async function submitPerfumeRequest() {
  const perfumeName = document.getElementById('req-perfume-name')?.value.trim();
  const yourName = document.getElementById('req-your-name')?.value.trim();
  const email = document.getElementById('req-email')?.value.trim();
  const phone = document.getElementById('req-phone')?.value.trim();
  const details = document.getElementById('req-details')?.value.trim();

  if (!perfumeName || !yourName || !email || !phone) {
    showToast('Please fill all required fields');
    return;
  }

  showToast('Sending your request...');

  try {
    // If there's an image, use FormData; otherwise JSON
    let data;
    if (requestImageBase64) {
      const formData = new FormData();
      formData.append('perfumeName', perfumeName);
      formData.append('yourName', yourName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('details', details || '');
      // Convert base64 to blob
      const blob = await fetch(requestImageBase64).then(r => r.blob());
      formData.append('image', blob, 'perfume-request.jpg');

      const headers = {};
      const token = getAuthToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch(API_BASE + '/requests', { method: 'POST', headers, body: formData });
      data = await res.json();
    } else {
      data = await apiCall('/requests', 'POST', { perfumeName, yourName, email, phone, details });
    }

    if (data.success) {
      showToast("✅ Request sent! We'll contact you when it's available.");
      // Also open WhatsApp as extra notification
      const waMsg = encodeURIComponent(`🌟 *Perfume Request — J-Fab*

📦 *Perfume:* ${perfumeName}
👤 *Name:* ${yourName}
📱 *Phone:* ${phone}
📧 *Email:* ${email}
📝 *Details:* ${details || 'None'}
🆔 *Ref:* ${data.ref}`);
      setTimeout(() => window.open(`https://wa.me/${JFAB_WHATSAPP}?text=${waMsg}`, '_blank'), 600);
    } else {
      showToast(data.message || 'Could not submit request. Try again.');
    }
  } catch (e) {
    // Fallback to WhatsApp only if backend unreachable
    showToast('Sending via WhatsApp...');
    const waMsg = encodeURIComponent(`🌟 *Perfume Request — J-Fab*

📦 *Perfume:* ${perfumeName}
👤 *Name:* ${yourName}
📱 *Phone:* ${phone}
📧 *Email:* ${email}
📝 *Details:* ${details || 'None'}`);
    window.open(`https://wa.me/${JFAB_WHATSAPP}?text=${waMsg}`, '_blank');
  }

  // Reset form
  document.getElementById('req-perfume-name').value = '';
  document.getElementById('req-your-name').value = '';
  document.getElementById('req-email').value = '';
  document.getElementById('req-phone').value = '';
  document.getElementById('req-details').value = '';
  clearRequestImage();
}

// ===================================
// BEAUTIFUL ORDER CONFIRMATION EMAIL
// ===================================
function sendOrderConfirmationEmail(order) {
  const { name, email, id: ref, items, amount, deliveryType, deliveryZone, address, date } = order;
  const formattedDate = new Date(date).toLocaleString('en-NG', { dateStyle: 'long', timeStyle: 'short' });
  const deliveryLabel = deliveryType === 'pickup' ? '🏪 Store Pickup (FREE)' :
    deliveryZone === 'island' ? '🚚 Island Delivery — ₦2,500' :
    deliveryZone === 'mainland' ? '🚚 Mainland Delivery — ₦3,500' : '🚚 Outside Lagos — ₦5,000';

  const itemsRows = items.map(item =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0ebe0;font-family:'Georgia',serif;color:#2c2c2c">${item.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0ebe0;text-align:center;color:#666">×${item.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0ebe0;text-align:right;font-weight:600;color:#C9A84C">₦${(item.price * item.qty).toLocaleString()}</td>
    </tr>`
  ).join('');

  const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Confirmed — J-Fab Perfumes</title>
</head>
<body style="margin:0;padding:0;background:#f9f6f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f0;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        
        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#1a1209,#2d2010);border-radius:16px 16px 0 0;padding:40px;text-align:center">
          <div style="font-family:'Georgia',serif;font-size:28px;color:#C9A84C;letter-spacing:3px;font-weight:400;margin-bottom:4px">J·FAB</div>
          <div style="font-size:10px;letter-spacing:5px;text-transform:uppercase;color:rgba(201,168,76,0.6);margin-bottom:30px">PERFUMES SIGNATURE</div>
          <div style="width:60px;height:1px;background:rgba(201,168,76,0.4);margin:0 auto 24px"></div>
          <div style="font-size:42px;margin-bottom:12px">🎉</div>
          <h1 style="color:#fff;margin:0;font-family:'Georgia',serif;font-size:26px;font-weight:400;letter-spacing:1px">Order Confirmed!</h1>
          <p style="color:rgba(255,255,255,0.6);margin:10px 0 0;font-size:14px">Thank you for choosing J-Fab Perfumes</p>
        </td></tr>

        <!-- GREETING BANNER -->
        <tr><td style="background:#C9A84C;padding:16px 40px;text-align:center">
          <p style="margin:0;color:#1a1209;font-weight:700;font-size:14px;letter-spacing:1px">
            Hello ${name}, your fragrance journey begins! ✨
          </p>
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#ffffff;padding:40px">
          
          <!-- ORDER REF BOX -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#faf7f2;border:1px solid #e8dfc9;border-radius:10px;padding:20px;text-align:center;margin-bottom:30px">
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999;margin-bottom:6px">Order Reference</div>
              <div style="font-size:20px;font-weight:700;color:#C9A84C;letter-spacing:2px">${ref}</div>
              <div style="font-size:12px;color:#aaa;margin-top:4px">${formattedDate}</div>
            </td></tr>
          </table>

          <div style="height:24px"></div>

          <!-- ORDER ITEMS -->
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #f0ebe0">Your Order</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsRows}
            <tr>
              <td colspan="3" style="padding-top:16px">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:16px;font-weight:700;color:#1a1209;font-family:'Georgia',serif">Total Paid</td>
                    <td style="text-align:right;font-size:20px;font-weight:700;color:#C9A84C">₦${amount.toLocaleString()}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="height:30px"></div>

          <!-- DELIVERY INFO -->
          <div style="background:#faf7f2;border-left:3px solid #C9A84C;border-radius:0 8px 8px 0;padding:16px 20px">
            <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999;margin-bottom:8px">Delivery Details</div>
            <p style="margin:0;color:#2c2c2c;font-size:14px;font-weight:600">${deliveryLabel}</p>
            ${address && address !== 'Store Pickup' ? `<p style="margin:6px 0 0;color:#666;font-size:13px">📍 ${address}</p>` : ''}
          </div>

          <div style="height:30px"></div>

          <!-- WHAT'S NEXT -->
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999;margin-bottom:16px">What Happens Next?</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="40" valign="top" style="padding-right:12px">
                <div style="width:32px;height:32px;background:#faf7f2;border:1px solid #C9A84C;border-radius:50%;text-align:center;line-height:32px;font-size:13px;color:#C9A84C;font-weight:700">1</div>
              </td>
              <td valign="top" style="padding-bottom:16px">
                <div style="font-weight:600;color:#2c2c2c;font-size:14px">Order Processing</div>
                <div style="color:#888;font-size:13px;margin-top:3px">We're preparing your fragrance with care</div>
              </td>
            </tr>
            <tr>
              <td width="40" valign="top" style="padding-right:12px">
                <div style="width:32px;height:32px;background:#faf7f2;border:1px solid #C9A84C;border-radius:50%;text-align:center;line-height:32px;font-size:13px;color:#C9A84C;font-weight:700">2</div>
              </td>
              <td valign="top" style="padding-bottom:16px">
                <div style="font-weight:600;color:#2c2c2c;font-size:14px">Dispatch & Delivery</div>
                <div style="color:#888;font-size:13px;margin-top:3px">${deliveryType === 'pickup' ? 'Ready for pickup at our Ikota Shopping Complex store' : 'Delivered to your address within 1–3 business days'}</div>
              </td>
            </tr>
            <tr>
              <td width="40" valign="top" style="padding-right:12px">
                <div style="width:32px;height:32px;background:#C9A84C;border-radius:50%;text-align:center;line-height:32px;font-size:13px;color:#1a1209;font-weight:700">3</div>
              </td>
              <td valign="top">
                <div style="font-weight:600;color:#2c2c2c;font-size:14px">Enjoy Your Scent! 🌹</div>
                <div style="color:#888;font-size:13px;margin-top:3px">Your signature fragrance awaits</div>
              </td>
            </tr>
          </table>

          <div style="height:30px"></div>

          <!-- NEED HELP -->
          <div style="background:#1a1209;border-radius:10px;padding:24px;text-align:center">
            <div style="color:#C9A84C;font-family:'Georgia',serif;font-size:16px;margin-bottom:8px">Need Help?</div>
            <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 16px">We're always here to assist you</p>
            <a href="https://wa.me/2348147474278" style="display:inline-block;background:#C9A84C;color:#1a1209;padding:10px 24px;border-radius:20px;text-decoration:none;font-weight:700;font-size:13px;margin-right:8px">💬 WhatsApp Us</a>
            <a href="mailto:muizcal@gmail.com" style="display:inline-block;background:transparent;color:#C9A84C;border:1px solid #C9A84C;padding:10px 24px;border-radius:20px;text-decoration:none;font-size:13px">📧 Email Us</a>
          </div>

        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#f0ebe0;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center">
          <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin-bottom:8px">J-FAB PERFUMES SIGNATURE</div>
          <p style="margin:0;color:#888;font-size:12px">FH84+5Q6, Ikota, Lekki 101245, Lagos</p>
          <p style="margin:6px 0 0;color:#aaa;font-size:11px">© ${new Date().getFullYear()} J-Fab Perfumes. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Open mailto with HTML (most email clients will show text version)
  const textVersion = `
ORDER CONFIRMED — J-FAB PERFUMES
=================================
Order Ref: ${ref}
Date: ${formattedDate}

Hello ${name}, thank you for your order!

ITEMS ORDERED:
${items.map(i => `- ${i.name} ×${i.qty}: ₦${(i.price * i.qty).toLocaleString()}`).join('\n')}

TOTAL PAID: ₦${amount.toLocaleString()}

DELIVERY: ${deliveryLabel}
${address && address !== 'Store Pickup' ? `Address: ${address}` : ''}

For help: WhatsApp 08147474278 or email muizcal@gmail.com

J-Fab Perfumes | FH84+5Q6, Ikota, Lekki 101245, Lagos
  `.trim();

  const subject = encodeURIComponent(`✅ Order Confirmed — ${ref} | J-Fab Perfumes`);
  const body = encodeURIComponent(textVersion);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

  // Also send WhatsApp notification to store
  const waMsg = encodeURIComponent(
    `🛒 *NEW ORDER — J-Fab Perfumes*

` +
    `🆔 *Ref:* ${ref}
` +
    `👤 *Customer:* ${name}
` +
    `📧 *Email:* ${email}
` +
    `💰 *Amount:* ₦${amount.toLocaleString()}
` +
    `🚚 *Delivery:* ${deliveryLabel}
` +
    `${address && address !== 'Store Pickup' ? `📍 *Address:* ${address}
` : ''}` +
    `📦 *Items:*
${items.map(i => `  • ${i.name} ×${i.qty}`).join('\n')}

` +
    `⏰ *Date:* ${formattedDate}`
  );
  setTimeout(() => { window.open(`https://wa.me/${JFAB_WHATSAPP}?text=${waMsg}`, '_blank'); }, 1500);

  return htmlEmail;
}

// Override orderSuccess to also send emails
const _originalOrderSuccess = orderSuccess;
// Patch orderSuccess to send emails after order
window.addEventListener('DOMContentLoaded', () => {
  // This runs after the original orderSuccess has been defined
});
// === FOOTER ACCORDION (mobile) ===
function toggleFooterAcc(btn) {
  const col = btn.closest('.footer-accordion');
  const body = col.querySelector('.footer-acc-body');
  const isOpen = col.classList.contains('acc-open');
  // close all first
  document.querySelectorAll('.footer-accordion.acc-open').forEach(el => {
    el.classList.remove('acc-open');
    el.querySelector('.footer-acc-toggle').setAttribute('aria-expanded', 'false');
  });
  // open this one if it was closed
  if (!isOpen) {
    col.classList.add('acc-open');
    btn.setAttribute('aria-expanded', 'true');
  }
}

// === TESTIMONIALS ===
const TESTIMONIALS = [
  { name: 'Amaka O.', location: 'Lagos Island', stars: 5, text: 'I ordered Baccarat Rouge 540 and it arrived the next day perfectly packed. The scent is 100% authentic — I have bought the original before and this matches exactly. J-Fab is now my go-to!' },
  { name: 'Tunde B.', location: 'Victoria Island', stars: 5, text: 'Excellent service! The packaging was so luxurious. My wife absolutely loves her birthday perfume. Will definitely order again.' },
  { name: 'Chisom N.', location: 'Lekki', stars: 5, text: 'Finally a perfume store in Lagos I can trust. Got my Creed Aventus and it smells divine. Customer service was responsive and delivery was super fast.' },
  { name: 'Folake A.', location: 'Ikeja', stars: 5, text: 'The mini perfume set I bought was perfect for travel. Great value for money and the gold packaging looks so premium. Already recommended to all my friends!' },
  { name: 'Emmanuel K.', location: 'Abuja', stars: 5, text: 'Ordered from Abuja and it arrived in 3 days as promised. The fragrance is absolutely genuine. J-Fab has the best collection I have seen in Nigeria.' },
  { name: 'Ngozi P.', location: 'Port Harcourt', stars: 5, text: 'I was skeptical at first but the quality speaks for itself. Tom Ford Black Orchid smells exactly like what I got in Dubai. Impressed! Fast delivery too.' },
  { name: 'Seun M.', location: 'Surulere', stars: 5, text: 'The oil perfumes last all day — I applied it in the morning and still got compliments at 9pm. Incredible longevity. Will be coming back for more!' },
  { name: 'Blessing E.', location: 'Ajah', stars: 5, text: 'Bought a gift set for my dad and he was so happy. The presentation was beautiful and the perfumes smell amazing. Great quality at fair prices.' },
  { name: 'Chidi W.', location: 'Mainland Lagos', stars: 5, text: 'Store pickup was seamless — order was ready when I arrived. The team was friendly and even helped me pick a complementary fragrance. Love this store!' },
  { name: 'Yetunde S.', location: 'Ikoyi', stars: 5, text: 'I have spent so much money on fakes before. J-Fab changed everything — every bottle I have ordered is the real deal. The loyalty points system is a nice bonus too.' }
];

function initTestimonials() {
  const track = document.getElementById('testi-track');
  if (!track) return;
  // Double the array for seamless infinite scroll
  const all = [...TESTIMONIALS, ...TESTIMONIALS];
  track.innerHTML = all.map(t => {
    const initials = t.name.split(' ').map(n => n[0]).join('');
    const stars = '★'.repeat(t.stars) + '☆'.repeat(5 - t.stars);
    return `
      <div class="testi-card">
        <div class="testi-stars">${stars}</div>
        <p class="testi-text">"${t.text}"</p>
        <div class="testi-author">
          <div class="testi-avatar">${initials}</div>
          <div>
            <div class="testi-name">${t.name}</div>
            <div class="testi-location">${t.location}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', initTestimonials);

// ===========================
// REAL-TIME ADMIN SYNC
// Poll Railway API every 15 seconds so announcement & flash sale
// update for ALL users on ALL devices without needing a page refresh.
// ===========================
window.addEventListener('storage', function(e) {
  if (e.key === 'jfab_announcement') loadAnnouncement();
  if (e.key === 'jfab_flash_sale')   loadFlashSale();
});

setInterval(function() {
  loadAnnouncement();
  loadFlashSale();
}, 15000);

// ── Override getProducts to prefer backend data ──────────────────────────────
// This replaces the version defined in data.js when backend data is available
const _originalGetProducts = window.getProducts || function() { return []; };
function getProducts() {
  if (_backendProducts && _backendProducts.length > 0) return _backendProducts;
  // Fall back to localStorage override, then data.js defaults
  const stored = localStorage.getItem('jfab_products');
  if (stored) {
    try { return JSON.parse(stored); } catch(_) {}
  }
  return typeof DEFAULT_PRODUCTS !== 'undefined' ? DEFAULT_PRODUCTS : [];
}
