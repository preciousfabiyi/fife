// FIFE BEAUTY HUB - Admin JS (clean version)

var ADMIN_USER = 'Fife';
var ADMIN_PASS = 'Fife1234';

// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyAk9_7mqgi22VUznizgg569SNzuoiplfKE",
  authDomain: "fife-beauty-hub-b41de.firebaseapp.com",
  projectId: "fife-beauty-hub-b41de",
  storageBucket: "fife-beauty-hub-b41de.firebasestorage.app",
  messagingSenderId: "688954759472",
  appId: "1:688954759472:web:02d0c84dbab6b4a4f810f5"
};
var db = null;
var useFirebase = false;
try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    useFirebase = true;
  }
} catch(e) { console.warn('Firebase:', e); }

var products = [];
var pendingDeleteIdx = null;
var imageBase64 = null;
var activeOrderFilter = 'all';

function g(id) { return document.getElementById(id); }

function showToast(msg) {
  var t = g('adminToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}

// ── Everything runs AFTER page is fully loaded ──
document.addEventListener('DOMContentLoaded', function() {

  // Auto-login if session active
  if (sessionStorage.getItem('fifeAdminLoggedIn') === 'true') {
    showDashboard();
    return;
  }

  // Sign in button
  var loginBtn = g('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', attemptLogin);

  // Press Enter to login
  var loginPass = g('loginPass');
  if (loginPass) loginPass.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') attemptLogin();
  });

  // Show/hide password
  var togglePass = g('togglePass');
  if (togglePass) togglePass.addEventListener('click', function() {
    var inp = g('loginPass');
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    var icon = togglePass.querySelector('i');
    if (icon) icon.className = inp.type === 'text' ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
  });

});

function attemptLogin() {
  var userEl = g('loginUser');
  var passEl = g('loginPass');
  var errEl  = g('loginError');
  if (!userEl || !passEl) return;

  var user = userEl.value.trim();
  var pass = passEl.value.trim();

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    sessionStorage.setItem('fifeAdminLoggedIn', 'true');
    if (errEl) errEl.classList.add('hidden');
    showDashboard();
  } else {
    if (errEl) errEl.classList.remove('hidden');
    passEl.value = '';
    passEl.focus();
  }
}

function showDashboard() {
  var loginScreen    = g('loginScreen');
  var adminDashboard = g('adminDashboard');
  var adminBottomNav = g('adminBottomNav');
  if (loginScreen)    loginScreen.classList.add('hidden');
  if (adminDashboard) adminDashboard.classList.remove('hidden');
  if (adminBottomNav) adminBottomNav.classList.remove('hidden');

  // Wire up dashboard buttons (only runs once logged in)
  wireDashboard();
  loadProducts();
  updateOrdersBadge();
}

function doLogout() {
  sessionStorage.removeItem('fifeAdminLoggedIn');
  var loginScreen    = g('loginScreen');
  var adminDashboard = g('adminDashboard');
  var adminBottomNav = g('adminBottomNav');
  if (loginScreen)    loginScreen.classList.remove('hidden');
  if (adminDashboard) adminDashboard.classList.add('hidden');
  if (adminBottomNav) adminBottomNav.classList.add('hidden');
  if (g('loginUser')) g('loginUser').value = '';
  if (g('loginPass')) g('loginPass').value = '';
}

