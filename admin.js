// FIFE BEAUTY HUB - Admin JS
// Products now live in localStorage + are exported to a static products.json file.
// Firebase is kept ONLY for the one-time "Import from Firebase" button below.

var ADMIN_USER = 'Fife';
var ADMIN_PASS = 'Fife1234';

var firebaseConfig = {
  apiKey: "AIzaSyDi8fwHOwvT_BHZTyBXSDCmh9QWaAd5298",
  authDomain: "fife-beauty-hub-f2d2b.firebaseapp.com",
  projectId: "fife-beauty-hub-f2d2b",
  storageBucket: "fife-beauty-hub-f2d2b.firebasestorage.app",
  messagingSenderId: "392678495728",
  appId: "1:392678495728:web:1b5f05d3217bf3ae6df935"
};

var db = null;
var firebaseReady = false;
try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseReady = true;
  }
} catch (e) { console.warn('Firebase init skipped:', e); }

/* ===== CLOUDINARY (product image hosting) ===== */
var CLOUDINARY_CLOUD_NAME = 'dnaygu9qn';
var CLOUDINARY_UPLOAD_PRESET = 'Fife_Products';
var CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload';

var products = [];
var pendingDeleteIdx = null;
var uploadedImageUrl = null;
var activeOrderFilter = 'all';

function g(id) { return document.getElementById(id); }

function showToast(msg) {
  var t = g('adminToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3200);
}

// ── LOGIN ──
document.addEventListener('DOMContentLoaded', function () {
  if (sessionStorage.getItem('fifeAdminLoggedIn') === 'true') {
    showDashboard();
    return;
  }
  var loginBtn = g('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', attemptLogin);

  var loginPass = g('loginPass');
  if (loginPass) loginPass.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') attemptLogin();
  });

  var togglePass = g('togglePass');
  if (togglePass) togglePass.addEventListener('click', function () {
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
  var errEl = g('loginError');
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
  var loginScreen = g('loginScreen');
  var adminDashboard = g('adminDashboard');
  var adminBottomNav = g('adminBottomNav');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (adminDashboard) adminDashboard.classList.remove('hidden');
  if (adminBottomNav) adminBottomNav.classList.remove('hidden');

  wireDashboard();
  loadProducts();
  updateOrdersBadge();
}

function doLogout() {
  sessionStorage.removeItem('fifeAdminLoggedIn');
  if (g('loginScreen')) g('loginScreen').classList.remove('hidden');
  if (g('adminDashboard')) g('adminDashboard').classList.add('hidden');
  if (g('adminBottomNav')) g('adminBottomNav').classList.add('hidden');
  if (g('loginUser')) g('loginUser').value = '';
  if (g('loginPass')) g('loginPass').value = '';
}

var dashboardWired = false;
function wireDashboard() {
  if (dashboardWired) return;
  dashboardWired = true;

  if (g('logoutBtn')) g('logoutBtn').addEventListener('click', doLogout);
  if (g('logoutBtnTop')) g('logoutBtnTop').addEventListener('click', doLogout);

  // Tabs (sidebar + bottom nav)
  document.querySelectorAll('[data-tab]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  // Delete modal
  if (g('delCancel')) g('delCancel').addEventListener('click', function () {
    g('deleteModal').classList.add('hidden');
    pendingDeleteIdx = null;
  });
  if (g('delBackdrop')) g('delBackdrop').addEventListener('click', function () {
    g('deleteModal').classList.add('hidden');
    pendingDeleteIdx = null;
  });
  if (g('delConfirm')) g('delConfirm').addEventListener('click', confirmDelete);

  // Image upload zone
  if (g('uploadZone') && g('productImage')) {
    g('uploadZone').addEventListener('click', function () { g('productImage').click(); });
    g('uploadZone').addEventListener('dragover', function (e) {
      e.preventDefault(); g('uploadZone').classList.add('drag-over');
    });
    g('uploadZone').addEventListener('dragleave', function () {
      g('uploadZone').classList.remove('drag-over');
    });
    g('uploadZone').addEventListener('drop', function (e) {
      e.preventDefault(); g('uploadZone').classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
    });
    g('productImage').addEventListener('change', function () {
      if (g('productImage').files[0]) handleImageFile(g('productImage').files[0]);
    });
  }

  if (g('removeImg')) g('removeImg').addEventListener('click', function (e) {
    e.stopPropagation();
    uploadedImageUrl = null;
    if (g('productImage')) g('productImage').value = '';
    if (g('previewImg')) g('previewImg').src = '';
    if (g('imagePreview')) g('imagePreview').classList.add('hidden');
    if (g('uploadPlaceholder')) g('uploadPlaceholder').classList.remove('hidden');
  });

  // Add product form
  if (g('productForm')) g('productForm').addEventListener('submit', function (e) {
    e.preventDefault();
    submitProduct();
  });

  // Search
  if (g('searchProducts')) g('searchProducts').addEventListener('input', function () {
    renderProducts(g('searchProducts').value);
  });

  // Order filter tabs
  document.querySelectorAll('.order-filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.order-filter-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeOrderFilter = btn.dataset.status;
      renderOrders();
    });
  });

  // Proof viewer
  if (g('proofBackdrop')) g('proofBackdrop').addEventListener('click', function () {
    g('proofViewerModal').classList.add('hidden');
  });
  if (g('proofClose')) g('proofClose').addEventListener('click', function () {
    g('proofViewerModal').classList.add('hidden');
  });

  // JSON tools removed — products now sync live via Firebase
}

