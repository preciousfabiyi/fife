
// FIFE BEAUTY HUB - Admin JS (Cloudinary + Firestore, fully fixed)

var ADMIN_USER = 'Fife';
var ADMIN_PASS = 'Fife1234';

var CLOUDINARY_CLOUD_NAME    = 'dnaygu9qn';
var CLOUDINARY_UPLOAD_PRESET = 'Fife_Products';
var CLOUDINARY_UPLOAD_URL    = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload';

const firebaseConfig = {
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
} catch(e) { console.warn('Firebase init:', e); }

var products          = [];
var pendingDeleteIdx  = null;
var selectedFile      = null;
var imagePreviewUrl   = null;
var activeOrderFilter = 'all';

function g(id) { return document.getElementById(id); }

function showToast(msg) {
  var t = g('adminToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}

// ── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  if (sessionStorage.getItem('fifeAdminLoggedIn') === 'true') {
    showDashboard();
    return;
  }
  var loginBtn = g('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', attemptLogin);

  var loginPass = g('loginPass');
  if (loginPass) loginPass.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') attemptLogin();
  });

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
  var userEl = g('loginUser'), passEl = g('loginPass'), errEl = g('loginError');
  if (!userEl || !passEl) return;
  if (userEl.value.trim() === ADMIN_USER && passEl.value.trim() === ADMIN_PASS) {
    sessionStorage.setItem('fifeAdminLoggedIn', 'true');
    if (errEl) errEl.classList.add('hidden');
    showDashboard();
  } else {
    if (errEl) errEl.classList.remove('hidden');
    passEl.value = ''; passEl.focus();
  }
}

function showDashboard() {
  if (g('loginScreen'))    g('loginScreen').classList.add('hidden');
  if (g('adminDashboard')) g('adminDashboard').classList.remove('hidden');
  if (g('adminBottomNav')) g('adminBottomNav').classList.remove('hidden');
  wireDashboard();
  loadProducts();
  updateOrdersBadge();
}

function doLogout() {
  sessionStorage.removeItem('fifeAdminLoggedIn');
  if (g('loginScreen'))    g('loginScreen').classList.remove('hidden');
  if (g('adminDashboard')) g('adminDashboard').classList.add('hidden');
  if (g('adminBottomNav')) g('adminBottomNav').classList.add('hidden');
  if (g('loginUser')) g('loginUser').value = '';
  if (g('loginPass')) g('loginPass').value = '';
}

// ── WIRE DASHBOARD ────────────────────────────────────────────────────────────
var dashboardWired = false;
function wireDashboard() {
  if (dashboardWired) return;
  dashboardWired = true;

  checkMigrateBanner();
  if (g('migrateBtn')) g('migrateBtn').addEventListener('click', migrateProducts);
  if (g('logoutBtn'))    g('logoutBtn').addEventListener('click', doLogout);
  if (g('logoutBtnTop')) g('logoutBtnTop').addEventListener('click', doLogout);

  document.querySelectorAll('[data-tab]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  if (g('delCancel'))   g('delCancel').addEventListener('click', function() { g('deleteModal').classList.add('hidden'); pendingDeleteIdx = null; });
  if (g('delBackdrop')) g('delBackdrop').addEventListener('click', function() { g('deleteModal').classList.add('hidden'); pendingDeleteIdx = null; });
  if (g('delConfirm'))  g('delConfirm').addEventListener('click', confirmDelete);

  if (g('uploadZone') && g('productImage')) {
    g('uploadZone').addEventListener('click', function() { g('productImage').click(); });
    g('uploadZone').addEventListener('dragover', function(e) { e.preventDefault(); g('uploadZone').classList.add('drag-over'); });
    g('uploadZone').addEventListener('dragleave', function() { g('uploadZone').classList.remove('drag-over'); });
    g('uploadZone').addEventListener('drop', function(e) {
      e.preventDefault(); g('uploadZone').classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
    });
    g('productImage').addEventListener('change', function() {
      if (g('productImage').files[0]) handleImageFile(g('productImage').files[0]);
    });
  }

  if (g('removeImg')) g('removeImg').addEventListener('click', function(e) {
    e.stopPropagation(); clearImageSelection();
  });

  if (g('productForm')) g('productForm').addEventListener('submit', function(e) {
    e.preventDefault(); submitProduct();
  });

  if (g('searchProducts')) g('searchProducts').addEventListener('input', function() {
    renderProducts(g('searchProducts').value);
  });

  document.querySelectorAll('.order-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.order-filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeOrderFilter = btn.dataset.status;
      renderOrders();
    });
  });

  if (g('proofBackdrop')) g('proofBackdrop').addEventListener('click', function() { g('proofViewerModal').classList.add('hidden'); });
  if (g('proofClose'))    g('proofClose').addEventListener('click', function() { g('proofViewerModal').classList.add('hidden'); });
}