var dashboardWired = false;
function wireDashboard() {
  if (dashboardWired) return;
  dashboardWired = true;

  // Logout
  if (g('logoutBtn'))    g('logoutBtn').addEventListener('click', doLogout);
  if (g('logoutBtnTop')) g('logoutBtnTop').addEventListener('click', doLogout);

  // Tabs — sidebar + bottom nav
  document.querySelectorAll('[data-tab]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  // Delete modal
  if (g('delCancel')) g('delCancel').addEventListener('click', function() {
    g('deleteModal').classList.add('hidden');
    pendingDeleteIdx = null;
  });
  if (g('delBackdrop')) g('delBackdrop').addEventListener('click', function() {
    g('deleteModal').classList.add('hidden');
    pendingDeleteIdx = null;
  });
  if (g('delConfirm')) g('delConfirm').addEventListener('click', confirmDelete);

  // Image upload zone
  if (g('uploadZone') && g('productImage')) {
    g('uploadZone').addEventListener('click', function() { g('productImage').click(); });
    g('uploadZone').addEventListener('dragover', function(e) {
      e.preventDefault(); g('uploadZone').classList.add('drag-over');
    });
    g('uploadZone').addEventListener('dragleave', function() {
      g('uploadZone').classList.remove('drag-over');
    });
    g('uploadZone').addEventListener('drop', function(e) {
      e.preventDefault(); g('uploadZone').classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
    });
    g('productImage').addEventListener('change', function() {
      if (g('productImage').files[0]) handleImageFile(g('productImage').files[0]);
    });
  }

  if (g('removeImg')) g('removeImg').addEventListener('click', function(e) {
    e.stopPropagation();
    imageBase64 = null;
    if (g('productImage')) g('productImage').value = '';
    if (g('previewImg'))   g('previewImg').src = '';
    if (g('imagePreview'))     g('imagePreview').classList.add('hidden');
    if (g('uploadPlaceholder')) g('uploadPlaceholder').classList.remove('hidden');
  });

  // Product form submit
  if (g('productForm')) g('productForm').addEventListener('submit', function(e) {
    e.preventDefault();
    submitProduct();
  });

  // Search
  if (g('searchProducts')) g('searchProducts').addEventListener('input', function() {
    renderProducts(g('searchProducts').value);
  });

  // Order filter tabs
  document.querySelectorAll('.order-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.order-filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeOrderFilter = btn.dataset.status;
      renderOrders();
    });
  });

  // Proof viewer close
  if (g('proofBackdrop')) g('proofBackdrop').addEventListener('click', function() {
    g('proofViewerModal').classList.add('hidden');
  });
  if (g('proofClose')) g('proofClose').addEventListener('click', function() {
    g('proofViewerModal').classList.add('hidden');
  });
}

