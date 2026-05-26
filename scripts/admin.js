/* ============================================
   FIFE BEAUTY HUB — Admin JS
   - Firebase Firestore for global products/orders
   - Mobile bottom nav tabs
   - Fast inline order confirm/reject
============================================ */

/* ===== CREDENTIALS ===== */
const ADMIN_USER = 'Fife';
const ADMIN_PASS = 'Fife1234';

/* ===== FIREBASE CONFIG — replace with yours from Firebase Console ===== */
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

/* ===== INIT FIREBASE ===== */
let db = null;
let useFirebase = false;
try {
  if (firebaseConfig.apiKey !== 'YOUR_API_KEY') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    useFirebase = true;
    console.log('✓ Firebase connected — products & orders are global');
  } else {
    console.warn('Firebase not configured — using localStorage (device only). See FIREBASE_SETUP.md');
  }
} catch(e) {
  console.warn('Firebase init failed, falling back to localStorage:', e);
}

/* ===== STATE ===== */
let products        = [];
let pendingDeleteId = null; // Firestore doc ID or localStorage index
let imageBase64     = null;
let activeOrderFilter = 'all';

/* ===== ELEMENTS ===== */
const loginScreen       = document.getElementById('loginScreen');
const adminDashboard    = document.getElementById('adminDashboard');
const adminBottomNav    = document.getElementById('adminBottomNav');
const loginBtn          = document.getElementById('loginBtn');
const logoutBtn         = document.getElementById('logoutBtn');
const logoutBtnTop      = document.getElementById('logoutBtnTop');
const loginError        = document.getElementById('loginError');
const togglePass        = document.getElementById('togglePass');
const productForm       = document.getElementById('productForm');
const adminProductsEl   = document.getElementById('adminProducts');
const productCountEl    = document.getElementById('productCount');
const manageCountEl     = document.getElementById('manageCount');
const uploadZone        = document.getElementById('uploadZone');
const productImageInput = document.getElementById('productImage');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreviewEl    = document.getElementById('imagePreview');
const previewImg        = document.getElementById('previewImg');
const removeImgBtn      = document.getElementById('removeImg');
const searchInput       = document.getElementById('searchProducts');
const deleteModal       = document.getElementById('deleteModal');
const delProductName    = document.getElementById('delProductName');
const delCancel         = document.getElementById('delCancel');
const delConfirm        = document.getElementById('delConfirm');

/* ===== LOGIN ===== */
if (sessionStorage.getItem('fifeAdminLoggedIn') === 'true') showDashboard();

loginBtn.addEventListener('click', attemptLogin);
document.getElementById('loginPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') attemptLogin();
});

function attemptLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    sessionStorage.setItem('fifeAdminLoggedIn', 'true');
    loginError.classList.add('hidden');
    showDashboard();
  } else {
    loginError.classList.remove('hidden');
    document.getElementById('loginPass').value = '';
    document.getElementById('loginPass').focus();
  }
}

function doLogout() {
  sessionStorage.removeItem('fifeAdminLoggedIn');
  adminDashboard.classList.add('hidden');
  adminBottomNav.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}
logoutBtn.addEventListener('click', doLogout);
logoutBtnTop.addEventListener('click', doLogout);

togglePass.addEventListener('click', () => {
  const inp = document.getElementById('loginPass');
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  togglePass.querySelector('i').className = isText ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
});

function showDashboard() {
  loginScreen.classList.add('hidden');
  adminDashboard.classList.remove('hidden');
  adminBottomNav.classList.remove('hidden');
  loadProducts();
  updateOrdersBadge();
}

