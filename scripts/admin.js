/* ============================================
   FIFE BEAUTY HUB — Admin JS
   Features: Login gate, image file upload,
             tab navigation, delete with confirm
============================================ */

/* ===== FIREBASE CONFIG ===== */
// Must match the config in main.js exactly
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

/* ===== CREDENTIALS (change these) ===== */
const ADMIN_USER = 'fifeadmin';
const ADMIN_PASS = 'fife2026';

/* ===== FIREBASE STATE ===== */
let db          = null;
let fbApp       = null;
let fbProducts  = []; // local cache of Firestore docs {id, ...data}

/* ===== Init Firebase ===== */
async function initFirebase() {
  const { initializeApp }    = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
  const { getFirestore }     = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  fbApp = initializeApp(FIREBASE_CONFIG);
  db    = getFirestore(fbApp);
}

/* ===== STATE ===== */
let pendingDeleteId  = null;
let imageBase64      = null;

/* ===== ELEMENTS ===== */
const loginScreen     = document.getElementById('loginScreen');
const adminDashboard  = document.getElementById('adminDashboard');
const loginBtn        = document.getElementById('loginBtn');
const logoutBtn       = document.getElementById('logoutBtn');
const loginError      = document.getElementById('loginError');
const togglePass      = document.getElementById('togglePass');
const productForm     = document.getElementById('productForm');
const adminProductsEl = document.getElementById('adminProducts');
const productCountEl  = document.getElementById('productCount');
const manageCountEl   = document.getElementById('manageCount');
const uploadZone      = document.getElementById('uploadZone');
const productImageInput = document.getElementById('productImage');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreviewEl  = document.getElementById('imagePreview');
const previewImg      = document.getElementById('previewImg');
const removeImgBtn    = document.getElementById('removeImg');
const searchInput     = document.getElementById('searchProducts');
const deleteModal     = document.getElementById('deleteModal');
const delProductName  = document.getElementById('delProductName');
const delCancel       = document.getElementById('delCancel');
const delConfirm      = document.getElementById('delConfirm');

/* ===== LOGIN ===== */
// Check session
if (sessionStorage.getItem('fifeAdminLoggedIn') === 'true') {
  showDashboard();
}

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

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('fifeAdminLoggedIn');
  adminDashboard.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
});

/* ===== MOBILE SIDEBAR TOGGLE ===== */
const sidebarToggle  = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const adminSidebar   = document.querySelector('.admin-sidebar');

function openSidebar() {
  adminSidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  adminSidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

sidebarToggle.addEventListener('click', () => {
  adminSidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
sidebarOverlay.addEventListener('click', closeSidebar);

// Close sidebar when a nav link is tapped on mobile
document.querySelectorAll('.sidebar-nav a[data-tab]').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth < 900) closeSidebar();
  });
});

togglePass.addEventListener('click', () => {
  const passInput = document.getElementById('loginPass');
  const isText = passInput.type === 'text';
  passInput.type = isText ? 'password' : 'text';
  togglePass.querySelector('i').className = isText ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
});

function showDashboard() {
  loginScreen.classList.add('hidden');
  adminDashboard.classList.remove('hidden');
  initFirebase().then(() => {
    loadProducts();
    updateCount();
  });
}

/* ===== TABS ===== */
document.querySelectorAll('.sidebar-nav a[data-tab]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const tab = link.dataset.tab;

    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    link.classList.add('active');

    document.getElementById('tabAddProduct').classList.add('hidden');
    document.getElementById('tabManageProducts').classList.add('hidden');

    if (tab === 'addProduct') {
      document.getElementById('tabAddProduct').classList.remove('hidden');
      document.getElementById('tabTitle').textContent = 'Add Product';
    } else {
      document.getElementById('tabManageProducts').classList.remove('hidden');
      document.getElementById('tabTitle').textContent = 'Manage Products';
      loadProducts();
    }
  });
});

/* ===== IMAGE UPLOAD ===== */
uploadZone.addEventListener('click', () => productImageInput.click());

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleImageFile(file);
});

productImageInput.addEventListener('change', () => {
  if (productImageInput.files[0]) handleImageFile(productImageInput.files[0]);
});

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file.');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image must be under 5MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    imageBase64 = e.target.result;
    previewImg.src = imageBase64;
    uploadPlaceholder.classList.add('hidden');
    imagePreviewEl.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

removeImgBtn.addEventListener('click', e => {
  e.stopPropagation();
  imageBase64 = null;
  productImageInput.value = '';
  previewImg.src = '';
  imagePreviewEl.classList.add('hidden');
  uploadPlaceholder.classList.remove('hidden');
});

