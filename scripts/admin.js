/* ============================================
   FIFE BEAUTY HUB — Admin JS
   Features: Login gate, image file upload,
             tab navigation, delete with confirm
============================================ */

/* ===== CREDENTIALS ===== */
const ADMIN_USER = 'Fife';
const ADMIN_PASS = 'Fife1234';

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
  updateOrdersBadge();
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
  });
});

/* ===== ORDERS ===== */
function renderOrders() {
  const ordersList = document.getElementById('ordersList');
  const orders     = JSON.parse(localStorage.getItem('fifeOrders') || '[]');

  // Update badge
  const badge = document.getElementById('ordersBadge');
  if (badge) badge.textContent = orders.length > 0 ? orders.length : '';

  if (orders.length === 0) {
    ordersList.innerHTML = '<p class="empty-msg">No orders received yet.</p>';
    return;
  }

  ordersList.innerHTML = orders.map((o, idx) => `
    <div class="order-card" id="order-${idx}">
      <div class="order-header">
        <div class="order-ref-wrap">
          <span class="order-ref">${o.ref}</span>
          <span class="order-status status-${(o.status||'Pending').toLowerCase()}">${o.status || 'Pending'}</span>
        </div>
        <span class="order-date">${o.date}</span>
      </div>

      <div class="order-body">
        <div class="order-details">
          <div class="order-info-row"><i class="fa-solid fa-user"></i> <span>${o.name}</span></div>
          <div class="order-info-row"><i class="fa-solid fa-phone"></i> <span>${o.phone}</span></div>
          <div class="order-info-row"><i class="fa-solid fa-location-dot"></i> <span>${o.address}</span></div>
          <div class="order-info-row"><i class="fa-solid fa-credit-card"></i> <span>${o.payment}</span></div>

          <div class="order-items">
            ${o.items.map(i => `
              <div class="order-item-row">
                <span>${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}</span>
                <span>₦${i.price * i.qty}</span>
              </div>`).join('')}
            <div class="order-item-row total-row">
              <span>Total</span>
              <strong>₦${o.total}</strong>
            </div>
          </div>
        </div>

        <div class="order-proof-wrap">
          <p class="order-proof-label">Payment Screenshot</p>
          ${o.proof && o.proof.startsWith('data:image')
            ? `<img src="${o.proof}" class="order-proof-img" alt="Payment proof" onclick="openProofViewer('${idx}')">`
            : `<div class="order-no-proof"><i class="fa-solid fa-image-slash"></i><span>No screenshot</span></div>`
          }
        </div>
      </div>

      <div class="order-actions">
        <button class="order-btn btn-confirm" data-idx="${idx}" ${o.status==='Confirmed'?'disabled':''}>
          <i class="fa-solid fa-check"></i> Confirm
        </button>
        <button class="order-btn btn-reject" data-idx="${idx}" ${o.status==='Rejected'?'disabled':''}>
          <i class="fa-solid fa-xmark"></i> Reject
        </button>
      </div>
    </div>
  `).join('');

  // Status buttons
  ordersList.querySelectorAll('.btn-confirm').forEach(btn => {
    btn.addEventListener('click', () => updateOrderStatus(parseInt(btn.dataset.idx), 'Confirmed'));
  });
  ordersList.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', () => updateOrderStatus(parseInt(btn.dataset.idx), 'Rejected'));
  });
}

function updateOrderStatus(idx, status) {
  const orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
  if (!orders[idx]) return;
  orders[idx].status = status;
  localStorage.setItem('fifeOrders', JSON.stringify(orders));
  renderOrders();
  showToast(`Order ${orders[idx].ref} marked as ${status}.`);
}

// Full-screen proof image viewer
window.openProofViewer = function(idx) {
  const orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
  const o = orders[idx];
  if (!o || !o.proof) return;
  document.getElementById('proofViewerModal')?.remove();
  const viewer = document.createElement('div');
  viewer.id = 'proofViewerModal';
  viewer.innerHTML = `
    <div class="proof-viewer-backdrop"></div>
    <div class="proof-viewer-inner">
      <button class="proof-viewer-close"><i class="fa-solid fa-xmark"></i></button>
      <img src="${o.proof}" alt="Payment proof">
      <p>${o.name} · ${o.ref}</p>
    </div>
  `;
  document.body.appendChild(viewer);
  viewer.querySelector('.proof-viewer-backdrop').addEventListener('click', () => viewer.remove());
  viewer.querySelector('.proof-viewer-close').addEventListener('click', () => viewer.remove());
};

// Update orders badge on load
function updateOrdersBadge() {
  const orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
  const badge  = document.getElementById('ordersBadge');
  if (badge) badge.textContent = orders.length > 0 ? orders.length : '';
}


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
  if (file.size > 15 * 1024 * 1024) {
    showToast('Image must be under 15MB.');
    return;
  }

  // Show loading state
  uploadPlaceholder.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    <p>Compressing image…</p>
    <span>This only takes a second</span>
  `;

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      // Compress: max 800px wide/tall, 75% quality JPEG
      const MAX = 800;
      let { width, height } = img;
      if (width > height && width > MAX) {
        height = Math.round((height * MAX) / width);
        width  = MAX;
      } else if (height > MAX) {
        width  = Math.round((width * MAX) / height);
        height = MAX;
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      imageBase64 = canvas.toDataURL('image/jpeg', 0.75);

      // Show size saved
      const originalKB  = Math.round(file.size / 1024);
      const compressedKB = Math.round((imageBase64.length * 0.75) / 1024);
      const saving = originalKB > compressedKB
        ? ` (saved ~${originalKB - compressedKB}KB)`
        : '';

      previewImg.src = imageBase64;
      uploadPlaceholder.classList.add('hidden');
      imagePreviewEl.classList.remove('hidden');

      // Restore placeholder HTML for next use
      uploadPlaceholder.innerHTML = `
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <p>Click or drag &amp; drop to upload image</p>
        <span>PNG, JPG, WEBP — max 15MB</span>
      `;

      showToast(`Image ready${saving} ✓`);
    };
    img.src = e.target.result;
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