/* ===== TABS — works for both sidebar + bottom nav ===== */
function switchTab(tab) {
  // Update active state on all nav links (sidebar + bottom nav)
  document.querySelectorAll('[data-tab]').forEach(a => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });

  document.getElementById('tabAddProduct').classList.add('hidden');
  document.getElementById('tabManageProducts').classList.add('hidden');
  document.getElementById('tabOrders').classList.add('hidden');

  if (tab === 'addProduct') {
    document.getElementById('tabAddProduct').classList.remove('hidden');
    document.getElementById('tabTitle').textContent = 'Add Product';
  } else if (tab === 'manageProducts') {
    document.getElementById('tabManageProducts').classList.remove('hidden');
    document.getElementById('tabTitle').textContent = 'Manage Products';
    renderProducts();
  } else if (tab === 'orders') {
    document.getElementById('tabOrders').classList.remove('hidden');
    document.getElementById('tabTitle').textContent = 'Orders';
    renderOrders();
  }
  // Scroll to top on mobile tab switch
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-tab]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    switchTab(link.dataset.tab);
  });
});

/* ===== PRODUCTS — Firebase or localStorage ===== */
async function loadProducts() {
  if (useFirebase) {
    try {
      const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
      products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      console.error('Firestore load error:', e);
      products = JSON.parse(localStorage.getItem('fifeProducts') || '[]');
    }
  } else {
    products = JSON.parse(localStorage.getItem('fifeProducts') || '[]');
  }
  updateCount();
  renderProducts();
}

async function saveProduct(product) {
  if (useFirebase) {
    const ref = await db.collection('products').add({
      ...product,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    product.id = ref.id;
    products.unshift(product);
  } else {
    products.unshift(product);
    try { localStorage.setItem('fifeProducts', JSON.stringify(products)); }
    catch(e) { showToast('Storage full — try a smaller image.'); }
  }
  // Always mirror to localStorage so main site can read it even without Firebase
  try { localStorage.setItem('fifeProducts', JSON.stringify(products)); } catch(e) {}
  updateCount();
  renderProducts();
}

async function deleteProduct(idOrIdx) {
  if (useFirebase && typeof idOrIdx === 'string') {
    await db.collection('products').doc(idOrIdx).delete();
    products = products.filter(p => p.id !== idOrIdx);
  } else {
    products.splice(idOrIdx, 1);
  }
  try { localStorage.setItem('fifeProducts', JSON.stringify(products)); } catch(e) {}
  updateCount();
  renderProducts();
}

function renderProducts(filter = '') {
  const q = filter || (searchInput ? searchInput.value : '');
  const filtered = q
    ? products.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.category||'').toLowerCase().includes(q.toLowerCase()))
    : products;

  const n = filtered.length;
  if (manageCountEl) manageCountEl.textContent = `${n} product${n !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    adminProductsEl.innerHTML = `<p class="empty-msg">${q ? 'No products match your search.' : 'No products uploaded yet.'}</p>`;
    return;
  }

  adminProductsEl.innerHTML = filtered.map((p) => `
    <div class="admin-product">
      <div class="admin-product-img-wrap">
        <img src="${p.image}" alt="${p.name}" loading="lazy"
          onerror="this.src='https://placehold.co/400x300?text=No+Image'">
        <span class="product-category-badge">${p.category || 'General'}</span>
      </div>
      <div class="admin-product-info">
        <h3>${p.name}</h3>
        <p class="price">₦${Number(p.price).toLocaleString()}</p>
      </div>
      <div class="admin-product-actions">
        <button class="btn-delete-product" data-id="${p.id || ''}" data-idx="${products.indexOf(p)}" aria-label="Delete">
          <i class="fa-solid fa-trash-can"></i> Delete
        </button>
      </div>
    </div>
  `).join('');

  adminProductsEl.querySelectorAll('.btn-delete-product').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteId = useFirebase ? btn.dataset.id : parseInt(btn.dataset.idx);
      const name = useFirebase
        ? products.find(p => p.id === btn.dataset.id)?.name
        : products[parseInt(btn.dataset.idx)]?.name;
      delProductName.textContent = `"${name}" will be permanently removed.`;
      deleteModal.classList.remove('hidden');
    });
  });
}

if (searchInput) {
  searchInput.addEventListener('input', () => renderProducts(searchInput.value));
}

/* ===== DELETE MODAL ===== */
delCancel.addEventListener('click', () => {
  deleteModal.classList.add('hidden');
  pendingDeleteId = null;
});
deleteModal.querySelector('.del-backdrop').addEventListener('click', () => {
  deleteModal.classList.add('hidden');
  pendingDeleteId = null;
});
delConfirm.addEventListener('click', async () => {
  if (pendingDeleteId === null) return;
  delConfirm.disabled = true;
  delConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  await deleteProduct(pendingDeleteId);
  deleteModal.classList.add('hidden');
  delConfirm.disabled = false;
  delConfirm.innerHTML = 'Yes, Delete';
  pendingDeleteId = null;
  showToast('Product deleted.');
});

/* ===== IMAGE UPLOAD & COMPRESSION ===== */
uploadZone.addEventListener('click', () => productImageInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
});
productImageInput.addEventListener('change', () => {
  if (productImageInput.files[0]) handleImageFile(productImageInput.files[0]);
});

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) { showToast('Please select a valid image file.'); return; }
  if (file.size > 15 * 1024 * 1024) { showToast('Image must be under 15MB.'); return; }
  uploadPlaceholder.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><p>Compressing…</p>`;
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
      previewImg.src = imageBase64;
      uploadPlaceholder.classList.add('hidden');
      imagePreviewEl.classList.remove('hidden');
      uploadPlaceholder.innerHTML = `
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <p>Tap or drag to upload image</p>
        <span>PNG, JPG, WEBP — max 15MB</span>`;
      showToast('Image ready ✓');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

removeImgBtn.addEventListener('click', e => {
  e.stopPropagation();
  imageBase64 = null; productImageInput.value = ''; previewImg.src = '';
  imagePreviewEl.classList.add('hidden'); uploadPlaceholder.classList.remove('hidden');
});

/* ===== ADD PRODUCT ===== */
productForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name     = document.getElementById('productName').value.trim();
  const price    = document.getElementById('productPrice').value.trim();
  const category = document.getElementById('productCategory').value;
  const desc     = document.getElementById('productDesc').value.trim();

  if (!name || !price) { showToast('Please fill in name and price.'); return; }
  if (!imageBase64)    { showToast('Please upload a product image.');  return; }

  const uploadBtn = document.getElementById('uploadBtn');
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

  await saveProduct({ name, price: Number(price), image: imageBase64, category: category || 'General', desc });

  productForm.reset();
  imageBase64 = null; previewImg.src = '';
  imagePreviewEl.classList.add('hidden'); uploadPlaceholder.classList.remove('hidden');
  uploadBtn.disabled = false;
  uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Product';
  showToast(`"${name}" added successfully!`);
});

