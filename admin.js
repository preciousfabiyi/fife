// FIFE BEAUTY HUB - Admin JS

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
var useFirebase = false;

try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    useFirebase = true;
  }
} catch(e) {
  console.warn('Firebase error:', e);
}

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

// ===== LOGIN =====
window.addEventListener('DOMContentLoaded', function() {

  if (sessionStorage.getItem('fifeAdminLoggedIn') === 'true') {
    showDashboard();
    return;
  }

  var loginBtn = g('loginBtn');
  var loginPass = g('loginPass');

  if (loginBtn) {
    loginBtn.addEventListener('click', attemptLogin);
  }

  if (loginPass) {
    loginPass.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') attemptLogin();
    });
  }

  var togglePass = g('togglePass');
  if (togglePass) {
    togglePass.addEventListener('click', function() {
      var inp = g('loginPass');
      if (!inp) return;
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      var icon = togglePass.querySelector('i');
      if (icon) icon.className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    });
  }

  // Tab nav
  document.querySelectorAll('[data-tab]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  // Logout buttons
  var logoutBtn = g('logoutBtn');
  var logoutBtnTop = g('logoutBtnTop');
  if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
  if (logoutBtnTop) logoutBtnTop.addEventListener('click', doLogout);

  // Delete modal
  var delCancel = g('delCancel');
  var delBackdrop = g('delBackdrop');
  var delConfirm = g('delConfirm');
  if (delCancel) delCancel.addEventListener('click', function() {
    g('deleteModal').classList.add('hidden');
    pendingDeleteIdx = null;
  });
  if (delBackdrop) delBackdrop.addEventListener('click', function() {
    g('deleteModal').classList.add('hidden');
    pendingDeleteIdx = null;
  });
  if (delConfirm) delConfirm.addEventListener('click', function() {
    if (pendingDeleteIdx === null) return;
    var name = products[pendingDeleteIdx] ? products[pendingDeleteIdx].name : '';
    products.splice(pendingDeleteIdx, 1);
    saveProductsLocal();
    updateCount();
    renderProducts();
    g('deleteModal').classList.add('hidden');
    pendingDeleteIdx = null;
    showToast('"' + name + '" deleted.');
  });

  // Image upload
  var uploadZone = g('uploadZone');
  var productImage = g('productImage');
  if (uploadZone && productImage) {
    uploadZone.addEventListener('click', function() { productImage.click(); });
    uploadZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    uploadZone.addEventListener('dragleave', function() {
      uploadZone.classList.remove('drag-over');
    });
    uploadZone.addEventListener('drop', function(e) {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
    });
    productImage.addEventListener('change', function() {
      if (productImage.files[0]) handleImageFile(productImage.files[0]);
    });
  }

  var removeImg = g('removeImg');
  if (removeImg) {
    removeImg.addEventListener('click', function(e) {
      e.stopPropagation();
      imageBase64 = null;
      if (g('productImage')) g('productImage').value = '';
      if (g('previewImg')) g('previewImg').src = '';
      if (g('imagePreview')) g('imagePreview').classList.add('hidden');
      if (g('uploadPlaceholder')) g('uploadPlaceholder').classList.remove('hidden');
    });
  }

  // Product form
  var productForm = g('productForm');
  if (productForm) {
    productForm.addEventListener('submit', function(e) {
      e.preventDefault();
      submitProduct();
    });
  }

  // Search
  var searchInput = g('searchProducts');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      renderProducts(searchInput.value);
    });
  }

  // Order filters
  document.querySelectorAll('.order-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.order-filter-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      activeOrderFilter = btn.dataset.status;
      renderOrders();
    });
  });

  // Proof viewer
  var proofBackdrop = g('proofBackdrop');
  var proofClose = g('proofClose');
  if (proofBackdrop) proofBackdrop.addEventListener('click', function() {
    g('proofViewerModal').classList.add('hidden');
  });
  if (proofClose) proofClose.addEventListener('click', function() {
    g('proofViewerModal').classList.add('hidden');
  });

});

function attemptLogin() {
  var userInput = g('loginUser');
  var passInput = g('loginPass');
  var loginError = g('loginError');

  if (!userInput || !passInput) {
    alert('Login form not found. Please refresh the page.');
    return;
  }

  var user = userInput.value.trim();
  var pass = passInput.value.trim();

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    sessionStorage.setItem('fifeAdminLoggedIn', 'true');
    if (loginError) loginError.classList.add('hidden');
    showDashboard();
  } else {
    if (loginError) loginError.classList.remove('hidden');
    passInput.value = '';
    passInput.focus();
  }
}

function showDashboard() {
  var loginScreen = g('loginScreen');
  var adminDashboard = g('adminDashboard');
  var adminBottomNav = g('adminBottomNav');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (adminDashboard) adminDashboard.classList.remove('hidden');
  if (adminBottomNav) adminBottomNav.classList.remove('hidden');
  loadProducts();
  updateOrdersBadge();
}

