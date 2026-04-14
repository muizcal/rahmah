// J-FAB ADMIN PORTAL — admin.js (FULLY BACKEND-WIRED)

// ===========================
// CONFIG
// ===========================
const ADMIN_DEFAULTS = { email: 'admin@jfab.com', password: 'jfab2024' };

// Set window.JFAB_API in admin/index.html <script> to override for custom domain
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : (window.JFAB_API || 'https://j-fab-production.up.railway.app/api');

function getAdminToken() {
  return localStorage.getItem('jfab_admin_token') || sessionStorage.getItem('jfab_admin_token');
}
function setAdminToken(token) {
  localStorage.setItem('jfab_admin_token', token);
  sessionStorage.setItem('jfab_admin_token', token);
}
function clearAdminToken() {
  localStorage.removeItem('jfab_admin_token');
  sessionStorage.removeItem('jfab_admin_token');
  localStorage.removeItem('jfab_admin_authed');
  sessionStorage.removeItem('jfab_admin_authed');
}
function isAdminAuthed() {
  return !!(getAdminToken() || localStorage.getItem('jfab_admin_authed') || sessionStorage.getItem('jfab_admin_authed'));
}

async function adminAPI(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAdminToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API_BASE + endpoint, opts);
    return await res.json();
  } catch (e) {
    console.warn('[Admin API] Unreachable:', e.message);
    return { success: false, offline: true, message: 'Cannot reach server' };
  }
}

// ===========================
// AUTH
// ===========================
async function adminLogin() {
  const email = document.getElementById('adm-email').value.trim();
  const pass  = document.getElementById('adm-pass').value;
  const errEl = document.getElementById('login-err');

  // Try backend first
  try {
    const data = await adminAPI('/auth/admin-login', 'POST', { email, password: pass });
    if (data.success && data.token) {
      setAdminToken(data.token);
      localStorage.setItem('jfab_admin_authed', '1');
      showAdminApp();
      return;
    }
  } catch (e) { /* offline — fall through */ }

  // Local fallback (offline / before backend setup)
  const creds = JSON.parse(localStorage.getItem('jfab_admin_creds') || 'null') || ADMIN_DEFAULTS;
  if (email === creds.email && pass === creds.password) {
    localStorage.setItem('jfab_admin_authed', '1');
    showAdminApp();
  } else {
    if (errEl) errEl.style.display = 'block';
  }
}

function showAdminApp() {
  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-app').style.display  = 'flex';
  const errEl = document.getElementById('login-err');
  if (errEl) errEl.style.display = 'none';
  initAdmin();
}

function adminLogout() {
  clearAdminToken();
  location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
  if (isAdminAuthed()) showAdminApp();
  const passInput = document.getElementById('adm-pass');
  if (passInput) passInput.addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });
});

function initAdmin() {
  loadProducts();
  loadCategories();
  loadOrders();
  loadCustomers();
  loadAnnouncement();
  loadFlashSaleAdmin();
  loadNewsletterAdmin();
  loadAnalytics();
  loadSettings();
  loadPromos();
  populateProductFormCategorySelect();
  startNotificationPolling();
  seedDefaultPromosIfNeeded();

  // Restore last active section on reload
  const savedSection = sessionStorage.getItem('jfab_admin_section') || 'dashboard';
  showSection(savedSection);
}

async function seedDefaultPromosIfNeeded() {
  if (localStorage.getItem('jfab_promos_seeded')) return;
  const data = await adminAPI('/promos');
  if (data.success && data.promos.length === 0) {
    await adminAPI('/promos/seed', 'POST');
    console.log('✅ Default promo codes seeded to backend');
  }
  // Also seed products if backend is empty
  const prodData = await adminAPI('/products');
  if (prodData.success && prodData.products.length === 0) {
    const localProds = getProducts();
    if (localProds.length > 0) {
      await adminAPI('/products/seed', 'POST', { products: localProds });
      console.log('✅ Products seeded to backend from localStorage');
    }
  }
  localStorage.setItem('jfab_promos_seeded', '1');
}

// ===========================
// NAVIGATION
// ===========================
function showSection(name, btn) {
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.snav-item').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.style.display = 'block';
  // If no btn passed, find and highlight the nav button
  if (btn) {
    btn.classList.add('active');
  } else {
    const navBtn = document.querySelector(`.snav-item[onclick*="'${name}'"]`);
    if (navBtn) navBtn.classList.add('active');
  }
  const titles = {
    dashboard:'Dashboard', products:'Products', categories:'Categories',
    orders:'Orders', customers:'Customers', announcements:'Announcements',
    flashsales:'Flash Sales', newsletter:'Newsletter', analytics:'Analytics',
    settings:'Settings', promos:'Promo Codes'
  };
  document.getElementById('section-title').textContent = titles[name] || name;
  // Persist active section across reloads
  sessionStorage.setItem('jfab_admin_section', name);
  const refreshMap = {
    dashboard: loadDashboard, orders: loadOrders,
    customers: loadCustomers, analytics: loadAnalytics,
    newsletter: loadNewsletterAdmin, promos: loadPromos
  };
  if (refreshMap[name]) refreshMap[name]();
}

// ===========================
// NOTIFICATIONS
// ===========================
let _cachedOrders = [];

function startNotificationPolling() {
  renderNotifications();
  setInterval(renderNotifications, 30000);
}