// ── TABS ──────────────────────────────────────────────────────────────────────
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

// ── LOAD PRODUCTS ─────────────────────────────────────────────────────────────
// KEY FIX: do NOT use orderBy('createdAt') — old products have no createdAt field
// and Firestore requires a composite index for orderBy on a field that doesn't
// exist on all docs, which causes the query to silently return 0 results.
// We fetch all and sort client-side instead.
function loadProducts() {
  if (useFirebase && db) {
    db.collection('products').get()
      .then(function(snap) {
        products = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
        // Sort newest first client-side (handles missing createdAt gracefully)
        products.sort(function(a, b) {
          var ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
          var tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
          return tb - ta;
        });
        try { localStorage.setItem('fifeProducts', JSON.stringify(products)); } catch(e) {}
        updateCount();
        renderProducts();
      })
      .catch(function(err) {
        console.warn('Firestore load failed, using localStorage:', err);
        products = JSON.parse(localStorage.getItem('fifeProducts') || '[]');
        updateCount();
        renderProducts();
      });
  } else {
    products = JSON.parse(localStorage.getItem('fifeProducts') || '[]');
    updateCount();
    renderProducts();
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
  var q = ((filter !== undefined ? filter : (g('searchProducts') ? g('searchProducts').value : '')) || '').toLowerCase();
  var list = q ? products.filter(function(p) {
    return p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
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
        '<button class="btn-delete-product" data-idx="' + idx + '" data-id="' + (p.id || '') + '">' +
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

  var card = g('prod-' + pendingDeleteIdx);
  if (card) { card.style.opacity = '0'; card.style.transform = 'scale(0.9)'; card.style.transition = 'all 0.2s'; }

  products.splice(pendingDeleteIdx, 1);
  saveProductsLocal();
  updateCount();
  if (g('deleteModal')) g('deleteModal').classList.add('hidden');
  pendingDeleteIdx = null;
  setTimeout(function() { renderProducts(); showToast('"' + name + '" deleted.'); }, 220);

  if (useFirebase && db && firestoreId) {
    db.collection('products').doc(firestoreId).delete()
      .catch(function(e) { console.warn('Firestore delete:', e); });
  }
}

// ── IMAGE SELECTION ───────────────────────────────────────────────────────────
function handleImageFile(file) {
  if (!file.type.startsWith('image/')) { showToast('Please select an image file.'); return; }
  if (file.size > 15 * 1024 * 1024)   { showToast('Image must be under 15MB.'); return; }

  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  selectedFile    = file;
  imagePreviewUrl = URL.createObjectURL(file);

  if (g('previewImg'))        g('previewImg').src = imagePreviewUrl;
  if (g('uploadPlaceholder')) g('uploadPlaceholder').classList.add('hidden');
  if (g('imagePreview'))      g('imagePreview').classList.remove('hidden');
  showToast('Image selected ✓');
}

function clearImageSelection() {
  selectedFile = null;
  if (imagePreviewUrl) { URL.revokeObjectURL(imagePreviewUrl); imagePreviewUrl = null; }
  if (g('productImage'))      g('productImage').value = '';
  if (g('previewImg'))        g('previewImg').src = '';
  if (g('imagePreview'))      g('imagePreview').classList.add('hidden');
  if (g('uploadPlaceholder')) g('uploadPlaceholder').classList.remove('hidden');
}

// ── CLOUDINARY UPLOAD ─────────────────────────────────────────────────────────
function uploadToCloudinary(file) {
  return new Promise(function(resolve, reject) {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'fife_products');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_UPLOAD_URL);
    xhr.onload = function() {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText).secure_url);
      } else {
        reject(new Error('Cloudinary error: ' + xhr.responseText));
      }
    };
    xhr.onerror = function() { reject(new Error('Network error')); };
    xhr.send(formData);
  });
}

function uploadBase64ToCloudinary(base64) {
  return new Promise(function(resolve, reject) {
    var formData = new FormData();
    formData.append('file', base64);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'fife_products');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_UPLOAD_URL);
    xhr.onload = function() {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText).secure_url);
      } else {
        reject(new Error('Cloudinary error: ' + xhr.responseText));
      }
    };
    xhr.onerror = function() { reject(new Error('Network error')); };
    xhr.send(formData);
  });
}

