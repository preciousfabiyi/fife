/* ============================================
   FIFE BEAUTY HUB — Admin JS
   Features: Login gate, image file upload,
             tab navigation, delete with confirm
============================================ */

/* ===== CREDENTIALS (change these) ===== */
const ADMIN_USER = 'fifeadmin';
const ADMIN_PASS = 'fife2026';

/* ===== STATE ===== */
let products        = JSON.parse(localStorage.getItem('fifeProducts') || '[]');
let pendingDeleteIdx = null;
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
  renderProducts();
  updateCount();
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
      renderProducts();
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
productForm.addEventListener('submit', e => {
  e.preventDefault();

  const name     = document.getElementById('productName').value.trim();
  const price    = document.getElementById('productPrice').value.trim();
  const category = document.getElementById('productCategory').value;

  if (!name || !price) { showToast('Please fill in all required fields.'); return; }
  if (!imageBase64)    { showToast('Please upload a product image.');     return; }

  products.unshift({ name, price: Number(price), image: imageBase64, category: category || 'General' });
  saveProducts();
  updateCount();

  // Reset form
  productForm.reset();
  imageBase64 = null;
  previewImg.src = '';
  imagePreviewEl.classList.add('hidden');
  uploadPlaceholder.classList.remove('hidden');

  showToast(`"${name}" added successfully!`);
});

/* ===== RENDER PRODUCTS ===== */
function renderProducts(filter = '') {
  const filtered = filter
    ? products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || (p.category||'').toLowerCase().includes(filter.toLowerCase()))
    : products;

  const n = filtered.length;
  if (manageCountEl) manageCountEl.textContent = `${n} product${n !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    adminProductsEl.innerHTML = `<p class="empty-msg">${filter ? 'No products match your search.' : 'No products uploaded yet.'}</p>`;
    return;
  }

  adminProductsEl.innerHTML = filtered.map((p, idx) => {
    const realIdx = products.indexOf(p);
    return `
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
          <button class="btn-delete-product" data-idx="${realIdx}" aria-label="Delete ${p.name}">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </div>
      </div>
    `;
  }).join('');

  adminProductsEl.querySelectorAll('.btn-delete-product').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteIdx = parseInt(btn.dataset.idx);
      delProductName.textContent = `"${products[pendingDeleteIdx].name}" will be permanently removed.`;
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
  pendingDeleteIdx = null;
});
deleteModal.querySelector('.del-backdrop').addEventListener('click', () => {
  deleteModal.classList.add('hidden');
  pendingDeleteIdx = null;
});
delConfirm.addEventListener('click', () => {
  if (pendingDeleteIdx === null) return;
  const name = products[pendingDeleteIdx].name;
  products.splice(pendingDeleteIdx, 1);
  saveProducts();
  updateCount();
  renderProducts(searchInput ? searchInput.value : '');
  deleteModal.classList.add('hidden');
  pendingDeleteIdx = null;
  showToast(`"${name}" deleted.`);
});

/* ===== HELPERS ===== */
function saveProducts() {
  try {
    localStorage.setItem('fifeProducts', JSON.stringify(products));
  } catch (e) {
    showToast('Storage full — some images may not save. Try smaller images.');
  }
}

function updateCount() {
  const n = products.length;
  if (productCountEl) productCountEl.textContent = `${n} product${n !== 1 ? 's' : ''}`;
}

function showToast(msg) {
  const toast = document.getElementById('adminToast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}