function renderNotifications() {
  const orders   = _cachedOrders.length ? _cachedOrders : JSON.parse(localStorage.getItem('jfab_orders') || '[]');
  const products = getProducts();
  const seen     = JSON.parse(localStorage.getItem('jfab_seen_orders') || '[]');
  const notifs   = [];

  orders.filter(o => !seen.includes(o._id || o.id || o.ref))
    .forEach(o => notifs.push({ type:'order', msg:`New order from ${o.customerName || o.name || 'customer'} — ₦${(o.total || o.amount||0).toLocaleString()}` }));

  products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 3))
    .forEach(p => notifs.push({ type:'stock', msg:`Low stock: ${p.name} (${p.stock} left)` }));
  products.filter(p => p.stock === 0)
    .forEach(p => notifs.push({ type:'oos', msg:`Out of stock: ${p.name}` }));

  const badge = document.getElementById('notif-badge');
  const list  = document.getElementById('notif-list');
  if (badge) { badge.textContent = notifs.length; badge.style.display = notifs.length > 0 ? 'flex' : 'none'; }
  if (list) {
    list.innerHTML = notifs.length === 0
      ? '<div class="notif-empty">&#10003; All clear</div>'
      : notifs.map(n => `<div class="notif-item notif-${n.type}"><span class="notif-dot"></span><span>${n.msg}</span></div>`).join('');
  }
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (isOpen) {
    renderNotifications();
    const ids = _cachedOrders.map(o => o._id || o.id || o.ref);
    localStorage.setItem('jfab_seen_orders', JSON.stringify(ids));
    setTimeout(renderNotifications, 400);
  }
}

document.addEventListener('click', e => {
  const panel = document.getElementById('notif-panel');
  const bell  = document.getElementById('notif-bell');
  if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target)) panel.classList.remove('open');
});

// ===========================
// DASHBOARD
// ===========================
async function loadDashboard() {
  // Fetch real orders from backend
  const data = await adminAPI('/orders?limit=200');
  let orders = [];
  if (data.success && data.orders) {
    orders = data.orders;
    _cachedOrders = orders;
  } else {
    orders = JSON.parse(localStorage.getItem('jfab_orders') || '[]');
    _cachedOrders = orders;
  }

  const products = getProducts();
  const revenue  = orders.reduce((s, o) => s + (o.total || o.amount || 0), 0);

  // Unique customer count from orders
  const uniqueEmails = new Set(orders.map(o => o.customerEmail || o.email).filter(Boolean));

  setText('stat-revenue',   '&#8358;' + revenue.toLocaleString());
  setText('stat-orders',    orders.length);
  setText('stat-customers', uniqueEmails.size);
  setText('stat-products',  products.length);

  const tbody = document.getElementById('dash-orders-body');
  if (tbody) {
    tbody.innerHTML = orders.slice(0, 5).map(o => `
      <tr>
        <td><code style="font-size:0.75rem">${(o.ref || o._id || '').slice(-10)}</code></td>
        <td>${o.customerName || o.name || '-'}</td>
        <td>&#8358;${(o.total || o.amount || 0).toLocaleString()}</td>
        <td><span class="status-badge ${o.deliveryType}">${o.deliveryType || '-'}</span></td>
        <td>${o.createdAt || o.date ? new Date(o.createdAt || o.date).toLocaleDateString() : '-'}</td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">No orders yet</td></tr>';
  }

  const lowStockEl = document.getElementById('low-stock-list');
  if (lowStockEl) {
    const low = products.filter(p => p.stock <= (p.lowStockThreshold || 3) && p.stock > 0);
    const oos = products.filter(p => p.stock === 0);
    lowStockEl.innerHTML = [
      ...oos.map(p => `<div class="low-stock-row"><span>${p.name}</span><span class="badge badge-oos">Out of Stock</span></div>`),
      ...low.map(p => `<div class="low-stock-row"><span>${p.name}</span><span style="color:#e74c3c;font-weight:600">${p.stock} left</span></div>`)
    ].join('') || '<p style="color:#aaa;font-size:0.85rem;padding:12px 0">All products well stocked!</p>';
  }

  renderNotifications();
}

// ===========================
// PRODUCTS (localStorage — products are managed locally)
// ===========================
let allProducts    = [];
let productsFilter = 'all';

async function loadProducts() {
  const data = await adminAPI('/products');
  if (data.success && data.products.length > 0) {
    // Sync backend products into localStorage cache
    localStorage.setItem('jfab_products', JSON.stringify(data.products));
    allProducts = data.products;
  } else {
    // Fallback to localStorage / data.js defaults
    allProducts = getProducts();
  }
  renderProductsTable(allProducts);
}

function renderProductsTable(list) {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  tbody.innerHTML = list.map(p => `
    <tr>
      <td><img src="${p.images[0]}" style="width:48px;height:48px;object-fit:cover;border-radius:6px" onerror="this.src='https://placehold.co/48'"></td>
      <td><strong>${p.name}</strong><br><span style="font-size:0.75rem;color:#aaa">${p.brand}</span></td>
      <td>${categoryLabel(p.category)}</td>
      <td>&#8358;${p.price.toLocaleString()}${p.originalPrice && p.originalPrice > p.price ? `<br><span style="text-decoration:line-through;color:#aaa;font-size:0.75rem">&#8358;${p.originalPrice.toLocaleString()}</span><br><span style="color:#e74c3c;font-size:0.72rem;font-weight:600">-${Math.round((1 - p.price / p.originalPrice) * 100)}%</span>` : ''}</td>
      <td><span style="color:${p.stock === 0 ? '#e74c3c' : p.stock <= 3 ? '#f39c12' : '#27ae60'};font-weight:600">${p.stock}</span></td>
      <td>${p.featured ? '<span class="badge badge-gold">Featured</span> ' : ''}${p.deal ? '<span class="badge badge-red">Deal</span>' : ''}</td>
      <td>
        <button class="adm-action-btn edit"   onclick="editProduct(${p.id})">Edit</button>
        <button class="adm-action-btn delete" onclick="deleteProduct(${p.id})">Delete</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:20px">No products found</td></tr>';
}

function filterProductsAdmin(cat) {
  productsFilter = cat;
  renderProductsTable(cat === 'all' ? allProducts : allProducts.filter(p => p.category === cat));
}

function searchProducts(q) {
  renderProductsTable(allProducts.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) || p.brand.toLowerCase().includes(q.toLowerCase())
  ));
}