// ── TABS ──
function switchTab(tab) {
  document.querySelectorAll('[data-tab]').forEach(function(a) {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  ['tabAddProduct','tabManageProducts','tabOrders'].forEach(function(id) {
    if (g(id)) g(id).classList.add('hidden');
  });
  if (tab === 'addProduct') {
    if (g('tabAddProduct')) g('tabAddProduct').classList.remove('hidden');
    if (g('tabTitle')) g('tabTitle').textContent = 'Add Product';
  } else if (tab === 'manageProducts') {
    if (g('tabManageProducts')) g('tabManageProducts').classList.remove('hidden');
    if (g('tabTitle')) g('tabTitle').textContent = 'Manage Products';
    renderProducts();
  } else if (tab === 'orders') {
    if (g('tabOrders')) g('tabOrders').classList.remove('hidden');
    if (g('tabTitle')) g('tabTitle').textContent = 'Orders';
    renderOrders();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── PRODUCTS ──
function loadProducts() {
  if (useFirebase && db) {
    db.collection('products').orderBy('createdAt','desc').get().then(function(snap) {
      products = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      try { localStorage.setItem('fifeProducts', JSON.stringify(products)); } catch(e) {}
      updateCount(); renderProducts();
    }).catch(function() {
      products = JSON.parse(localStorage.getItem('fifeProducts') || '[]');
      updateCount(); renderProducts();
    });
  } else {
    products = JSON.parse(localStorage.getItem('fifeProducts') || '[]');
    updateCount(); renderProducts();
  }
}

function saveProductsLocal() {
  try { localStorage.setItem('fifeProducts', JSON.stringify(products)); } catch(e) {}
}

function updateCount() {
  var n = products.length;
  var t = n + ' product' + (n !== 1 ? 's' : '');
  if (g('productCount')) g('productCount').textContent = t;
  if (g('manageCount'))  g('manageCount').textContent  = t;
}

function renderProducts(filter) {
  var q = ((filter !== undefined ? filter : (g('searchProducts') ? g('searchProducts').value : ''))||'').toLowerCase();
  var list = q ? products.filter(function(p) {
    return p.name.toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q);
  }) : products;

  if (g('manageCount')) g('manageCount').textContent = list.length + ' product' + (list.length !== 1 ? 's' : '');

  var grid = g('adminProducts');
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = '<p class="empty-msg">' + (q ? 'No products match.' : 'No products yet.') + '</p>';
    return;
  }

  grid.innerHTML = list.map(function(p) {
    var idx = products.indexOf(p);
    return '<div class="admin-product" id="prod-' + idx + '">' +
      '<div class="admin-product-img-wrap">' +
        '<img src="' + p.image + '" alt="' + p.name + '" loading="lazy" onerror="this.src=\'https://placehold.co/300x200?text=No+Image\'">' +
        '<span class="product-category-badge">' + (p.category || 'General') + '</span>' +
      '</div>' +
      '<div class="admin-product-info">' +
        '<h3>' + p.name + '</h3>' +
        '<p class="price">&#8358;' + Number(p.price).toLocaleString() + '</p>' +
      '</div>' +
      '<div class="admin-product-actions">' +
        '<button class="btn-delete-product" data-idx="' + idx + '" data-id="' + (p.id||'') + '">' +
          '<i class="fa-solid fa-trash-can"></i> Delete' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');

  grid.querySelectorAll('.btn-delete-product').forEach(function(btn) {
    btn.addEventListener('click', function() {
      pendingDeleteIdx = parseInt(btn.dataset.idx);
      var p = products[pendingDeleteIdx];
      if (g('delProductName')) g('delProductName').textContent = '"' + (p ? p.name : '') + '" will be permanently removed.';
      var card = g('prod-' + pendingDeleteIdx);
      if (card) card.style.outline = '2px solid #c0392b';
      if (g('deleteModal')) g('deleteModal').classList.remove('hidden');
    });
  });
}

function confirmDelete() {
  if (pendingDeleteIdx === null) return;
  var product = products[pendingDeleteIdx];
  if (!product) return;
  var name = product.name;
  var firestoreId = product.id || null;

  // Animate card out
  var card = g('prod-' + pendingDeleteIdx);
  if (card) { card.style.opacity = '0'; card.style.transform = 'scale(0.9)'; card.style.transition = 'all 0.2s'; }

  // Remove from array and save immediately
  products.splice(pendingDeleteIdx, 1);
  saveProductsLocal();
  updateCount();

  // Close modal instantly
  if (g('deleteModal')) g('deleteModal').classList.add('hidden');
  pendingDeleteIdx = null;

  // Re-render after animation
  setTimeout(function() { renderProducts(); showToast('"' + name + '" deleted.'); }, 220);

  // Delete from Firestore in background
  if (useFirebase && db && firestoreId) {
    db.collection('products').doc(firestoreId).delete().catch(function(e) { console.warn('Firestore delete:', e); });
  }
}

// ── IMAGE UPLOAD & COMPRESS ──
function handleImageFile(file) {
  if (!file.type.startsWith('image/')) { showToast('Please select an image file.'); return; }
  if (file.size > 15 * 1024 * 1024)   { showToast('Image must be under 15MB.'); return; }

  if (g('uploadPlaceholder')) {
    g('uploadPlaceholder').classList.remove('hidden');
    g('uploadPlaceholder').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><p>Compressing…</p>';
  }
  if (g('imagePreview')) g('imagePreview').classList.add('hidden');

  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var MAX = 800, w = img.width, h = img.height;
      if (w > h && w > MAX) { h = Math.round(h*MAX/w); w = MAX; }
      else if (h > MAX)     { w = Math.round(w*MAX/h); h = MAX; }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      imageBase64 = canvas.toDataURL('image/jpeg', 0.75);
      if (g('previewImg')) g('previewImg').src = imageBase64;
      if (g('uploadPlaceholder')) {
        g('uploadPlaceholder').classList.add('hidden');
        g('uploadPlaceholder').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>Tap or drag to upload image</p><span>PNG, JPG, WEBP — max 15MB</span>';
      }
      if (g('imagePreview')) g('imagePreview').classList.remove('hidden');
      showToast('Image ready ✓');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ── ADD PRODUCT ──
function submitProduct() {
  var name     = (g('productName') ? g('productName').value : '').trim();
  var price    = (g('productPrice') ? g('productPrice').value : '').trim();
  var category = g('productCategory') ? (g('productCategory').value || 'General') : 'General';
  var desc     = g('productDesc') ? (g('productDesc').value || '').trim() : '';

  if (!name || !price) { showToast('Please enter name and price.'); return; }
  if (!imageBase64)    { showToast('Please upload a product image.'); return; }

  var btn = g('uploadBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…'; }

  var product = { name: name, price: Number(price), image: imageBase64, category: category, desc: desc };

  function onSaved() {
    if (g('productForm')) g('productForm').reset();
    imageBase64 = null;
    if (g('previewImg')) g('previewImg').src = '';
    if (g('imagePreview')) g('imagePreview').classList.add('hidden');
    if (g('uploadPlaceholder')) g('uploadPlaceholder').classList.remove('hidden');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Product'; }
    showToast('"' + name + '" added!');
  }

  if (useFirebase && db) {
    var toSave = Object.assign({}, product, { createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    db.collection('products').add(toSave).then(function(ref) {
      product.id = ref.id;
      products.unshift(product);
      saveProductsLocal();
      updateCount();
      onSaved();
    }).catch(function(e) {
      console.warn('Firestore save error:', e);
      products.unshift(product);
      saveProductsLocal();
      updateCount();
      onSaved();
    });
  } else {
    products.unshift(product);
    saveProductsLocal();
    updateCount();
    onSaved();
  }
}

// ── ORDERS ──
function renderOrders() {
  var ol = g('ordersList');
  if (!ol) return;
  ol.innerHTML = '<div class="orders-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading…</p></div>';

  var orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
  updateOrdersBadge(orders.length);
  if (g('ordersCountPill')) g('ordersCountPill').textContent = orders.length || '';

  var filtered = activeOrderFilter === 'all' ? orders : orders.filter(function(o) {
    return (o.status || 'Pending') === activeOrderFilter;
  });

  if (!filtered.length) { ol.innerHTML = '<p class="empty-msg">No orders here.</p>'; return; }

  ol.innerHTML = filtered.map(function(o) {
    var ri = orders.indexOf(o);
    var st = o.status || 'Pending';
    return '<div class="order-card">' +
      '<div class="order-header">' +
        '<div class="order-ref-wrap">' +
          '<span class="order-ref">' + o.ref + '</span>' +
          '<span class="order-status status-' + st.toLowerCase() + '">' + st + '</span>' +
        '</div>' +
        '<span class="order-date">' + (o.date||'') + '</span>' +
      '</div>' +
      '<div class="order-body">' +
        '<div class="order-details">' +
          '<div class="order-info-row"><i class="fa-solid fa-user"></i><span>' + o.name + '</span></div>' +
          '<div class="order-info-row"><i class="fa-solid fa-phone"></i><a href="tel:' + o.phone + '">' + o.phone + '</a></div>' +
          '<div class="order-info-row"><i class="fa-solid fa-location-dot"></i><span>' + o.address + '</span></div>' +
          '<div class="order-info-row"><i class="fa-solid fa-credit-card"></i><span>' + o.payment + '</span></div>' +
          '<div class="order-items">' +
            (o.items||[]).map(function(i){ return '<div class="order-item-row"><span>' + i.name + (i.qty>1?' x'+i.qty:'') + '</span><span>&#8358;' + (i.price*i.qty).toLocaleString() + '</span></div>'; }).join('') +
            '<div class="order-item-row total-row"><span>Total</span><strong>&#8358;' + Number(o.total).toLocaleString() + '</strong></div>' +
          '</div>' +
        '</div>' +
        (o.proof && o.proof.startsWith('data:image') ?
          '<div class="order-proof-wrap"><p class="order-proof-label">Payment Screenshot</p><img src="' + o.proof + '" class="order-proof-img" data-idx="' + ri + '"></div>' : '') +
      '</div>' +
      '<div class="order-actions">' +
        '<button class="order-btn btn-confirm' + (st==='Confirmed'?' is-done':'') + '" data-idx="' + ri + '" data-status="Confirmed"' + (st==='Confirmed'?' disabled':'') + '><i class="fa-solid fa-check"></i> ' + (st==='Confirmed'?'Confirmed':'Confirm') + '</button>' +
        '<button class="order-btn btn-reject' + (st==='Rejected'?' is-done':'') + '" data-idx="' + ri + '" data-status="Rejected"' + (st==='Rejected'?' disabled':'') + '><i class="fa-solid fa-xmark"></i> ' + (st==='Rejected'?'Rejected':'Reject') + '</button>' +
      '</div>' +
    '</div>';
  }).join('');

  ol.querySelectorAll('.order-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (btn.disabled) return;
      var idx = parseInt(btn.dataset.idx), status = btn.dataset.status;
      var orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
      if (!orders[idx]) return;
      orders[idx].status = status;
      localStorage.setItem('fifeOrders', JSON.stringify(orders));
      var card = btn.closest('.order-card');
      var badge = card.querySelector('.order-status');
      if (badge) { badge.textContent = status; badge.className = 'order-status status-' + status.toLowerCase(); }
      card.querySelectorAll('.order-btn').forEach(function(b) { b.disabled = true; b.classList.add('is-done'); });
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + status;
      showToast('Order marked as ' + status + ' ✓');
    });
  });

  ol.querySelectorAll('.order-proof-img').forEach(function(img) {
    img.addEventListener('click', function() {
      var orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
      var o = orders[parseInt(img.dataset.idx)];
      if (g('proofViewerImg')) g('proofViewerImg').src = img.src;
      if (g('proofViewerLabel') && o) g('proofViewerLabel').textContent = o.name + ' · ' + o.ref;
      if (g('proofViewerModal')) g('proofViewerModal').classList.remove('hidden');
    });
  });
}

function updateOrdersBadge(count) {
  var n = count !== undefined ? count : JSON.parse(localStorage.getItem('fifeOrders')||'[]').length;
  ['ordersBadge','navOrdersBadge'].forEach(function(id) {
    var el = g(id); if (el) el.textContent = n > 0 ? n : '';
  });
}
