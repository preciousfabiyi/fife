/* ============================================
   FIFE BEAUTY HUB — Admin JS
   Clean rewrite — login guaranteed to work
============================================ */

/* ===== CREDENTIALS ===== */
const ADMIN_USER = 'Fife';
const ADMIN_PASS = 'Fife1234';

/* ===== STATE ===== */
let products         = [];
let pendingDeleteIdx = null;
let imageBase64      = null;
let activeOrderFilter = 'all';

/* ===== SAFE ELEMENT GETTER ===== */
function el(id) { return document.getElementById(id); }

/* ===== LOGIN ===== */
// Auto-login if session exists
if (sessionStorage.getItem('fifeAdminLoggedIn') === 'true') {
  showDashboard();
}

el('loginBtn').addEventListener('click', attemptLogin);
el('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });

function attemptLogin() {
  const user = el('loginUser').value.trim();
  const pass = el('loginPass').value.trim();

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    sessionStorage.setItem('fifeAdminLoggedIn', 'true');
    el('loginError').classList.add('hidden');
    showDashboard();
  } else {
    el('loginError').classList.remove('hidden');
    el('loginPass').value = '';
    el('loginPass').focus();
  }
}

function showDashboard() {
  el('loginScreen').classList.add('hidden');
  el('adminDashboard').classList.remove('hidden');
  el('adminBottomNav').classList.remove('hidden');
  loadProducts();
  updateOrdersBadge();
}

function doLogout() {
  sessionStorage.removeItem('fifeAdminLoggedIn');
  el('adminDashboard').classList.add('hidden');
  el('adminBottomNav').classList.add('hidden');
  el('loginScreen').classList.remove('hidden');
  el('loginUser').value = '';
  el('loginPass').value = '';
}
el('logoutBtn').addEventListener('click', doLogout);
el('logoutBtnTop').addEventListener('click', doLogout);

// Toggle password visibility
el('togglePass').addEventListener('click', () => {
  const inp = el('loginPass');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  el('togglePass').querySelector('i').className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
});

/* ===== TAB SWITCHING ===== */
function switchTab(tab) {
  document.querySelectorAll('[data-tab]').forEach(a => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  ['tabAddProduct','tabManageProducts','tabOrders'].forEach(id => {
    el(id).classList.add('hidden');
  });

  if (tab === 'addProduct') {
    el('tabAddProduct').classList.remove('hidden');
    el('tabTitle').textContent = 'Add Product';
  } else if (tab === 'manageProducts') {
    el('tabManageProducts').classList.remove('hidden');
    el('tabTitle').textContent = 'Manage Products';
    renderProducts();
  } else if (tab === 'orders') {
    el('tabOrders').classList.remove('hidden');
    el('tabTitle').textContent = 'Orders';
    renderOrders();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-tab]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    switchTab(link.dataset.tab);
  });
});

/* ===== PRODUCTS (localStorage) ===== */
function loadProducts() {
  products = JSON.parse(localStorage.getItem('fifeProducts') || '[]');
  updateCount();
}

function saveProducts() {
  try {
    localStorage.setItem('fifeProducts', JSON.stringify(products));
  } catch(e) {
    showToast('Storage full — try a smaller image.');
  }
}

function updateCount() {
  const n = products.length;
  const txt = `${n} product${n !== 1 ? 's' : ''}`;
  if (el('productCount')) el('productCount').textContent = txt;
  if (el('manageCount'))  el('manageCount').textContent  = txt;
}