function doLogout() {
  sessionStorage.removeItem('fifeAdminLoggedIn');
  var loginScreen = g('loginScreen');
  var adminDashboard = g('adminDashboard');
  var adminBottomNav = g('adminBottomNav');
  if (loginScreen) loginScreen.classList.remove('hidden');
  if (adminDashboard) adminDashboard.classList.add('hidden');
  if (adminBottomNav) adminBottomNav.classList.add('hidden');
  if (g('loginUser')) g('loginUser').value = '';
  if (g('loginPass')) g('loginPass').value = '';
}

// ===== TABS =====
function switchTab(tab) {
  document.querySelectorAll('[data-tab]').forEach(function(a) {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  ['tabAddProduct','tabManageProducts','tabOrders'].forEach(function(id) {
    var el = g(id);
    if (el) el.classList.add('hidden');
  });
  var tabTitle = g('tabTitle');
  if (tab === 'addProduct') {
    g('tabAddProduct').classList.remove('hidden');
    if (tabTitle) tabTitle.textContent = 'Add Product';
  } else if (tab === 'manageProducts') {
    g('tabManageProducts').classList.remove('hidden');
    if (tabTitle) tabTitle.textContent = 'Manage Products';
    renderProducts();
  } else if (tab === 'orders') {
    g('tabOrders').classList.remove('hidden');
    if (tabTitle) tabTitle.textContent = 'Orders';
    renderOrders();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== PRODUCTS =====
function loadProducts() {
  if (useFirebase && db) {
    db.collection('products').orderBy('createdAt', 'desc').get().then(function(snap) {
      products = snap.docs.map(function(d) {
        return Object.assign({ id: d.id }, d.data());
      });
      try { localStorage.setItem('fifeProducts', JSON.stringify(products)); } catch(e) {}
      updateCount();
      renderProducts();
    }).catch(function(e) {
      console.warn('Firestore load failed, using localStorage:', e);
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

function submitProduct() {
  var name     = (g('productName').value || '').trim();
  var price    = (g('productPrice').value || '').trim();
  var category = g('productCategory').value || 'General';
  var desc     = g('productDesc') ? (g('productDesc').value || '').trim() : '';

  if (!name || !price) { showToast('Please enter name and price.'); return; }
  if (!imageBase64)    { showToast('Please upload a product image.'); return; }

  var btn = g('uploadBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…'; }

  var product = { name: name, price: Number(price), image: imageBase64, category: category, desc: desc };

  if (useFirebase && db) {
    var productToSave = Object.assign({}, product, {
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    db.collection('products').add(productToSave).then(function(ref) {
      product.id = ref.id;
      products.unshift(product);
      saveProductsLocal();
      updateCount();
      renderProducts();
      resetProductForm(btn, name);
    }).catch(function(e) {
      console.warn('Firestore save failed:', e);
      products.unshift(product);
      saveProductsLocal();
      updateCount();
      renderProducts();
      resetProductForm(btn, name);
    });
  } else {
    products.unshift(product);
    saveProductsLocal();
    updateCount();
    renderProducts();
    resetProductForm(btn, name);
  }
}

function resetProductForm(btn, name) {
  if (g('productForm')) g('productForm').reset();
  imageBase64 = null;
  if (g('previewImg')) g('previewImg').src = '';
  if (g('imagePreview')) g('imagePreview').classList.add('hidden');
  if (g('uploadPlaceholder')) g('uploadPlaceholder').classList.remove('hidden');
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Product'; }
  showToast('"' + name + '" added successfully!');
}

function updateCount() {
  var n = products.length;
  var txt = n + ' product' + (n !== 1 ? 's' : '');
  if (g('productCount')) g('productCount').textContent = txt;
  if (g('manageCount'))  g('manageCount').textContent  = txt;
}

function renderProducts(filter) {
  var searchEl = g('searchProducts');
  var q = (filter !== undefined ? filter : (searchEl ? searchEl.value : '')).toLowerCase();
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
    var realIdx = products.indexOf(p);
    return '<div class="admin-product">' +
      '<div class="admin-product-img-wrap">' +
        '<img src="' + p.image + '" alt="' + p.name + '" loading="lazy" onerror="this.src=\'https://placehold.co/300x200?text=No+Image\'">' +
        '<span class="product-category-badge">' + (p.category || 'General') + '</span>' +
      '</div>' +
      '<div class="admin-product-info">' +
        '<h3>' + p.name + '</h3>' +
        '<p class="price">&#8358;' + Number(p.price).toLocaleString() + '</p>' +
      '</div>' +
      '<div class="admin-product-actions">' +
        '<button class="btn-delete-product" data-idx="' + realIdx + '" data-id="' + (p.id||'') + '">' +
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
      if (g('deleteModal')) g('deleteModal').classList.remove('hidden');
    });
  });
}

// ===== IMAGE COMPRESSION =====
function handleImageFile(file) {
  if (!file.type.startsWith('image/')) { showToast('Please select an image file.'); return; }
  if (file.size > 15 * 1024 * 1024)   { showToast('Image must be under 15MB.');    return; }

  var placeholder = g('uploadPlaceholder');
  var preview = g('imagePreview');
  if (placeholder) {
    placeholder.classList.remove('hidden');
    placeholder.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><p>Compressing…</p>';
  }
  if (preview) preview.classList.add('hidden');

  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var MAX = 800;
      var w = img.width, h = img.height;
      if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      else if (h > MAX)     { w = Math.round(w * MAX / h); h = MAX; }

      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      imageBase64 = canvas.toDataURL('image/jpeg', 0.75);

      if (g('previewImg')) g('previewImg').src = imageBase64;
      if (placeholder) {
        placeholder.classList.add('hidden');
        placeholder.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>Tap or drag to upload image</p><span>PNG, JPG, WEBP — max 15MB</span>';
      }
      if (preview) preview.classList.remove('hidden');
      showToast('Image ready ✓');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ===== ORDERS =====
function renderOrders() {
  var ordersList = g('ordersList');
  if (!ordersList) return;
  ordersList.innerHTML = '<div class="orders-loading"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading…</p></div>';

  var orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
  updateOrdersBadge(orders.length);

  var pill = g('ordersCountPill');
  if (pill) pill.textContent = orders.length > 0 ? orders.length : '';

  var filtered = activeOrderFilter === 'all' ? orders : orders.filter(function(o) {
    return (o.status || 'Pending') === activeOrderFilter;
  });

  if (filtered.length === 0) {
    ordersList.innerHTML = '<p class="empty-msg">No orders in this category.</p>';
    return;
  }

  ordersList.innerHTML = filtered.map(function(o, idx) {
    var realIdx = orders.indexOf(o);
    var status = o.status || 'Pending';
    return '<div class="order-card" id="ocard-' + idx + '">' +
      '<div class="order-header">' +
        '<div class="order-ref-wrap">' +
          '<span class="order-ref">' + o.ref + '</span>' +
          '<span class="order-status status-' + status.toLowerCase() + '">' + status + '</span>' +
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
            (o.items||[]).map(function(i) {
              return '<div class="order-item-row"><span>' + i.name + (i.qty > 1 ? ' x' + i.qty : '') + '</span><span>&#8358;' + (i.price * i.qty).toLocaleString() + '</span></div>';
            }).join('') +
            '<div class="order-item-row total-row"><span>Total</span><strong>&#8358;' + Number(o.total).toLocaleString() + '</strong></div>' +
          '</div>' +
        '</div>' +
        (o.proof && o.proof.startsWith('data:image') ?
          '<div class="order-proof-wrap">' +
            '<p class="order-proof-label">Payment Screenshot</p>' +
            '<img src="' + o.proof + '" class="order-proof-img" data-idx="' + realIdx + '">' +
          '</div>' : '') +
      '</div>' +
      '<div class="order-actions">' +
        '<button class="order-btn btn-confirm' + (status==='Confirmed'?' is-done':'') + '" data-idx="' + realIdx + '" data-status="Confirmed"' + (status==='Confirmed'?' disabled':'') + '>' +
          '<i class="fa-solid fa-check"></i> ' + (status==='Confirmed'?'Confirmed':'Confirm') +
        '</button>' +
        '<button class="order-btn btn-reject' + (status==='Rejected'?' is-done':'') + '" data-idx="' + realIdx + '" data-status="Rejected"' + (status==='Rejected'?' disabled':'') + '>' +
          '<i class="fa-solid fa-xmark"></i> ' + (status==='Rejected'?'Rejected':'Reject') +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');

  // Fast status buttons
  ordersList.querySelectorAll('.order-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (btn.disabled) return;
      var idx = parseInt(btn.dataset.idx);
      var status = btn.dataset.status;
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

  // Proof viewer
  ordersList.querySelectorAll('.order-proof-img').forEach(function(img) {
    img.addEventListener('click', function() {
      var viewer = g('proofViewerModal');
      var viewerImg = g('proofViewerImg');
      var viewerLabel = g('proofViewerLabel');
      if (viewerImg) viewerImg.src = img.src;
      var orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
      var o = orders[parseInt(img.dataset.idx)];
      if (viewerLabel && o) viewerLabel.textContent = o.name + ' · ' + o.ref;
      if (viewer) viewer.classList.remove('hidden');
    });
  });
}

function updateOrdersBadge(count) {
  var n = count !== undefined ? count : JSON.parse(localStorage.getItem('fifeOrders') || '[]').length;
  ['ordersBadge','navOrdersBadge'].forEach(function(id) {
    var el = g(id);
    if (el) el.textContent = n > 0 ? n : '';
  });
}