// ── ADD PRODUCT ───────────────────────────────────────────────────────────────
function submitProduct() {
  var name     = (g('productName')     ? g('productName').value     : '').trim();
  var price    = (g('productPrice')    ? g('productPrice').value    : '').trim();
  var category = (g('productCategory') ? g('productCategory').value : 'General') || 'General';
  var desc     = (g('productDesc')     ? g('productDesc').value     : '').trim();

  if (!name || !price) { showToast('Please enter name and price.'); return; }
  if (!selectedFile)   { showToast('Please select a product image.'); return; }

  var btn = g('uploadBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading image…'; }

  uploadToCloudinary(selectedFile)
    .then(function(imageUrl) {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving product…';
      var product = {
        name:      name,
        price:     Number(price),
        image:     imageUrl,
        category:  category,
        desc:      desc,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (useFirebase && db) {
        return db.collection('products').add(product).then(function(ref) {
          return Object.assign({ id: ref.id }, product);
        });
      }
      return Promise.resolve(product);
    })
    .then(function(saved) {
      products.unshift(saved);
      saveProductsLocal();
      updateCount();
      if (g('productForm')) g('productForm').reset();
      clearImageSelection();
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Product'; }
      showToast('"' + name + '" added!');
    })
    .catch(function(e) {
      console.error('Upload error:', e);
      showToast('Upload failed — check internet and try again.');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Product'; }
    });
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
function renderOrders() {
  var ol = g('ordersList');
  if (!ol) return;
  ol.innerHTML = '<div class="orders-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading…</p></div>';

  function displayOrders(orders) {
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
          '<span class="order-date">' + (o.date || '') + '</span>' +
        '</div>' +
        '<div class="order-body">' +
          '<div class="order-details">' +
            '<div class="order-info-row"><i class="fa-solid fa-user"></i><span>' + o.name + '</span></div>' +
            '<div class="order-info-row"><i class="fa-solid fa-phone"></i><a href="tel:' + o.phone + '">' + o.phone + '</a></div>' +
            '<div class="order-info-row"><i class="fa-solid fa-location-dot"></i><span>' + o.address + '</span></div>' +
            '<div class="order-info-row"><i class="fa-solid fa-credit-card"></i><span>' + o.payment + '</span></div>' +
            '<div class="order-items">' +
              (o.items || []).map(function(i) {
                return '<div class="order-item-row"><span>' + i.name + (i.qty > 1 ? ' x' + i.qty : '') + '</span><span>&#8358;' + (i.price * i.qty).toLocaleString() + '</span></div>';
              }).join('') +
              '<div class="order-item-row total-row"><span>Total</span><strong>&#8358;' + Number(o.total).toLocaleString() + '</strong></div>' +
            '</div>' +
          '</div>' +
          (o.proof && o.proof.startsWith('data:image') ?
            '<div class="order-proof-wrap"><p class="order-proof-label">Payment Screenshot</p><img src="' + o.proof + '" class="order-proof-img" data-idx="' + ri + '"></div>' : '') +
        '</div>' +
        '<div class="order-actions">' +
          '<button class="order-btn btn-confirm' + (st === 'Confirmed' ? ' is-done' : '') + '" data-idx="' + ri + '" data-id="' + (o.id || '') + '" data-status="Confirmed"' + (st === 'Confirmed' ? ' disabled' : '') + '><i class="fa-solid fa-check"></i> ' + (st === 'Confirmed' ? 'Confirmed' : 'Confirm') + '</button>' +
          '<button class="order-btn btn-reject'  + (st === 'Rejected'  ? ' is-done' : '') + '" data-idx="' + ri + '" data-id="' + (o.id || '') + '" data-status="Rejected"'  + (st === 'Rejected'  ? ' disabled' : '') + '><i class="fa-solid fa-xmark"></i> '  + (st === 'Rejected'  ? 'Rejected'  : 'Reject')  + '</button>' +
        '</div>' +
      '</div>';
    }).join('');

    ol.querySelectorAll('.order-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (btn.disabled) return;
        var idx         = parseInt(btn.dataset.idx);
        var firestoreId = btn.dataset.id;
        var status      = btn.dataset.status;

        var localOrders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
        if (localOrders[idx]) { localOrders[idx].status = status; localStorage.setItem('fifeOrders', JSON.stringify(localOrders)); }

        if (useFirebase && db && firestoreId) {
          db.collection('orders').doc(firestoreId).update({ status: status })
            .catch(function(e) { console.warn('Status update:', e); });
        }

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
        if (g('proofViewerImg')) g('proofViewerImg').src = img.src;
        var o = orders[parseInt(img.dataset.idx)];
        if (g('proofViewerLabel') && o) g('proofViewerLabel').textContent = o.name + ' · ' + o.ref;
        if (g('proofViewerModal')) g('proofViewerModal').classList.remove('hidden');
      });
    });
  }

  // Same fix as products — no orderBy to avoid index issues
  if (useFirebase && db) {
    db.collection('orders').get()
      .then(function(snap) {
        var orders = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
        // Sort newest first client-side
        orders.sort(function(a, b) {
          var ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
          var tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
          return tb - ta;
        });
        try { localStorage.setItem('fifeOrders', JSON.stringify(orders)); } catch(e) {}
        displayOrders(orders);
      })
      .catch(function(e) {
        console.warn('Firestore orders failed:', e);
        displayOrders(JSON.parse(localStorage.getItem('fifeOrders') || '[]'));
      });
  } else {
    displayOrders(JSON.parse(localStorage.getItem('fifeOrders') || '[]'));
  }
}