// ── TABS ──
function switchTab(tab) {
  document.querySelectorAll('[data-tab]').forEach(function (a) {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  ['tabAddProduct', 'tabManageProducts', 'tabOrders'].forEach(function (id) {
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

// ── PRODUCTS — localStorage only ──
function loadProducts() {
  if (!firebaseReady || !db) {
    showToast('Firebase not connected — check your internet connection.');
    products = [];
    updateCount();
    renderProducts();
    return;
  }
  var grid = g('adminProducts');
  if (grid) grid.innerHTML = '<p class="empty-msg">Loading products…</p>';

  db.collection('products').orderBy('createdAt', 'desc').get().then(function (snap) {
    products = snap.docs.map(function (d) {
      return Object.assign({ id: d.id }, d.data());
    });
    updateCount();
    renderProducts();
  }).catch(function (err) {
    console.error('Firestore load error:', err);
    showToast('Could not load products from Firebase.');
    products = [];
    updateCount();
    renderProducts();
  });
}

function updateCount() {
  var n = products.length;
  var t = n + ' product' + (n !== 1 ? 's' : '');
  if (g('productCount')) g('productCount').textContent = t;
  if (g('manageCount')) g('manageCount').textContent = t;
}

function renderProducts(filter) {
  var q = ((filter !== undefined ? filter : (g('searchProducts') ? g('searchProducts').value : '')) || '').toLowerCase();
  var list = q ? products.filter(function (p) {
    return p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  }) : products;

  if (g('manageCount')) g('manageCount').textContent = list.length + ' product' + (list.length !== 1 ? 's' : '');

  var grid = g('adminProducts');
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = '<p class="empty-msg">' + (q ? 'No products match.' : 'No products yet. Add your first one above.') + '</p>';
    return;
  }

  grid.innerHTML = list.map(function (p) {
    var idx = products.indexOf(p);
    return '<div class="admin-product" id="prod-' + idx + '">' +
      '<div class="admin-product-img-wrap">' +
      '<img src="' + cloudinaryThumb(p.image, 300) + '" alt="' + p.name + '" loading="lazy" onerror="this.src=\'https://placehold.co/300x200?text=No+Image\'">' +
      '<span class="product-category-badge">' + (p.category || 'General') + '</span>' +
      '</div>' +
      '<div class="admin-product-info">' +
      '<h3>' + p.name + '</h3>' +
      '<p class="price">&#8358;' + Number(p.price).toLocaleString() + '</p>' +
      '</div>' +
      '<div class="admin-product-actions">' +
      '<button class="btn-delete-product" data-idx="' + idx + '">' +
      '<i class="fa-solid fa-trash-can"></i> Delete' +
      '</button>' +
      '</div>' +
      '</div>';
  }).join('');

  grid.querySelectorAll('.btn-delete-product').forEach(function (btn) {
    btn.addEventListener('click', function () {
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
  var firestoreId = product.id;

  var card = g('prod-' + pendingDeleteIdx);
  if (card) { card.style.opacity = '0'; card.style.transform = 'scale(0.9)'; card.style.transition = 'all 0.2s'; }

  products.splice(pendingDeleteIdx, 1);
  updateCount();

  if (g('deleteModal')) g('deleteModal').classList.add('hidden');
  pendingDeleteIdx = null;

  setTimeout(function () {
    renderProducts();
    showToast('"' + name + '" deleted.');
  }, 220);

  if (firebaseReady && db && firestoreId) {
    db.collection('products').doc(firestoreId).delete().catch(function (err) {
      console.error('Firestore delete failed:', err);
      showToast('Warning: could not delete from Firebase. Try again.');
    });
  }
}

// ── IMAGE UPLOAD & COMPRESS ──
function handleImageFile(file) {
  if (!file.type.startsWith('image/')) { showToast('Please select an image file.'); return; }
  if (file.size > 15 * 1024 * 1024) { showToast('Image must be under 15MB.'); return; }

  uploadedImageUrl = null; // clear any previous successful upload

  if (g('uploadPlaceholder')) {
    g('uploadPlaceholder').classList.remove('hidden');
    g('uploadPlaceholder').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><p>Compressing…</p>';
  }
  if (g('imagePreview')) g('imagePreview').classList.add('hidden');

  var reader = new FileReader();
  reader.onload = function (ev) {
    var img = new Image();
    img.onload = function () {
      // Resize before upload to keep Cloudinary uploads fast and light
      var MAX = 1200, w = img.width, h = img.height;
      if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }

      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      canvas.toBlob(function (blob) {
        uploadToCloudinary(blob);
      }, 'image/jpeg', 0.85);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function uploadToCloudinary(blob) {
  if (g('uploadPlaceholder')) {
    g('uploadPlaceholder').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><p>Uploading to Cloudinary…</p>';
  }

  var formData = new FormData();
  formData.append('file', blob, 'product.jpg');
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData })
    .then(function (res) {
      if (!res.ok) throw new Error('Cloudinary responded with ' + res.status);
      return res.json();
    })
    .then(function (data) {
      if (!data.secure_url) throw new Error('No secure_url in Cloudinary response');
      uploadedImageUrl = data.secure_url;
      if (g('previewImg')) g('previewImg').src = uploadedImageUrl;
      if (g('uploadPlaceholder')) {
        g('uploadPlaceholder').classList.add('hidden');
        g('uploadPlaceholder').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>Tap or drag to upload image</p><span>PNG, JPG, WEBP — max 15MB</span>';
      }
      if (g('imagePreview')) g('imagePreview').classList.remove('hidden');
      showToast('Image uploaded to Cloudinary ✓');
    })
    .catch(function (err) {
      console.error('Cloudinary upload failed:', err);
      uploadedImageUrl = null;
      if (g('uploadPlaceholder')) {
        g('uploadPlaceholder').classList.remove('hidden');
        g('uploadPlaceholder').innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><p>Upload failed — tap to try again</p><span>Check your internet connection</span>';
      }
      showToast('Image upload failed. Please try again.');
    });
}

// Build a lighter, transformed Cloudinary URL for fast-loading thumbnails
function cloudinaryThumb(url, width) {
  if (!url || url.indexOf('res.cloudinary.com') === -1) return url; // not a Cloudinary URL, return as-is
  var marker = '/upload/';
  var idx = url.indexOf(marker);
  if (idx === -1) return url;
  var transform = 'w_' + (width || 400) + ',q_auto,f_auto,c_fill';
  return url.slice(0, idx + marker.length) + transform + '/' + url.slice(idx + marker.length);
}

// ── ADD PRODUCT (saves live to Firebase) ──
function submitProduct() {
  var name = (g('productName') ? g('productName').value : '').trim();
  var price = (g('productPrice') ? g('productPrice').value : '').trim();
  var category = g('productCategory') ? (g('productCategory').value || 'General') : 'General';
  var desc = g('productDesc') ? (g('productDesc').value || '').trim() : '';

  if (!name || !price) { showToast('Please enter name and price.'); return; }
  if (!uploadedImageUrl) { showToast('Please upload a product image.'); return; }
  if (!firebaseReady || !db) { showToast('Firebase not connected — check your internet connection.'); return; }

  var btn = g('uploadBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…'; }

  var product = { name: name, price: Number(price), image: uploadedImageUrl, category: category, description: desc };

  db.collection('products').add(Object.assign({}, product, {
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  })).then(function (ref) {
    product.id = ref.id;
    products.unshift(product);
    updateCount();
    renderProducts();
    resetProductForm(btn, name);
  }).catch(function (err) {
    console.error('Firestore save failed:', err);
    showToast('Could not save product to Firebase. Please try again.');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Product'; }
  });
}

function resetProductForm(btn, name) {
  if (g('productForm')) g('productForm').reset();
  uploadedImageUrl = null;
  if (g('previewImg')) g('previewImg').src = '';
  if (g('imagePreview')) g('imagePreview').classList.add('hidden');
  if (g('uploadPlaceholder')) g('uploadPlaceholder').classList.remove('hidden');
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Product'; }
  showToast('"' + name + '" added and live for everyone! ✓');
}

// ── ORDERS (Firestore — global) ──
var cachedOrders = []; // holds the most recently loaded orders (Firestore or local)

function renderOrders() {
  var ol = g('ordersList');
  if (!ol) return;
  ol.innerHTML = '<div class="orders-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading orders from all customers…</p></div>';

  if (firebaseReady && db) {
    db.collection('orders').orderBy('createdAt', 'desc').get().then(function (snap) {
      cachedOrders = snap.docs.map(function (d) {
        return Object.assign({ firestoreId: d.id }, d.data());
      });
      renderOrdersList();
    }).catch(function (err) {
      console.warn('Firestore orders read failed, using local cache:', err);
      cachedOrders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
      renderOrdersList();
    });
  } else {
    cachedOrders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
    renderOrdersList();
  }
}

function renderOrdersList() {
  var ol = g('ordersList');
  if (!ol) return;

  var orders = cachedOrders;
  updateOrdersBadge(orders.length);
  if (g('ordersCountPill')) g('ordersCountPill').textContent = orders.length || '';

  var filtered = activeOrderFilter === 'all' ? orders : orders.filter(function (o) {
    return (o.status || 'Pending') === activeOrderFilter;
  });

  if (!filtered.length) { ol.innerHTML = '<p class="empty-msg">No orders here.</p>'; return; }

  ol.innerHTML = filtered.map(function (o) {
    var ri = orders.indexOf(o);
    var st = o.status || 'Pending';
    return '<div class="order-card">' +
      '<div class="order-header">' +
      '<div class="order-ref-wrap">' +
      '<span class="order-ref">' + o.ref + '</span>' +
      '<span class="order-status status-' + st.toLowerCase() + '">' + st + '</span>' +
      '</div>' +
      '<span class="order-date">' + (o.date || '') + '</span>' +
      '</div>' +
      '<div class="order-body">' +
      '<div class="order-details">' +
      '<div class="order-info-row"><i class="fa-solid fa-user"></i><span>' + o.name + '</span></div>' +
      '<div class="order-info-row"><i class="fa-solid fa-phone"></i><a href="tel:' + o.phone + '">' + o.phone + '</a></div>' +
      '<div class="order-info-row"><i class="fa-solid fa-location-dot"></i><span>' + o.address + '</span></div>' +
      '<div class="order-info-row"><i class="fa-solid fa-credit-card"></i><span>' + o.payment + '</span></div>' +
      '<div class="order-items">' +
      (o.items || []).map(function (i) { return '<div class="order-item-row"><span>' + i.name + (i.qty > 1 ? ' x' + i.qty : '') + '</span><span>&#8358;' + (i.price * i.qty).toLocaleString() + '</span></div>'; }).join('') +
      '<div class="order-item-row total-row"><span>Total</span><strong>&#8358;' + Number(o.total).toLocaleString() + '</strong></div>' +
      '</div>' +
      '</div>' +
      (o.proof && o.proof.indexOf('data:image') === 0 ?
        '<div class="order-proof-wrap"><p class="order-proof-label">Payment Screenshot</p><img src="' + o.proof + '" class="order-proof-img" data-idx="' + ri + '"></div>' : '') +
      '</div>' +
      '<div class="order-actions">' +
      '<button class="order-btn btn-confirm' + (st === 'Confirmed' ? ' is-done' : '') + '" data-idx="' + ri + '" data-status="Confirmed"' + (st === 'Confirmed' ? ' disabled' : '') + '><i class="fa-solid fa-check"></i> ' + (st === 'Confirmed' ? 'Confirmed' : 'Confirm') + '</button>' +
      '<button class="order-btn btn-reject' + (st === 'Rejected' ? ' is-done' : '') + '" data-idx="' + ri + '" data-status="Rejected"' + (st === 'Rejected' ? ' disabled' : '') + '><i class="fa-solid fa-xmark"></i> ' + (st === 'Rejected' ? 'Rejected' : 'Reject') + '</button>' +
      '</div>' +
      '</div>';
  }).join('');

  ol.querySelectorAll('.order-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      var idx = parseInt(btn.dataset.idx), status = btn.dataset.status;
      var order = cachedOrders[idx];
      if (!order) return;

      order.status = status; // update in-memory immediately for instant UI feedback

      // Update Firestore (global, real fix) if this order has a Firestore ID
      if (firebaseReady && db && order.firestoreId) {
        db.collection('orders').doc(order.firestoreId).update({ status: status })
          .catch(function (err) { console.warn('Failed to update order status in Firestore:', err); });
      } else {
        // Fallback: update local cache copy
        var localOrders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
        if (localOrders[idx]) {
          localOrders[idx].status = status;
          localStorage.setItem('fifeOrders', JSON.stringify(localOrders));
        }
      }

      var card = btn.closest('.order-card');
      var badge = card.querySelector('.order-status');
      if (badge) { badge.textContent = status; badge.className = 'order-status status-' + status.toLowerCase(); }
      card.querySelectorAll('.order-btn').forEach(function (b) { b.disabled = true; b.classList.add('is-done'); });
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + status;
      showToast('Order marked as ' + status + ' ✓');
    });
  });

  ol.querySelectorAll('.order-proof-img').forEach(function (img) {
    img.addEventListener('click', function () {
      var o = cachedOrders[parseInt(img.dataset.idx)];
      if (g('proofViewerImg')) g('proofViewerImg').src = img.src;
      if (g('proofViewerLabel') && o) g('proofViewerLabel').textContent = o.name + ' · ' + o.ref;
      if (g('proofViewerModal')) g('proofViewerModal').classList.remove('hidden');
    });
  });
}

function updateOrdersBadge(count) {
  var n = count !== undefined ? count : cachedOrders.length;
  ['ordersBadge', 'navOrdersBadge'].forEach(function (id) {
    var el = g(id); if (el) el.textContent = n > 0 ? n : '';
  });
}