function renderProducts(filter) {
  const q = filter !== undefined ? filter : (el('searchProducts') ? el('searchProducts').value : '');
  const list = q
    ? products.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.category||'').toLowerCase().includes(q.toLowerCase()))
    : products;

  if (el('manageCount')) el('manageCount').textContent = `${list.length} product${list.length !== 1 ? 's' : ''}`;

  const grid = el('adminProducts');
  if (list.length === 0) {
    grid.innerHTML = `<p class="empty-msg">${q ? 'No products match.' : 'No products yet.'}</p>`;
    return;
  }

  grid.innerHTML = list.map((p, i) => {
    const realIdx = products.indexOf(p);
    return `
      <div class="admin-product">
        <div class="admin-product-img-wrap">
          <img src="${p.image}" alt="${p.name}" loading="lazy"
               onerror="this.src='https://placehold.co/300x200?text=No+Image'">
          <span class="product-category-badge">${p.category || 'General'}</span>
        </div>
        <div class="admin-product-info">
          <h3>${p.name}</h3>
          <p class="price">₦${Number(p.price).toLocaleString()}</p>
        </div>
        <div class="admin-product-actions">
          <button class="btn-delete-product" data-idx="${realIdx}">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.btn-delete-product').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteIdx = parseInt(btn.dataset.idx);
      el('delProductName').textContent = `"${products[pendingDeleteIdx].name}" will be permanently removed.`;
      el('deleteModal').classList.remove('hidden');
    });
  });
}

if (el('searchProducts')) {
  el('searchProducts').addEventListener('input', () => renderProducts(el('searchProducts').value));
}

/* ===== DELETE MODAL ===== */
el('delCancel').addEventListener('click', () => {
  el('deleteModal').classList.add('hidden');
  pendingDeleteIdx = null;
});
el('delBackdrop').addEventListener('click', () => {
  el('deleteModal').classList.add('hidden');
  pendingDeleteIdx = null;
});
el('delConfirm').addEventListener('click', () => {
  if (pendingDeleteIdx === null) return;
  const name = products[pendingDeleteIdx].name;
  products.splice(pendingDeleteIdx, 1);
  saveProducts();
  updateCount();
  renderProducts();
  el('deleteModal').classList.add('hidden');
  pendingDeleteIdx = null;
  showToast(`"${name}" deleted.`);
});

/* ===== IMAGE UPLOAD & COMPRESSION ===== */
el('uploadZone').addEventListener('click', () => el('productImage').click());

el('uploadZone').addEventListener('dragover', e => {
  e.preventDefault();
  el('uploadZone').classList.add('drag-over');
});
el('uploadZone').addEventListener('dragleave', () => el('uploadZone').classList.remove('drag-over'));
el('uploadZone').addEventListener('drop', e => {
  e.preventDefault();
  el('uploadZone').classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
});
el('productImage').addEventListener('change', () => {
  if (el('productImage').files[0]) handleImageFile(el('productImage').files[0]);
});

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) { showToast('Please select an image file.'); return; }
  if (file.size > 15 * 1024 * 1024)   { showToast('Image must be under 15MB.');    return; }

  el('uploadPlaceholder').innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><p>Compressing…</p>`;
  el('uploadPlaceholder').classList.remove('hidden');
  el('imagePreview').classList.add('hidden');

  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      let { width, height } = img;
      if (width > height && width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
      else if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }

      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      imageBase64 = canvas.toDataURL('image/jpeg', 0.75);

      el('previewImg').src = imageBase64;
      el('uploadPlaceholder').classList.add('hidden');
      el('imagePreview').classList.remove('hidden');

      // Restore placeholder text for next time
      el('uploadPlaceholder').innerHTML = `
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <p>Tap or drag to upload image</p>
        <span>PNG, JPG, WEBP — max 15MB</span>`;
      showToast('Image ready ✓');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

el('removeImg').addEventListener('click', e => {
  e.stopPropagation();
  imageBase64 = null;
  el('productImage').value = '';
  el('previewImg').src = '';
  el('imagePreview').classList.add('hidden');
  el('uploadPlaceholder').classList.remove('hidden');
});

/* ===== ADD PRODUCT ===== */
el('productForm').addEventListener('submit', e => {
  e.preventDefault();
  const name     = el('productName').value.trim();
  const price    = el('productPrice').value.trim();
  const category = el('productCategory').value;
  const desc     = el('productDesc').value.trim();

  if (!name || !price) { showToast('Please fill in name and price.'); return; }
  if (!imageBase64)    { showToast('Please upload a product image.');  return; }

  const btn = el('uploadBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

  products.unshift({ name, price: Number(price), image: imageBase64, category: category || 'General', desc });
  saveProducts();
  updateCount();

  el('productForm').reset();
  imageBase64 = null;
  el('previewImg').src = '';
  el('imagePreview').classList.add('hidden');
  el('uploadPlaceholder').classList.remove('hidden');

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Product';
  showToast(`"${name}" added successfully!`);
});

/* ===== ORDERS ===== */
function renderOrders() {
  const ordersList = el('ordersList');
  ordersList.innerHTML = '<div class="orders-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading…</p></div>';

  const orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
  updateOrdersBadge(orders.length);

  const pill = el('ordersCountPill');
  if (pill) pill.textContent = orders.length > 0 ? orders.length : '';

  const filtered = activeOrderFilter === 'all'
    ? orders
    : orders.filter(o => (o.status || 'Pending') === activeOrderFilter);

  if (filtered.length === 0) {
    ordersList.innerHTML = '<p class="empty-msg">No orders in this category.</p>';
    return;
  }

  ordersList.innerHTML = filtered.map((o, idx) => `
    <div class="order-card" id="ocard-${idx}">
      <div class="order-header">
        <div class="order-ref-wrap">
          <span class="order-ref">${o.ref}</span>
          <span class="order-status status-${(o.status||'pending').toLowerCase()}">${o.status || 'Pending'}</span>
        </div>
        <span class="order-date">${o.date || ''}</span>
      </div>
      <div class="order-body">
        <div class="order-details">
          <div class="order-info-row"><i class="fa-solid fa-user"></i><span>${o.name}</span></div>
          <div class="order-info-row"><i class="fa-solid fa-phone"></i><a href="tel:${o.phone}">${o.phone}</a></div>
          <div class="order-info-row"><i class="fa-solid fa-location-dot"></i><span>${o.address}</span></div>
          <div class="order-info-row"><i class="fa-solid fa-credit-card"></i><span>${o.payment}</span></div>
          <div class="order-items">
            ${(o.items||[]).map(i => `
              <div class="order-item-row">
                <span>${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}</span>
                <span>₦${(i.price * i.qty).toLocaleString()}</span>
              </div>`).join('')}
            <div class="order-item-row total-row">
              <span>Total</span>
              <strong>₦${Number(o.total).toLocaleString()}</strong>
            </div>
          </div>
        </div>
        ${o.proof && o.proof.startsWith('data:image') ? `
        <div class="order-proof-wrap">
          <p class="order-proof-label">Payment Screenshot</p>
          <img src="${o.proof}" class="order-proof-img" alt="Proof"
               data-src="${o.proof}" data-label="${o.name} · ${o.ref}">
        </div>` : ''}
      </div>
      <div class="order-actions">
        <button class="order-btn btn-confirm ${o.status==='Confirmed'?'is-done':''}"
          data-idx="${orders.indexOf(o)}" data-status="Confirmed"
          ${o.status==='Confirmed'?'disabled':''}>
          <i class="fa-solid fa-check"></i> ${o.status==='Confirmed'?'Confirmed':'Confirm'}
        </button>
        <button class="order-btn btn-reject ${o.status==='Rejected'?'is-done':''}"
          data-idx="${orders.indexOf(o)}" data-status="Rejected"
          ${o.status==='Rejected'?'disabled':''}>
          <i class="fa-solid fa-xmark"></i> ${o.status==='Rejected'?'Rejected':'Reject'}
        </button>
      </div>
    </div>
  `).join('');

  // Fast status buttons — update instantly, no reload
  ordersList.querySelectorAll('.order-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const idx    = parseInt(btn.dataset.idx);
      const status = btn.dataset.status;
      const orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
      if (!orders[idx]) return;

      orders[idx].status = status;
      localStorage.setItem('fifeOrders', JSON.stringify(orders));

      // Update UI instantly
      const card = btn.closest('.order-card');
      const badge = card.querySelector('.order-status');
      if (badge) { badge.textContent = status; badge.className = `order-status status-${status.toLowerCase()}`; }
      card.querySelectorAll('.order-btn').forEach(b => { b.disabled = true; b.classList.add('is-done'); });
      btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${status}`;
      showToast(`Order marked as ${status} ✓`);
    });
  });

  // Proof image viewer
  ordersList.querySelectorAll('.order-proof-img').forEach(img => {
    img.addEventListener('click', () => {
      el('proofViewerImg').src = img.dataset.src;
      el('proofViewerLabel').textContent = img.dataset.label;
      el('proofViewerModal').classList.remove('hidden');
    });
  });
}

// Order filter tabs
document.querySelectorAll('.order-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeOrderFilter = btn.dataset.status;
    renderOrders();
  });
});

// Proof viewer close
el('proofBackdrop').addEventListener('click', () => el('proofViewerModal').classList.add('hidden'));
el('proofClose').addEventListener('click',    () => el('proofViewerModal').classList.add('hidden'));

/* ===== BADGE ===== */
function updateOrdersBadge(count) {
  const n = count !== undefined ? count : JSON.parse(localStorage.getItem('fifeOrders') || '[]').length;
  ['ordersBadge','navOrdersBadge'].forEach(id => {
    const badge = el(id);
    if (badge) badge.textContent = n > 0 ? n : '';
  });
}

/* ===== TOAST ===== */
function showToast(msg) {
  const t = el('adminToast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