/* ===== ADD PRODUCT ===== */
productForm.addEventListener('submit', async e => {
  e.preventDefault();

  const name     = document.getElementById('productName').value.trim();
  const price    = document.getElementById('productPrice').value.trim();
  const category = document.getElementById('productCategory').value;

  if (!name || !price) { showToast('Please fill in all required fields.'); return; }
  if (!imageBase64)    { showToast('Please upload a product image.');     return; }

  const submitBtn = productForm.querySelector('.btn-upload');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading…';

  try {
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await addDoc(collection(db, 'products'), {
      name,
      price: Number(price),
      image: imageBase64,
      category: category || 'General',
      createdAt: serverTimestamp()
    });

    // Reset form
    productForm.reset();
    imageBase64 = null;
    previewImg.src = '';
    imagePreviewEl.classList.add('hidden');
    uploadPlaceholder.classList.remove('hidden');

    showToast(`"${name}" added successfully!`);
    loadProducts();

  } catch (err) {
    console.error(err);
    showToast('Upload failed. Check your Firebase config.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Product';
  }
});

/* ===== LOAD & RENDER PRODUCTS FROM FIRESTORE ===== */
async function loadProducts(filter = '') {
  adminProductsEl.innerHTML = '<p class="empty-msg">Loading…</p>';

  try {
    const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q        = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    fbProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProducts(filter);
    updateCount();
  } catch (err) {
    console.error(err);
    adminProductsEl.innerHTML = '<p class="empty-msg" style="color:#c0392b;">Failed to load products. Check Firebase config.</p>';
  }
}

function renderProducts(filter = '') {
  const filtered = filter
    ? fbProducts.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || (p.category||'').toLowerCase().includes(filter.toLowerCase()))
    : fbProducts;

  const n = filtered.length;
  if (manageCountEl) manageCountEl.textContent = `${n} product${n !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    adminProductsEl.innerHTML = `<p class="empty-msg">${filter ? 'No products match your search.' : 'No products uploaded yet.'}</p>`;
    return;
  }

  adminProductsEl.innerHTML = filtered.map(p => `
    <div class="admin-product">
      <div class="admin-product-img-wrap">
        <img src="${p.image}" alt="${p.name}" onerror="this.src='https://placehold.co/400x300?text=No+Image'">
        <span class="product-category-badge">${p.category || 'General'}</span>
      </div>
      <div class="admin-product-info">
        <h3>${p.name}</h3>
        <p class="price">&#8358;${p.price}</p>
      </div>
      <div class="admin-product-actions">
        <button class="btn-delete-product" data-id="${p.id}" aria-label="Delete ${p.name}">
          <i class="fa-solid fa-trash-can"></i> Delete
        </button>
      </div>
    </div>
  `).join('');

  adminProductsEl.querySelectorAll('.btn-delete-product').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteId = btn.dataset.id;
      const product = fbProducts.find(p => p.id === pendingDeleteId);
      delProductName.textContent = `"${product?.name}" will be permanently removed.`;
      deleteModal.classList.remove('hidden');
    });
  });
}

/* ===== SEARCH ===== */
if (searchInput) {
  searchInput.addEventListener('input', () => renderProducts(searchInput.value));
}

/* ===== DELETE CONFIRM MODAL ===== */
delCancel.addEventListener('click', () => {
  deleteModal.classList.add('hidden');
  pendingDeleteId = null;
});
deleteModal.querySelector('.del-backdrop').addEventListener('click', () => {
  deleteModal.classList.add('hidden');
  pendingDeleteId = null;
});
delConfirm.addEventListener('click', async () => {
  if (!pendingDeleteId) return;

  const product = fbProducts.find(p => p.id === pendingDeleteId);
  const name    = product?.name || 'Product';

  try {
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await deleteDoc(doc(db, 'products', pendingDeleteId));
    showToast(`"${name}" deleted.`);
    deleteModal.classList.add('hidden');
    pendingDeleteId = null;
    loadProducts(searchInput ? searchInput.value : '');
  } catch (err) {
    console.error(err);
    showToast('Delete failed. Please try again.');
  }
});

/* ===== HELPERS ===== */
function updateCount() {
  const n = fbProducts.length;
  if (productCountEl) productCountEl.textContent = `${n} product${n !== 1 ? 's' : ''}`;
}

function showToast(msg) {
  const toast = document.getElementById('adminToast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}