function openProductForm() {
  populateProductFormCategorySelect();
  ['pf-id','pf-name','pf-brand','pf-price','pf-original','pf-stock','pf-desc','pf-tags']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('pf-threshold').value   = '3';
  document.getElementById('pf-featured').checked  = false;
  document.getElementById('pf-deal').checked      = false;
  document.getElementById('pf-img-preview').innerHTML = '';
  document.getElementById('pf-images-data').value = '[]';
  switchImgTabSafe('upload', 'pf');
  document.getElementById('form-title').textContent = 'Add Product';
  document.getElementById('product-form-overlay').style.display = 'flex';
}

function editProduct(id) {
  const p = getProducts().find(pr => pr.id === id);
  if (!p) return;
  populateProductFormCategorySelect(p.category);
  document.getElementById('pf-id').value        = p.id;
  document.getElementById('pf-name').value      = p.name;
  document.getElementById('pf-brand').value     = p.brand;
  document.getElementById('pf-price').value     = p.price;
  document.getElementById('pf-original').value  = p.originalPrice || '';
  document.getElementById('pf-stock').value     = p.stock;
  document.getElementById('pf-threshold').value = p.lowStockThreshold || 3;
  document.getElementById('pf-desc').value      = p.description || '';
  document.getElementById('pf-tags').value      = (p.tags || []).join(', ');
  document.getElementById('pf-featured').checked = !!p.featured;
  document.getElementById('pf-deal').checked     = !!p.deal;
  document.getElementById('pf-images-data').value = JSON.stringify(p.images || []);
  renderProductImgPreview(p.images || []);
  switchImgTabSafe('upload', 'pf');
  document.getElementById('form-title').textContent = 'Edit Product';
  document.getElementById('product-form-overlay').style.display = 'flex';
}

// IMAGE UPLOAD HELPERS
function switchImgTabSafe(mode, prefix) {
  const uploadArea = document.getElementById(prefix + '-upload-area');
  const urlArea    = document.getElementById(prefix + '-url-area');
  if (uploadArea) uploadArea.style.display = mode === 'upload' ? 'flex' : 'none';
  if (urlArea)    urlArea.style.display    = mode === 'url'    ? 'block' : 'none';
}