/* ===== ORDERS — Firebase or localStorage ===== */
async function loadOrders() {
  if (useFirebase) {
    try {
      const snap = await db.collection('orders').orderBy('createdAt', 'desc').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      return JSON.parse(localStorage.getItem('fifeOrders') || '[]');
    }
  }
  return JSON.parse(localStorage.getItem('fifeOrders') || '[]');
}

async function renderOrders() {
  const ordersList = document.getElementById('ordersList');
  ordersList.innerHTML = `<div class="orders-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading orders…</div>`;

  const orders = await loadOrders();
  updateOrdersBadge(orders.length);

  const filtered = activeOrderFilter === 'all'
    ? orders
    : orders.filter(o => (o.status || 'Pending') === activeOrderFilter);

  const pill = document.getElementById('ordersCountPill');
  if (pill) pill.textContent = orders.length > 0 ? orders.length : '';

  if (filtered.length === 0) {
    ordersList.innerHTML = '<p class="empty-msg">No orders in this category.</p>';
    return;
  }

  ordersList.innerHTML = filtered.map((o, idx) => `
    <div class="order-card" id="order-${o.id || idx}">
      <div class="order-header">
        <div class="order-ref-wrap">
          <span class="order-ref">${o.ref}</span>
          <span class="order-status status-${(o.status||'Pending').toLowerCase()}">${o.status || 'Pending'}</span>
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
            data-id="${o.id || idx}" data-name="${o.name}" data-ref="${o.ref}">
        </div>` : ''}
      </div>

      <!-- Fast action buttons -->
      <div class="order-actions">
        <button class="order-btn btn-confirm ${o.status==='Confirmed'?'is-done':''}"
          data-id="${o.id || ''}" data-idx="${idx}" data-status="Confirmed"
          ${o.status==='Confirmed'?'disabled':''}>
          <i class="fa-solid fa-${o.status==='Confirmed'?'circle-check':'check'}"></i>
          ${o.status==='Confirmed' ? 'Confirmed' : 'Confirm'}
        </button>
        <button class="order-btn btn-reject ${o.status==='Rejected'?'is-done':''}"
          data-id="${o.id || ''}" data-idx="${idx}" data-status="Rejected"
          ${o.status==='Rejected'?'disabled':''}>
          <i class="fa-solid fa-${o.status==='Rejected'?'circle-xmark':'xmark'}"></i>
          ${o.status==='Rejected' ? 'Rejected' : 'Reject'}
        </button>
      </div>
    </div>
  `).join('');

  // Fast inline order status update — no page reload
  ordersList.querySelectorAll('.order-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      const status  = btn.dataset.status;
      const id      = btn.dataset.id;
      const idx     = parseInt(btn.dataset.idx);
      const card    = btn.closest('.order-card');

      // Instant UI feedback
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

      await updateOrderStatus(id, idx, status);

      // Update card status badge instantly
      const statusBadge = card.querySelector('.order-status');
      if (statusBadge) {
        statusBadge.textContent = status;
        statusBadge.className = `order-status status-${status.toLowerCase()}`;
      }

      // Update both buttons in card
      card.querySelectorAll('.order-btn').forEach(b => {
        b.disabled = true;
        b.classList.add('is-done');
      });
      btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${status}`;
      const other = card.querySelector(`.order-btn:not([data-status="${status}"])`);
      if (other) other.innerHTML = `<i class="fa-solid fa-xmark"></i> ${other.dataset.status === 'Rejected' ? 'Reject' : 'Confirm'}`;

      showToast(`Order ${card.querySelector('.order-ref')?.textContent} → ${status} ✓`);
    });
  });

  // Proof image viewer
  ordersList.querySelectorAll('.order-proof-img').forEach(img => {
    img.addEventListener('click', () => {
      openProofViewer(img.src, `${img.dataset.name} · ${img.dataset.ref}`);
    });
  });
}

