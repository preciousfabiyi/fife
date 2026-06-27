/* ============================================
   FIFE BEAUTY HUB & SPA — Main JS
============================================ */

/* ===== HEADER SCROLL EFFECT ===== */
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 50);
});

/* ===== MOBILE MENU ===== */
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');

menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('active');
  mobileMenu.classList.toggle('open');
  document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
});

mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    menuToggle.classList.remove('active');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});

/* ===== CART ===== */
const cartSidebar   = document.getElementById('cartSidebar');
const cartOverlay   = document.getElementById('cartOverlay');
const closeCartBtn  = document.getElementById('closeCart');
const cartItemsEl   = document.getElementById('cartItems');
const cartTotalEl   = document.getElementById('cartTotal');
const cartBadge     = document.getElementById('cartBadge');

let cart = [];

function openCart() {
  cartSidebar.classList.add('active');
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  cartSidebar.classList.remove('active');
  cartOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

document.querySelectorAll('.cart-trigger').forEach(btn => {
  btn.addEventListener('click', openCart);
});
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

function renderCart() {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  cartTotalEl.textContent = total;
  cartBadge.textContent = cart.reduce((sum, i) => sum + i.qty, 0);
  cartBadge.setAttribute('data-count', cart.length === 0 ? '0' : '1');

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
    return;
  }

  cartItemsEl.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <p>${item.name} ${item.qty > 1 ? `<small>×${item.qty}</small>` : ''}</p>
      <span>₦${item.price * item.qty}</span>
      <button class="cart-item-remove" data-idx="${idx}" aria-label="Remove item">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');

  cartItemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      cart.splice(idx, 1);
      renderCart();
    });
  });
}

function addToCart(name, price) {
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, price: Number(price), qty: 1 });
  }
  renderCart();
  showToast(`${name} added to cart ✓`);
}

document.querySelectorAll('.add-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const name  = btn.dataset.name;
    const price = btn.dataset.price;
    addToCart(name, price);
  });
});

/* ===== STAR RATING ===== */
const stars       = document.querySelectorAll('#starRating i');
const starsInput  = document.getElementById('reviewStars');
let currentRating = 0;

stars.forEach(star => {
  star.addEventListener('mouseenter', () => {
    const val = parseInt(star.dataset.val);
    stars.forEach((s, i) => {
      s.classList.toggle('active', i < val);
      s.classList.toggle('fa-solid', i < val);
      s.classList.toggle('fa-regular', i >= val);
    });
  });
  star.addEventListener('mouseleave', () => {
    stars.forEach((s, i) => {
      s.classList.toggle('active', i < currentRating);
      s.classList.toggle('fa-solid', i < currentRating);
      s.classList.toggle('fa-regular', i >= currentRating);
    });
  });
  star.addEventListener('click', () => {
    currentRating = parseInt(star.dataset.val);
    starsInput.value = currentRating;
  });
});

/* ===== REVIEW FORM ===== */
const reviewForm = document.getElementById('reviewForm');
const reviewList = document.getElementById('reviewList');

reviewForm.addEventListener('submit', e => {
  e.preventDefault();
  const name  = document.getElementById('reviewName').value.trim();
  const text  = document.getElementById('reviewText').value.trim();
  const rating = parseInt(starsInput.value) || 5;

  if (!name || !text) return;

  const starsHtml = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const initial   = name.charAt(0).toUpperCase();

  const card = document.createElement('div');
  card.classList.add('review-card');
  card.innerHTML = `
    <div class="review-top">
      <div class="review-avatar">${initial}</div>
      <div>
        <strong>${escapeHtml(name)}</strong>
        <div class="stars">${starsHtml}</div>
      </div>
    </div>
    <p>${escapeHtml(text)}</p>
  `;

  // Insert at top
  reviewList.insertBefore(card, reviewList.firstChild);

  reviewForm.reset();
  currentRating = 0;
  stars.forEach(s => { s.classList.remove('active'); s.classList.add('fa-regular'); s.classList.remove('fa-solid'); });
  starsInput.value = 0;

  showToast('Review submitted — thank you!');
});

/* ===== APPOINTMENT FORM ===== */
const appointmentForm = document.getElementById('appointmentForm');
if (appointmentForm) {
  appointmentForm.addEventListener('submit', e => {
    e.preventDefault();
    showToast('Appointment request sent! We\'ll confirm shortly.');
    appointmentForm.reset();
  });
}

/* ===== TOAST ===== */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ===== UTILITY ===== */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

/* ===== SCROLL REVEAL (lightweight) ===== */
const revealEls = document.querySelectorAll(
  '.service-card, .product-card, .review-card, .contact-card'
);
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(28px)';
  el.style.transition = `opacity .5s ease ${i * 0.07}s, transform .5s ease ${i * 0.07}s, box-shadow .35s ease, transform .35s ease`;
  revealObserver.observe(el);
});