function updateOrdersBadge(count) {
  if (count !== undefined) {
    ['ordersBadge', 'navOrdersBadge'].forEach(function(id) {
      var el = g(id); if (el) el.textContent = count > 0 ? count : '';
    });
    return;
  }
  if (useFirebase && db) {
    db.collection('orders').get()
      .then(function(snap) {
        var n = snap.size;
        ['ordersBadge', 'navOrdersBadge'].forEach(function(id) { var el = g(id); if (el) el.textContent = n > 0 ? n : ''; });
      })
      .catch(function() {
        var n = JSON.parse(localStorage.getItem('fifeOrders') || '[]').length;
        ['ordersBadge', 'navOrdersBadge'].forEach(function(id) { var el = g(id); if (el) el.textContent = n > 0 ? n : ''; });
      });
  } else {
    var n = JSON.parse(localStorage.getItem('fifeOrders') || '[]').length;
    ['ordersBadge', 'navOrdersBadge'].forEach(function(id) { var el = g(id); if (el) el.textContent = n > 0 ? n : ''; });
  }
}

// ── MIGRATE: old base64 images → Cloudinary, update Firestore ─────────────────
function checkMigrateBanner() {
  var banner = g('migrateBanner');
  if (!banner) return;
  // Show banner if any Firestore product still has a base64 image
  if (!useFirebase || !db) { banner.style.display = 'none'; return; }
  db.collection('products').get().then(function(snap) {
    var hasBase64 = snap.docs.some(function(d) {
      var img = d.data().image || '';
      return img.startsWith('data:image');
    });
    banner.style.display = hasBase64 ? 'flex' : 'none';
  }).catch(function() { banner.style.display = 'none'; });
}

function migrateProducts() {
  var btn = g('migrateBtn');
  if (!useFirebase || !db) { showToast('Firebase not connected.'); return; }
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading products…'; }

  db.collection('products').get()
    .then(function(snap) {
      var toMigrate = snap.docs.filter(function(d) {
        var img = d.data().image || '';
        return img.startsWith('data:image');
      });

      if (toMigrate.length === 0) {
        showToast('All products already have fast images ✓');
        if (g('migrateBanner')) g('migrateBanner').style.display = 'none';
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Migrate Now'; }
        return;
      }

      var total = toMigrate.length, done = 0, failed = 0;
      showToast('Migrating ' + total + ' image' + (total > 1 ? 's' : '') + ' to Cloudinary…');

      toMigrate.forEach(function(doc) {
        var data = doc.data();
        uploadBase64ToCloudinary(data.image)
          .then(function(newUrl) {
            return db.collection('products').doc(doc.id).update({ image: newUrl });
          })
          .then(function() {
            done++;
            if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + done + '/' + total + ' done…';
            checkDone();
          })
          .catch(function(e) {
            console.warn('Migration failed for:', data.name, e);
            failed++; done++;
            checkDone();
          });
      });

      function checkDone() {
        if (done < total) return;
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Migrate Now'; }
        if (failed === 0) {
          showToast('✓ All ' + total + ' images migrated to Cloudinary!');
          if (g('migrateBanner')) g('migrateBanner').style.display = 'none';
          loadProducts();
        } else {
          showToast((total - failed) + ' migrated, ' + failed + ' failed — try again.');
        }
      }
    })
    .catch(function(e) {
      console.error('Migration load error:', e);
      showToast('Could not load products — check connection.');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Migrate Now'; }
    });
}