async function updateOrderStatus(id, idx, status) {
  if (useFirebase && id) {
    await db.collection('orders').doc(id).update({ status });
  }
  // Always update localStorage copy too
  const orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
  if (orders[idx]) { orders[idx].status = status; localStorage.setItem('fifeOrders', JSON.stringify(orders)); }
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

/* ===== PROOF VIEWER ===== */
function openProofViewer(src, label) {
  document.getElementById('proofViewerImg').src = src;
  document.getElementById('proofViewerLabel').textContent = label;
  document.getElementById('proofViewerModal').classList.remove('hidden');
}
document.getElementById('proofBackdrop').addEventListener('click', () =>
  document.getElementById('proofViewerModal').classList.add('hidden'));
document.getElementById('proofClose').addEventListener('click', () =>
  document.getElementById('proofViewerModal').classList.add('hidden'));

/* ===== HELPERS ===== */
function updateOrdersBadge(count) {
  const n = count !== undefined ? count : JSON.parse(localStorage.getItem('fifeOrders') || '[]').length;
  ['ordersBadge','navOrdersBadge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = n > 0 ? n : '';
  });
}

function updateCount() {
  const n = products.length;
  if (productCountEl) productCountEl.textContent = `${n} product${n !== 1 ? 's' : ''}`;
  if (manageCountEl)  manageCountEl.textContent  = `${n} product${n !== 1 ? 's' : ''}`;
}

function showToast(msg) {
  const toast = document.getElementById('adminToast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDi8fwHOwvT_BHZTyBXSDCmh9QWaAd5298",
  authDomain: "fife-beauty-hub-f2d2b.firebaseapp.com",
  projectId: "fife-beauty-hub-f2d2b",
  storageBucket: "fife-beauty-hub-f2d2b.firebasestorage.app",
  messagingSenderId: "392678495728",
  appId: "1:392678495728:web:1b5f05d3217bf3ae6df935"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
