// FIFE BEAUTY HUB - Admin JS (clean version)

var ADMIN_USER = 'Fife';
var ADMIN_PASS = 'Fife1234';

/* ============================================
   FIFE BEAUTY HUB — Admin JS
============================================ */

const productForm    = document.getElementById('productForm');
const adminProducts  = document.getElementById('adminProducts');
const productCountEl = document.getElementById('productCount');

let products = JSON.parse(localStorage.getItem('fifeProducts') || '[]');

function saveProducts() {
  localStorage.setItem('fifeProducts', JSON.stringify(products));
}

function updateCount() {
  const n = products.length;
  productCountEl.textContent = `${n} product${n !== 1 ? 's' : ''}`;
}

function renderProducts() {
  updateCount();
  if (products.length === 0) {
    adminProducts.innerHTML = '<p class="empty-msg">No products uploaded yet.</p>';
    return;
  }
  adminProducts.innerHTML = products.map((p, idx) => `
    <div class="admin-product">
      <img src="${p.image}" alt="${p.name}" onerror="this.src='https://placehold.co/400x300?text=No+Image'">
      <div class="admin-product-info">
        <h3>${p.name}</h3>
        <p class="price">₦${p.price}</p>
        <p class="category">${p.category || 'General'}</p>
      </div>
      <button class="admin-delete" data-idx="${idx}" aria-label="Delete product">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join('');

  adminProducts.querySelectorAll('.admin-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      products.splice(idx, 1);
      saveProducts();
      renderProducts();
      showToast('Product removed.');
    });
  });
}

productForm.addEventListener('submit', e => {
  e.preventDefault();

  const name     = document.getElementById('productName').value.trim();
  const price    = document.getElementById('productPrice').value.trim();
  const image    = document.getElementById('productImage').value.trim();
  const category = document.getElementById('productCategory').value;

  if (!name || !price || !image) {
    showToast('Please fill in all required fields.');
    return;
  }

  products.unshift({ name, price, image, category });
  saveProducts();
  renderProducts();
  productForm.reset();
  showToast(`"${name}" added successfully!`);
});

function showToast(msg) {
  const toast = document.getElementById('adminToast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Init
renderProducts();