function switchImgTab(mode, prefix) {
  switchImgTabSafe(mode, prefix);
  const overlay = prefix === 'pf' ? '#product-form-overlay' : '#category-form-overlay';
  document.querySelectorAll(overlay + ' .img-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleImgFiles(input, prefix) {
  const files = Array.from(input.files);
  if (!files.length) return;
  const results = [];
  for (const file of files.slice(0, 4)) {
    if (file.size > 2 * 1024 * 1024) { adminToast('Image ' + file.name + ' exceeds 2MB, skipped'); continue; }
    results.push(await fileToBase64(file));
  }
  const existing = JSON.parse(document.getElementById('pf-images-data').value || '[]');
  const merged   = [...existing, ...results].slice(0, 4);
  document.getElementById('pf-images-data').value = JSON.stringify(merged);
  renderProductImgPreview(merged);
}

async function handleImgDrop(e, prefix) {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (prefix === 'pf') {
    await handleImgFiles({ files }, prefix);
  } else if (files[0]) {
    const b64 = await fileToBase64(files[0]);
    document.getElementById('cf-image-data').value = b64;
    renderCatImgPreview(b64);
  }
}

async function handleCatImgFile(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { adminToast('Image exceeds 2MB'); return; }
  const b64 = await fileToBase64(file);
  document.getElementById('cf-image-data').value = b64;
  renderCatImgPreview(b64);
}

function renderProductImgPreview(images) {
  document.getElementById('pf-img-preview').innerHTML = images.map((src, i) =>
    `<div style="position:relative;display:inline-block;margin:4px">
       <img src="${src}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:2px solid ${i===0?'#C9A84C':'#eee'}">
       <span style="position:absolute;top:-6px;right:-6px;background:${i===0?'#C9A84C':'#aaa'};color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;display:flex;align-items:center;justify-content:center;cursor:pointer" onclick="removeProductImg(${i})">x</span>
       <div style="font-size:9px;text-align:center;color:#aaa;margin-top:2px">${i===0?'Primary':'Alt'}</div>
     </div>`
  ).join('');
}

function removeProductImg(index) {
  const imgs = JSON.parse(document.getElementById('pf-images-data').value || '[]');
  imgs.splice(index, 1);
  document.getElementById('pf-images-data').value = JSON.stringify(imgs);
  renderProductImgPreview(imgs);
}

function renderCatImgPreview(src) {
  document.getElementById('cf-img-preview').innerHTML = src
    ? `<img src="${src}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:2px solid #C9A84C;margin-top:6px">`
    : '';
}

function previewProductImages() {
  const urls = document.getElementById('pf-images')?.value.trim().split('\n').filter(Boolean) || [];
  document.getElementById('pf-images-data').value = JSON.stringify(urls);
  renderProductImgPreview(urls);
}

function previewCatImage() {
  const url = document.getElementById('cf-image')?.value.trim() || '';
  document.getElementById('cf-image-data').value = url;
  renderCatImgPreview(url);
}

function previewImages() { previewProductImages(); }

function populateProductFormCategorySelect(selected) {
  const sel = document.getElementById('pf-cat');
  if (!sel) return;
  sel.innerHTML = getCategories().map(c =>
    `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.name}</option>`
  ).join('');
}

async function saveProduct() {
  const name  = document.getElementById('pf-name').value.trim();
  const brand = document.getElementById('pf-brand').value.trim();
  const price = parseInt(document.getElementById('pf-price').value);
  if (!name || !brand || !price) { alert('Please fill required fields (Name, Brand, Price)'); return; }

  const editId        = document.getElementById('pf-id').value;
  const originalPrice = document.getElementById('pf-original').value ? parseInt(document.getElementById('pf-original').value) : null;
  const discount      = (originalPrice && originalPrice > price) ? Math.round((1 - price / originalPrice) * 100) : 0;
  let images = JSON.parse(document.getElementById('pf-images-data').value || '[]');
  if (!images.length) {
    const urlVal = document.getElementById('pf-images')?.value?.trim() || '';
    images = urlVal ? urlVal.split('\n').filter(Boolean) : [];
  }
  const tags = document.getElementById('pf-tags').value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

  const payload = {
    name, brand,
    category: document.getElementById('pf-cat').value,
    price, originalPrice, discount,
    stock: parseInt(document.getElementById('pf-stock').value) || 0,
    lowStockThreshold: parseInt(document.getElementById('pf-threshold').value) || 3,
    description: document.getElementById('pf-desc').value,
    tags,
    images: images.length ? images : ['https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80'],
    featured: document.getElementById('pf-featured').checked,
    deal: document.getElementById('pf-deal').checked
  };

  let data;
  if (editId) {
    data = await adminAPI('/products/' + editId, 'PUT', payload);
  } else {
    data = await adminAPI('/products', 'POST', payload);
  }

  if (data.success) {
    // Also keep localStorage in sync for offline fallback
    const products = getProducts();
    if (editId) {
      const idx = products.findIndex(p => p.id == editId);
      if (idx > -1) products[idx] = { ...products[idx], ...data.product };
    } else {
      products.push(data.product);
    }
    localStorage.setItem('jfab_products', JSON.stringify(products));
    allProducts = products;
    renderProductsTable(allProducts);
    closeProductForm();
    loadDashboard();
    adminToast('✅ Product saved!');
  } else {
    adminToast('❌ ' + (data.message || 'Could not save product'));
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  const data = await adminAPI('/products/' + id, 'DELETE');
  if (data.success) {
    const products = getProducts().filter(p => p.id !== id);
    localStorage.setItem('jfab_products', JSON.stringify(products));
    allProducts = products;
    renderProductsTable(allProducts);
    loadDashboard();
    adminToast('Product deleted.');
  } else {
    adminToast('❌ ' + (data.message || 'Could not delete'));
  }
}

function closeProductForm() { document.getElementById('product-form-overlay').style.display = 'none'; }

function categoryLabel(cat) {
  const found = getCategories().find(c => c.id === cat);
  return found ? found.name : cat;
}

// ===========================
// CATEGORIES (localStorage)
// ===========================
function loadCategories() { renderCategoriesAdmin(); }

function renderCategoriesAdmin() {
  const grid = document.getElementById('cat-admin-grid');
  if (!grid) return;
  grid.innerHTML = getCategories().map(c => `
    <div class="cat-admin-card">
      <img src="${c.image}" alt="${c.name}" onerror="this.src='https://placehold.co/220x130'">
      <div class="cat-admin-info">
        <strong>${c.name}</strong>
        <span style="font-size:0.75rem;color:#aaa;display:block;margin-bottom:4px">ID: ${c.id}</span>
        <div class="cat-btn-row">
          <button class="adm-action-btn edit"   onclick="editCategory('${c.id}')">Edit</button>
          <button class="adm-action-btn delete" onclick="deleteCategory('${c.id}')">Delete</button>
        </div>
      </div>
    </div>`).join('');
}

function openCategoryForm() {
  ['cf-name','cf-id'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('cf-edit-id').value         = '';
  document.getElementById('cf-img-preview').innerHTML = '';
  document.getElementById('cf-image-data').value      = '';
  const cfImg = document.getElementById('cf-image'); if (cfImg) cfImg.value = '';
  switchImgTabSafe('upload', 'cf');
  document.getElementById('cat-form-title').textContent = 'Add Category';
  document.getElementById('category-form-overlay').style.display = 'flex';
  document.getElementById('cf-name').addEventListener('input', function () {
    if (!document.getElementById('cf-edit-id').value)
      document.getElementById('cf-id').value = this.value.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'');
  });
}

function editCategory(id) {
  const c = getCategories().find(cat => cat.id === id);
  if (!c) return;
  document.getElementById('cf-name').value         = c.name;
  document.getElementById('cf-id').value           = c.id;
  document.getElementById('cf-edit-id').value      = c.id;
  document.getElementById('cf-image-data').value   = c.image || '';
  renderCatImgPreview(c.image || '');
  const cfImg = document.getElementById('cf-image'); if (cfImg) cfImg.value = c.image || '';
  switchImgTabSafe('upload', 'cf');
  document.getElementById('cat-form-title').textContent = 'Edit Category';
  document.getElementById('category-form-overlay').style.display = 'flex';
}

function saveCategory() {
  const name  = document.getElementById('cf-name').value.trim();
  const id    = document.getElementById('cf-id').value.trim().toLowerCase().replace(/\s/g,'');
  const image = document.getElementById('cf-image-data').value.trim()
    || document.getElementById('cf-image')?.value?.trim()
    || 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=300&q=80';
  if (!name || !id) { alert('Name and ID are required'); return; }

  const cats   = getCategories();
  const editId = document.getElementById('cf-edit-id').value;
  if (editId) {
    const idx = cats.findIndex(c => c.id === editId);
    if (idx > -1) cats[idx] = { id, name, image };
  } else {
    if (cats.find(c => c.id === id)) { alert('Category ID already exists'); return; }
    cats.push({ id, name, image });
    const sel = document.getElementById('pf-cat');
    if (sel) sel.innerHTML += `<option value="${id}">${name}</option>`;
  }
  localStorage.setItem('jfab_categories', JSON.stringify(cats));
  renderCategoriesAdmin();
  closeCategoryForm();
  adminToast('Category saved!');
}

function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  localStorage.setItem('jfab_categories', JSON.stringify(getCategories().filter(c => c.id !== id)));
  renderCategoriesAdmin();
  adminToast('Category deleted.');
}

function closeCategoryForm() { document.getElementById('category-form-overlay').style.display = 'none'; }

// ===========================
// ORDERS — FULLY BACKEND WIRED
// ===========================
let _allOrders = [];

async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#aaa;padding:20px">Loading orders...</td></tr>';

  const data = await adminAPI('/orders?limit=200');
  if (data.success && data.orders) {
    _allOrders = data.orders;
    _cachedOrders = data.orders;
  } else {
    // Fallback to localStorage
    _allOrders = JSON.parse(localStorage.getItem('jfab_orders') || '[]');
    _cachedOrders = _allOrders;
    if (!data.offline) adminToast('⚠️ Could not load orders from server');
  }
  renderOrdersTable(_allOrders);
  renderNotifications();
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;
  const statusOpts = ['pending','processing','dispatched','delivered','cancelled'];
  tbody.innerHTML = orders.map(o => {
    const id     = o._id || o.id || '';
    const ref    = o.ref || id.slice(-10);
    const name   = o.customerName || o.name || '-';
    const phone  = o.customerPhone || o.phone || '-';
    const amount = o.total || o.amount || 0;
    const status = o.status || 'pending';
    const date   = o.createdAt || o.date;
    return `<tr>
      <td><code style="font-size:0.72rem">${ref}</code></td>
      <td>${name}</td>
      <td>${phone}</td>
      <td>${(o.items || []).length} item(s)</td>
      <td>&#8358;${amount.toLocaleString()}</td>
      <td><span class="status-badge ${o.deliveryType || ''}">${o.deliveryType || '-'}</span></td>
      <td>${o.deliveryZone || 'N/A'}</td>
      <td><span class="status-badge ${status}">${status}</span></td>
      <td>${date ? new Date(date).toLocaleDateString() : '-'}</td>
      <td>
        <select onchange="updateOrderStatus('${id}', this.value)" style="font-size:0.75rem;padding:4px;border:1px solid #ddd;border-radius:4px">
          ${statusOpts.map(s => `<option value="${s}" ${status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="10" style="text-align:center;color:#aaa;padding:20px">No orders yet</td></tr>';
}

function filterOrders(val) {
  if (val === 'all') { renderOrdersTable(_allOrders); return; }
  renderOrdersTable(_allOrders.filter(o => o.deliveryType === val || o.status === val));
}

function searchOrders(q) {
  const lq = q.toLowerCase();
  renderOrdersTable(_allOrders.filter(o =>
    (o.ref||'').toLowerCase().includes(lq) ||
    (o.customerName||o.name||'').toLowerCase().includes(lq) ||
    (o.customerEmail||o.email||'').toLowerCase().includes(lq) ||
    (o.customerPhone||o.phone||'').includes(q)
  ));
}

async function updateOrderStatus(id, status) {
  if (!id || id === 'undefined') { adminToast('Invalid order ID'); return; }
  // Try backend first
  const data = await adminAPI('/orders/' + id + '/status', 'PUT', { status });
  if (data.success) {
    adminToast('✅ Status updated to ' + status);
    // Update local cache too
    const o = _allOrders.find(x => (x._id || x.id) === id);
    if (o) o.status = status;
    return;
  }
  // Fallback localStorage
  const orders = JSON.parse(localStorage.getItem('jfab_orders') || '[]');
  const o = orders.find(ord => ord.id === id);
  if (o) { o.status = status; localStorage.setItem('jfab_orders', JSON.stringify(orders)); }
  adminToast('Status updated (local): ' + status);
}

// ===========================
// CUSTOMERS — BACKEND WIRED
// ===========================
async function loadCustomers() {
  const tbody = document.getElementById('customers-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:20px">Loading...</td></tr>';

  // Build customer list from backend orders
  const data = await adminAPI('/orders?limit=500');
  if (data.success && data.orders?.length) {
    const map = {};
    data.orders.forEach(o => {
      const key = (o.customerEmail || o.email || '').toLowerCase();
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          name: o.customerName || o.name || '-',
          email: key,
          phone: o.customerPhone || o.phone || '-',
          orders: 0, spent: 0,
          lastOrder: o.createdAt || o.date
        };
      }
      map[key].orders++;
      map[key].spent += (o.total || o.amount || 0);
      if ((o.createdAt || o.date) > map[key].lastOrder) map[key].lastOrder = o.createdAt || o.date;
    });
    const customers = Object.values(map).sort((a,b) => b.orders - a.orders);
    setText('stat-customers', customers.length);
    tbody.innerHTML = customers.map(c => `<tr>
      <td>${c.name}</td>
      <td>${c.email}</td>
      <td>${c.phone}</td>
      <td>${c.orders} order${c.orders !== 1 ? 's' : ''}</td>
      <td>&#8358;${c.spent.toLocaleString()}</td>
      <td>${c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : '-'}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px">No customers yet</td></tr>';
    return;
  }

  // Fallback localStorage users
  const users  = JSON.parse(localStorage.getItem('jfab_users') || '[]');
  const orders = JSON.parse(localStorage.getItem('jfab_orders') || '[]');
  tbody.innerHTML = users.map(u => {
    const userOrders = orders.filter(o => o.email === u.email);
    const spent      = userOrders.reduce((s,o) => s+(o.amount||0), 0);
    return `<tr>
      <td>${u.name||'-'}</td><td>${u.email}</td><td>${u.phone||'-'}</td>
      <td><span style="background:#fff3cd;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600">${u.points||0} pts</span></td>
      <td>${userOrders.length}</td>
      <td>&#8358;${spent.toLocaleString()}</td>
      <td>${u.created ? new Date(u.created).toLocaleDateString() : '-'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:20px">No customers yet</td></tr>';
}

// ===========================
// ANALYTICS — BACKEND WIRED
// ===========================
async function loadAnalytics() {
  const data = await adminAPI('/orders?limit=500');
  let orders = data.success && data.orders ? data.orders : JSON.parse(localStorage.getItem('jfab_orders') || '[]');

  const now       = new Date();
  const thisMonth = orders.filter(o => {
    const d = new Date(o.createdAt || o.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthRev   = thisMonth.reduce((s,o) => s+(o.total||o.amount||0), 0);
  const allRev     = orders.reduce((s,o) => s+(o.total||o.amount||0), 0);
  const avg        = orders.length ? Math.round(allRev / orders.length) : 0;
  const deliveries = orders.filter(o=>o.deliveryType==='delivery').length;
  const pickups    = orders.filter(o=>o.deliveryType==='pickup').length;

  setText('an-monthly',  '&#8358;' + monthRev.toLocaleString());
  setText('an-morders',  thisMonth.length);
  setText('an-avg',      '&#8358;' + avg.toLocaleString());
  setText('an-delvpick', deliveries + 'D / ' + pickups + 'P');

  const productSales = {};
  orders.forEach(o => (o.items||[]).forEach(item => {
    productSales[item.name] = (productSales[item.name]||0) + (item.qty||1);
  }));
  const top   = Object.entries(productSales).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const topEl = document.getElementById('top-products-list');
  if (topEl) topEl.innerHTML = top.length ? top.map(([name,qty]) =>
    `<div class="analytics-row"><span>${name}</span><div class="analytics-bar-wrap"><div class="analytics-bar" style="width:${Math.round(qty/(top[0][1]||1)*100)}%"></div></div><span style="font-size:0.8rem;font-weight:600">${qty} sold</span></div>`
  ).join('') : '<p style="color:#aaa;font-size:0.85rem">No sales data yet.</p>';

  const catSales = {};
  orders.forEach(o => (o.items||[]).forEach(item => {
    const p = getProducts().find(pr=>pr.name===item.name);
    if (p) catSales[p.category]=(catSales[p.category]||0)+(item.qty||1);
  }));
  const catEl = document.getElementById('cat-breakdown');
  if (catEl) catEl.innerHTML = Object.entries(catSales).map(([cat,qty]) =>
    `<div class="analytics-row"><span>${categoryLabel(cat)}</span><span style="font-size:0.8rem;font-weight:600">${qty} items</span></div>`
  ).join('') || '<p style="color:#aaa;font-size:0.85rem">No sales data yet.</p>';
}

// ===========================
// ANNOUNCEMENTS (Backend API — reflects to ALL users instantly)
// ===========================
async function loadAnnouncement() {
  try {
    const data = await adminAPI('/config/announcement');
    const ann  = data.announcement;
    if (ann && ann.text) {
      const el = document.getElementById('ann-text');
      if (el) el.value = ann.text.replace(/<[^>]*>/g, '');
      showAnnPreview(ann.text);
    }
  } catch (_) {
    // offline fallback
    const ann = JSON.parse(localStorage.getItem('jfab_announcement') || 'null');
    if (ann?.text) {
      const el = document.getElementById('ann-text');
      if (el) el.value = ann.text.replace(/<[^>]*>/g, '');
      showAnnPreview(ann.text);
    }
  }
}

async function saveAnnouncement() {
  const text = document.getElementById('ann-text').value.trim();
  if (!text) { alert('Please enter announcement text'); return; }
  const data = await adminAPI('/config/announcement', 'PUT', { text });
  if (data.success) {
    localStorage.setItem('jfab_announcement', JSON.stringify(data.announcement));
    showAnnPreview(text);
    adminToast('✅ Announcement published to all users!');
  } else {
    adminToast('❌ Error: ' + (data.message || 'Could not save'));
  }
}

async function clearAnnouncement() {
  const data = await adminAPI('/config/announcement', 'PUT', { text: '' });
  if (data.success) {
    localStorage.removeItem('jfab_announcement');
    document.getElementById('ann-text').value = '';
    const p = document.getElementById('ann-preview'); if (p) p.style.display = 'none';
    adminToast('Announcement cleared.');
  } else {
    adminToast('❌ Error: ' + (data.message || 'Could not clear'));
  }
}

function showAnnPreview(text) {
  const p = document.getElementById('ann-preview');
  if (p) { p.style.display = 'block'; p.innerHTML = `<strong>Preview:</strong><br><div class="ann-preview-bar">${text}</div>`; }
}

// ===========================
// PROMO CODES (Backend API)
// ===========================
let _cachedPromos = []; // cache so openPromoForm can look up by index

async function loadPromos() {
  const data = await adminAPI('/promos');
  _cachedPromos = data.success ? data.promos : [];
  renderPromosTable(_cachedPromos);
}

function renderPromosTable(promos) {
  const tbody = document.getElementById('promos-tbody');
  if (!tbody) return;
  tbody.innerHTML = promos.map((p, i) => `
    <tr>
      <td><strong style="font-family:monospace;font-size:0.88rem;background:#f5f5f5;padding:3px 8px;border-radius:4px">${p.code}</strong></td>
      <td><span class="status-badge ${p.type === 'percent' ? 'paid' : p.type === 'shipping' ? 'pickup' : 'delivery'}">${p.type}</span></td>
      <td>${p.type === 'percent' ? p.value + '%' : p.type === 'shipping' ? 'Free' : '&#8358;' + Number(p.value).toLocaleString()}</td>
      <td style="font-size:0.82rem;color:#555">${p.description}</td>
      <td><span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:600;background:${p.active?'#d4edda':'#f8d7da'};color:${p.active?'#155724':'#721c24'}">${p.active ? 'Active' : 'Inactive'}</span></td>
      <td style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="adm-action-btn edit" onclick="openPromoForm(${i})">Edit</button>
        <button class="adm-action-btn" style="background:#fff3cd;color:#856404;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:0.75rem;font-weight:600" onclick="togglePromo('${p._id}',${i})">${p.active ? 'Disable' : 'Enable'}</button>
        <button class="adm-action-btn delete" onclick="deletePromo('${p._id}')">Delete</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px">No promo codes yet.</td></tr>';
}

function openPromoForm(editIndex) {
  document.getElementById('promo-edit-id').value = editIndex !== undefined ? (_cachedPromos[editIndex]?._id || '') : '';
  document.getElementById('promo-form-title').textContent = editIndex !== undefined ? 'Edit Promo Code' : 'New Promo Code';
  if (editIndex !== undefined && _cachedPromos[editIndex]) {
    const p = _cachedPromos[editIndex];
    document.getElementById('prom-code').value  = p.code;
    document.getElementById('prom-type').value  = p.type;
    document.getElementById('prom-value').value = p.value;
    document.getElementById('prom-desc').value  = p.description;
  } else {
    ['prom-code','prom-value','prom-desc'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('prom-type').value = 'percent';
  }
  document.getElementById('promo-form-overlay').style.display = 'flex';
}

async function savePromo() {
  const code  = document.getElementById('prom-code').value.trim().toUpperCase();
  const type  = document.getElementById('prom-type').value;
  const value = parseFloat(document.getElementById('prom-value').value);
  const desc  = document.getElementById('prom-desc').value.trim();
  if (!code || !value) { alert('Code and value are required'); return; }

  const editId = document.getElementById('promo-edit-id').value;
  let data;
  if (editId) {
    data = await adminAPI('/promos/' + editId, 'PUT', { code, type, value, description: desc });
  } else {
    data = await adminAPI('/promos', 'POST', { code, type, value, description: desc, active: true });
  }
  if (data.success) {
    adminToast(editId ? 'Promo updated!' : 'Promo code created!');
    closePromoForm();
    loadPromos();
  } else {
    adminToast('❌ ' + (data.message || 'Could not save promo'));
  }
}

async function togglePromo(id, i) {
  const promo = _cachedPromos[i];
  if (!promo) return;
  const data = await adminAPI('/promos/' + id, 'PUT', { active: !promo.active });
  if (data.success) { adminToast(data.promo.active ? 'Promo enabled' : 'Promo disabled'); loadPromos(); }
  else adminToast('❌ ' + (data.message || 'Could not toggle'));
}

async function deletePromo(id) {
  if (!confirm('Delete this promo code?')) return;
  const data = await adminAPI('/promos/' + id, 'DELETE');
  if (data.success) { adminToast('Promo deleted.'); loadPromos(); }
  else adminToast('❌ ' + (data.message || 'Could not delete'));
}

function closePromoForm() { document.getElementById('promo-form-overlay').style.display = 'none'; }

// ===========================
// FLASH SALES (Backend API — reflects to ALL users instantly)
// ===========================
async function loadFlashSaleAdmin() {
  // Load products from backend for the checkbox list
  const prodData = await adminAPI('/products');
  const products = prodData.success ? prodData.products : getProducts();

  // Load current flash sale from backend
  const fsData = await adminAPI('/config/flash-sale');
  const sale   = fsData.success ? fsData.flashSale : null;

  const list = document.getElementById('fs-product-list');
  if (list) {
    list.innerHTML = products.map(p => `
      <label class="product-check-item">
        <input type="checkbox" value="${p.id}" ${sale?.productIds?.map(Number).includes(Number(p.id)) ? 'checked' : ''}>
        <img src="${p.images[0]}" style="width:32px;height:32px;object-fit:cover;border-radius:4px">
        <span>${p.name} — &#8358;${p.price.toLocaleString()}</span>
      </label>`).join('');
  }
  if (sale) {
    const setV = (id, v) => { const el=document.getElementById(id); if(el) el.value=v; };
    setV('fs-title', sale.title || '');
    setV('fs-desc',  sale.description || '');
    setV('fs-badge', sale.badge || '');
    if (sale.endTime) {
      const local = new Date(sale.endTime);
      local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
      setV('fs-end', local.toISOString().slice(0, 16));
    }
    showCurrentFlashSale(sale);
  }
}

async function saveFlashSale() {
  const title  = document.getElementById('fs-title').value.trim();
  const endVal = document.getElementById('fs-end').value;
  if (!title || !endVal) { alert('Title and end date/time are required'); return; }
  const productIds = [...document.querySelectorAll('#fs-product-list input[type=checkbox]:checked')].map(cb => parseInt(cb.value));
  const sale = {
    title, description: document.getElementById('fs-desc').value.trim(),
    badge: document.getElementById('fs-badge').value.trim() || 'FLASH SALE',
    endTime: new Date(endVal).toISOString(),
    productIds: productIds.length ? productIds : null,
    active: true, created: new Date().toISOString()
  };
  const data = await adminAPI('/config/flash-sale', 'PUT', sale);
  if (data.success) {
    localStorage.setItem('jfab_flash_sale', JSON.stringify(data.flashSale));
    showCurrentFlashSale(data.flashSale);
    adminToast('✅ Flash sale activated for all users!');
  } else {
    adminToast('❌ Error: ' + (data.message || 'Could not save'));
  }
}

async function endFlashSale() {
  if (!confirm('End the current flash sale?')) return;
  const data = await adminAPI('/config/flash-sale', 'PUT', { active: false });
  if (data.success) {
    localStorage.setItem('jfab_flash_sale', JSON.stringify(data.flashSale));
    const card = document.getElementById('fs-current'); if (card) card.style.display = 'none';
    adminToast('Flash sale ended.');
  } else {
    adminToast('❌ ' + (data.message || 'Could not end sale'));
  }
}

function showCurrentFlashSale(sale) {
  const card = document.getElementById('fs-current');
  if (!card) return;
  card.style.display = 'block';
  const end = new Date(sale.endTime); const isExpired = end < new Date();
  card.innerHTML = `
    <h4 style="margin-bottom:8px">Current Flash Sale</h4>
    <div class="fs-status-row">
      <span class="fs-status-dot" style="background:${sale.active && !isExpired ? '#27ae60' : '#e74c3c'}"></span>
      <strong>${sale.title}</strong>
      <span style="font-size:0.78rem;color:#aaa;margin-left:8px">${sale.active && !isExpired ? 'Active' : 'Ended/Expired'}</span>
    </div>
    <p style="font-size:0.82rem;color:#777;margin-top:6px">Ends: ${end.toLocaleString()}</p>
    ${sale.productIds ? `<p style="font-size:0.82rem;color:#777">${sale.productIds.length} products selected</p>` : '<p style="font-size:0.82rem;color:#777">All deal products shown</p>'}`;
}

// ===========================
// NEWSLETTER (localStorage)
// ===========================
async function loadNewsletterAdmin() {
  const tbody   = document.getElementById('newsletter-tbody');
  const countEl = document.getElementById('sub-count');
  loadStockAlerts();
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">Loading…</td></tr>';

  const data = await adminAPI('/notifications?type=newsletter');
  const subs = data.success ? data.notifications : [];

  if (countEl) countEl.textContent = subs.length;

  tbody.innerHTML = subs.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">No subscribers yet</td></tr>'
    : subs.map((s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${s.email}</td>
          <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : '-'}</td>
          <td><button class="adm-action-btn delete" onclick="deleteSubscriber('${s._id}')">Remove</button></td>
        </tr>`).join('');
}

async function deleteSubscriber(id) {
  if (!confirm('Remove this subscriber?')) return;
  const data = await adminAPI('/notifications/' + id, 'DELETE');
  if (data.success) { adminToast('Subscriber removed'); loadNewsletterAdmin(); }
  else adminToast('Could not remove subscriber');
}

async function loadStockAlerts() {
  const tbody = document.getElementById('stockalert-tbody');
  if (!tbody) return;
  const data  = await adminAPI('/notifications?type=stock_alert');
  const items = data.success ? data.notifications : [];
  tbody.innerHTML = items.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">No stock alerts yet</td></tr>'
    : items.map((s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${s.email}</td>
          <td>${s.productName || '#' + s.productId}</td>
          <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : '-'}</td>
          <td><button class="adm-action-btn delete" onclick="deleteStockAlert('${s._id}')">Remove</button></td>
        </tr>`).join('');
}

async function deleteStockAlert(id) {
  if (!confirm('Remove this alert?')) return;
  const data = await adminAPI('/notifications/' + id, 'DELETE');
  if (data.success) { adminToast('Alert removed'); loadStockAlerts(); }
  else adminToast('Could not remove alert');
}

async function exportSubscribers() {
  const data = await adminAPI('/notifications?type=newsletter');
  const subs = data.success ? data.notifications : [];
  if (!subs.length) { adminToast('No subscribers to export'); return; }
  const csv = 'Email,Date\n' + subs.map(s => `${s.email},${s.createdAt || ''}`).join('\n');
  const a   = document.createElement('a');
  a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'jfab-newsletter-subscribers.csv';
  a.click();
}

// ===========================
// SETTINGS
// ===========================
function loadSettings() {
  const rates = JSON.parse(localStorage.getItem('jfab_delivery_rates') || 'null');
  if (rates) {
    const setV = (id,v) => { const el=document.getElementById(id); if(el) el.value=v; };
    setV('set-island',   rates.island   || 2500);
    setV('set-mainland', rates.mainland || 3500);
    setV('set-outside',  rates.outside  || 5000);
  }
  const creds = JSON.parse(localStorage.getItem('jfab_admin_creds') || 'null') || ADMIN_DEFAULTS;
  const emailEl = document.getElementById('set-adm-email'); if (emailEl) emailEl.value = creds.email;
}

function saveSettings() {
  const rates = {
    island:   parseInt(document.getElementById('set-island').value)   || 2500,
    mainland: parseInt(document.getElementById('set-mainland').value) || 3500,
    outside:  parseInt(document.getElementById('set-outside').value)  || 5000,
    pickup: 0
  };
  localStorage.setItem('jfab_delivery_rates', JSON.stringify(rates));
  adminToast('Delivery settings saved!');
}

async function saveAdminCreds() {
  const email   = document.getElementById('set-adm-email').value.trim();
  const newPass = document.getElementById('set-adm-pass').value;
  const current = JSON.parse(localStorage.getItem('jfab_admin_creds') || 'null') || ADMIN_DEFAULTS;
  if (!email) { alert('Email required'); return; }

  // Try to update password on backend
  if (newPass) {
    const currentPass = prompt('Enter your CURRENT password to confirm change:');
    if (currentPass) {
      const data = await adminAPI('/auth/change-password', 'PUT', { currentPassword: currentPass, newPassword: newPass });
      if (data.success) {
        adminToast('✅ Password updated on server!');
      } else {
        adminToast('⚠️ Backend error: ' + (data.message || 'Could not update password'));
      }
    }
  }

  // Always save locally too (for offline fallback)
  localStorage.setItem('jfab_admin_creds', JSON.stringify({ email, password: newPass || current.password }));
  adminToast('Credentials saved!');
}

// ===========================
// HELPERS
// ===========================
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val;
}

function adminToast(msg) {
  let toast = document.querySelector('.adm-toast');
  if (!toast) { toast = document.createElement('div'); toast.className = 'adm-toast'; document.body.appendChild(toast); }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}
