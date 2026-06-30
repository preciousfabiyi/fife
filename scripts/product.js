/* ============================================================
   FIFE BEAUTY HUB — Products Loader (Firebase Firestore)
   All products are fetched directly from Firestore.
   This file is used by both index.html and product.html.
============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase Config ──────────────────────────────────────────
// Replace these values with your actual Firebase project config
const firebaseConfig = {
 apiKey: "AIzaSyAk9_7mqgi22VUznizgg569SNzuoiplfKE",
  authDomain: "fife-beauty-hub-b41de.firebaseapp.com",
  projectId: "fife-beauty-hub-b41de",
  storageBucket: "fife-beauty-hub-b41de.firebasestorage.app",
  messagingSenderId: "688954759472",
  appId: "1:688954759472:web:02d0c84dbab6b4a4f810f5"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Shared Cart State ────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('fifeCart') || '[]');

function saveCart() {
  localStorage.setItem('fifeCart', JSON.stringify(cart));
}

function updateCartUI() {
  const badge    = document.getElementById('cartBadge');
  const total    = document.getElementById('cartTotal');
  const itemsEl  = document.getElementById('cartItems');
  const count    = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  if (badge) badge.textContent = count;
  if (total) total.textContent = subtotal.toLocaleString();

  if (!itemsEl) return;
  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
    return;
  }
  itemsEl.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <img src="${item.image || 'https://placehold.co/60x60?text=No+Img'}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-info">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">₦${Number(item.price).toLocaleString()} × ${item.qty}</p>
      </div>
      <button class="cart-remove" data-i="${i}" aria-label="Remove">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');

  itemsEl.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(parseInt(btn.dataset.i), 1);
      saveCart();
      updateCartUI();
    });
  });
}

function addToCart(name, price, image, category) {
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, price: Number(price), image, category, qty: 1 });
  }
  saveCart();
  updateCartUI();
  showToast(`"${name}" added to cart ✓`);
}

// ── Save Order to Firestore ──────────────────────────────────
async function placeOrder() {
  if (cart.length === 0) { showToast('Your cart is empty.'); return; }
  try {
    await addDoc(collection(db, 'orders'), {
      items:     cart,
      total:     cart.reduce((s, i) => s + i.price * i.qty, 0),
      status:    'pending',
      createdAt: serverTimestamp()
    });
    cart = [];
    saveCart();
    updateCartUI();
    showToast('Order placed! We\'ll be in touch soon 🌸');
  } catch (err) {
    console.error(err);
    showToast('Could not place order. Please try again.');
  }
}

// ── Fetch Products from Firestore ────────────────────────────
async function fetchProducts() {
  const q    = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ── Render: Featured (index.html — max 6) ───────────────────
async function renderFeaturedProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-shimmer"><div class="shimmer-card"></div><div class="shimmer-card"></div><div class="shimmer-card"></div></div>';

  try {
    const products = (await fetchProducts()).slice(0, 6);

    if (products.length === 0) {
      grid.innerHTML = '<p class="empty-msg">No products available yet.</p>';
      return;
    }

    grid.innerHTML = products.map(p => buildProductCard(p)).join('');
    attachCartButtons(grid, products);
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p class="empty-msg">Failed to load products.</p>';
  }
}

// ── Render: Full Catalog (product.html) ─────────────────────
const PAGE_SIZE = 9;
let allProducts = [];
let filtered    = [];
let currentPage = 1;
let activeFilter = 'All';
let sortMode    = 'newest';
let searchTerm  = '';

async function renderFullCatalog() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-shimmer"><div class="shimmer-card"></div><div class="shimmer-card"></div><div class="shimmer-card"></div></div>';

  try {
    allProducts = await fetchProducts();
    applyFilters();
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p class="empty-msg">Failed to load products.</p>';
  }

  // Filter buttons
  document.getElementById('filterBtns')?.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.cat;
      currentPage  = 1;
      applyFilters();
    });
  });

  // Sort
  document.getElementById('productSort')?.addEventListener('change', e => {
    sortMode    = e.target.value;
    currentPage = 1;
    applyFilters();
  });

  // Search
  document.getElementById('productSearch')?.addEventListener('input', e => {
    searchTerm  = e.target.value.toLowerCase();
    currentPage = 1;
    applyFilters();
  });
}

function applyFilters() {
  filtered = allProducts
    .filter(p => activeFilter === 'All' || p.category === activeFilter)
    .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm));

  if (sortMode === 'price-asc')  filtered.sort((a, b) => Number(a.price) - Number(b.price));
  if (sortMode === 'price-desc') filtered.sort((a, b) => Number(b.price) - Number(a.price));
  if (sortMode === 'name-asc')   filtered.sort((a, b) => a.name.localeCompare(b.name));

  renderPage();
}

function renderPage() {
  const grid      = document.getElementById('productGrid');
  const countEl   = document.getElementById('productResultCount');
  const pagEl     = document.getElementById('productPagination');
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const slice     = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (countEl) countEl.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`;

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="empty-msg">No products match your search.</p>';
    if (pagEl) pagEl.innerHTML = '';
    return;
  }

  grid.innerHTML = slice.map(p => buildProductCard(p)).join('');
  attachCartButtons(grid, slice);

  // Pagination
  if (pagEl) {
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    pagEl.innerHTML = html;
    pagEl.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        renderPage();
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }
}

// ── Product Card HTML ────────────────────────────────────────
function buildProductCard(p) {
  const img = p.image || 'https://placehold.co/400x300?text=No+Image';
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-image">
        <img src="${img}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/400x300?text=No+Image'">
        <div class="product-badge">${p.category || 'Beauty'}</div>
        <div class="product-overlay">
          <button class="btn-quick-add add-cart"
            data-name="${p.name}"
            data-price="${p.price}"
            data-image="${img}"
            data-cat="${p.category || ''}">
            Quick Add
          </button>
        </div>
      </div>
      <div class="product-info">
        <h3>${p.name}</h3>
        ${p.description ? `<p class="product-desc">${p.description}</p>` : ''}
        <p class="product-price">₦${Number(p.price).toLocaleString()}</p>
        <button class="btn btn-primary add-cart"
          data-name="${p.name}"
          data-price="${p.price}"
          data-image="${img}"
          data-cat="${p.category || ''}">
          Add To Cart
        </button>
      </div>
    </div>
  `;
}

function attachCartButtons(container, products) {
  container.querySelectorAll('.add-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.name, btn.dataset.price, btn.dataset.image, btn.dataset.cat);
    });
  });
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Cart Sidebar Wiring ──────────────────────────────────────
function initCart() {
  const sidebar  = document.getElementById('cartSidebar');
  const overlay  = document.getElementById('cartOverlay');
  const close    = document.getElementById('closeCart');
  const triggers = document.querySelectorAll('.cart-trigger');
  const checkout = document.querySelector('.checkout-btn');

  triggers.forEach(t => t.addEventListener('click', () => {
    sidebar?.classList.add('open');
    overlay?.classList.add('open');
  }));

  [close, overlay].forEach(el => el?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
  }));

  checkout?.addEventListener('click', placeOrder);

  updateCartUI();
}

// ── Mobile Menu ──────────────────────────────────────────────
function initMobileMenu() {
  const toggle = document.getElementById('menuToggle');
  const menu   = document.getElementById('mobileMenu');
  toggle?.addEventListener('click', () => menu?.classList.toggle('open'));
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));
}

// ── Header Scroll ────────────────────────────────────────────
function initHeaderScroll() {
  window.addEventListener('scroll', () => {
    document.getElementById('header')?.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ── Auto-init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCart();
  initMobileMenu();
  initHeaderScroll();

  if (document.getElementById('productGrid')) {
    // product.html has toolbar → full catalog
    const hasToolbar = !!document.getElementById('productSort');
    hasToolbar ? renderFullCatalog() : renderFeaturedProducts();
  }
});

export { db, fetchProducts, addToCart, showToast };
