/* ============================================
   FIFE BEAUTY HUB & SPA — Main JS
============================================ */

/* ===== PAYMENT & NOTIFICATION CONFIG ===== */
const BANK_NAME    = 'Moniepoint';
const ACCOUNT_NO   = '6442284424';
const ACCOUNT_NAME = 'Fifesbeauty Limited';
const ADMIN_EMAIL  = 'victoriaayomide32@gmail.com';

// EmailJS config — sign up free at emailjs.com, fill in your IDs
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';

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
const cartSidebar  = document.getElementById('cartSidebar');
const cartOverlay  = document.getElementById('cartOverlay');
const closeCartBtn = document.getElementById('closeCart');
const cartItemsEl  = document.getElementById('cartItems');
const cartTotalEl  = document.getElementById('cartTotal');
const cartBadge    = document.getElementById('cartBadge');

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

document.querySelectorAll('.cart-trigger').forEach(btn => btn.addEventListener('click', openCart));
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

function renderCart() {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  cartTotalEl.textContent = total;
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  cartBadge.textContent = count;
  cartBadge.setAttribute('data-count', cart.length === 0 ? '0' : '1');

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
    return;
  }
  cartItemsEl.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <p>${item.name}${item.qty > 1 ? ` <small>×${item.qty}</small>` : ''}</p>
      <span>₦${item.price * item.qty}</span>
      <button class="cart-item-remove" data-idx="${idx}" aria-label="Remove item">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');

  cartItemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(parseInt(btn.dataset.idx), 1);
      renderCart();
    });
  });
}

function addToCart(name, price) {
  const existing = cart.find(i => i.name === name);
  if (existing) existing.qty++;
  else cart.push({ name, price: Number(price), qty: 1 });
  renderCart();
  showToast(`${name} added to cart ✓`);
}

/* ===== LOAD PRODUCTS FROM ADMIN ===== */
function loadProducts() {
  const grid     = document.getElementById('productGrid');
  const products = JSON.parse(localStorage.getItem('fifeProducts') || '[]');

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="no-products-msg">
        <i class="fa-solid fa-box-open"></i>
        <p>No products yet. Check back soon!</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="product-image">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <div class="product-overlay">
          <button class="btn-quick-add add-cart" data-name="${p.name}" data-price="${p.price}">Quick Add</button>
        </div>
      </div>
      <div class="product-info">
        ${p.category ? `<span class="product-category">${p.category}</span>` : ''}
        <h3>${p.name}</h3>
        <p class="product-price">₦${p.price}</p>
        <button class="btn btn-primary add-cart" data-name="${p.name}" data-price="${p.price}">Add To Cart</button>
      </div>
    </div>
  `).join('');

  // Attach cart listeners to newly rendered buttons
  grid.querySelectorAll('.add-cart').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.name, btn.dataset.price));
  });

  // Re-run scroll reveal on new cards
  grid.querySelectorAll('.product-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px)';
    el.style.transition = `opacity .5s ease ${i * 0.07}s, transform .5s ease ${i * 0.07}s, box-shadow .35s ease`;
    revealObserver.observe(el);
  });
}



/* ===== STAR RATING ===== */
const stars      = document.querySelectorAll('#starRating i');
const starsInput = document.getElementById('reviewStars');
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
  const name   = document.getElementById('reviewName').value.trim();
  const text   = document.getElementById('reviewText').value.trim();
  const rating = parseInt(starsInput.value) || 5;
  if (!name || !text) return;

  const card = document.createElement('div');
  card.classList.add('review-card');
  card.innerHTML = `
    <div class="review-top">
      <div class="review-avatar">${name.charAt(0).toUpperCase()}</div>
      <div>
        <strong>${escapeHtml(name)}</strong>
        <div class="stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
      </div>
    </div>
    <p>${escapeHtml(text)}</p>
  `;
  reviewList.insertBefore(card, reviewList.firstChild);
  reviewForm.reset();
  currentRating = 0;
  stars.forEach(s => { s.classList.remove('active','fa-solid'); s.classList.add('fa-regular'); });
  starsInput.value = 0;
  showToast('Review submitted — thank you!');
});

/* ===== APPOINTMENT FORM ===== */
const appointmentForm = document.getElementById('appointmentForm');
if (appointmentForm) {
  appointmentForm.addEventListener('submit', e => {
    e.preventDefault();
    showToast("Appointment request sent! We'll confirm shortly.");
    appointmentForm.reset();
  });
}

/* ===== CHECKOUT ===== */
const checkoutBtn = document.querySelector('.checkout-btn');
checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) { showToast('Your cart is empty!'); return; }
  openCheckoutModal();
});

function openCheckoutModal() {
  document.getElementById('checkoutModal')?.remove();

  const total    = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const orderRef = 'FBH-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const modal = document.createElement('div');
  modal.id = 'checkoutModal';
  modal.innerHTML = `
    <div class="co-backdrop"></div>
    <div class="co-box">
      <button class="co-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>

      <!-- STEP 1: Customer Details -->
      <div class="co-step" id="coStep1">
        <h2 class="co-title">Your Details</h2>
        <ul class="co-items">
          ${cart.map(i => `
            <li>
              <span>${i.name}${i.qty > 1 ? ` <em>×${i.qty}</em>` : ''}</span>
              <span>₦${i.price * i.qty}</span>
            </li>`).join('')}
        </ul>
        <div class="co-total"><span>Total</span><strong>₦${total}</strong></div>
        <div class="co-form">
          <div class="co-field">
            <label>Full Name</label>
            <input type="text" id="coName" placeholder="e.g. Amara Johnson" required>
          </div>
          <div class="co-field">
            <label>Phone Number</label>
            <input type="tel" id="coPhone" placeholder="+234 800 000 0000" required>
          </div>
          <div class="co-field">
            <label>Delivery Address</label>
            <input type="text" id="coAddress" placeholder="Street, City" required>
          </div>
          <div class="co-field">
            <label>Payment Method</label>
            <select id="coPayment">
              <option value="transfer">Bank Transfer</option>
              <option value="cash">Cash on Delivery</option>
              <option value="pos">POS on Delivery</option>
            </select>
          </div>
        </div>
        <button class="co-confirm-btn" id="coNextBtn">Continue to Payment →</button>
      </div>

      <!-- STEP 2: Payment Details -->
      <div class="co-step co-hidden" id="coStep2">
        <h2 class="co-title">Payment Details</h2>
        <p class="co-pay-intro">Please transfer the exact amount to the account below, then click <strong>I've Paid</strong>.</p>

        <div class="co-bank-card">
          <div class="co-bank-row">
            <span class="co-bank-label">Bank</span>
            <span class="co-bank-value">${BANK_NAME}</span>
          </div>
          <div class="co-bank-row">
            <span class="co-bank-label">Account Name</span>
            <span class="co-bank-value">${ACCOUNT_NAME}</span>
          </div>
          <div class="co-bank-row highlight">
            <span class="co-bank-label">Account Number</span>
            <span class="co-bank-value acct-no">
              ${ACCOUNT_NO}
              <button class="co-copy-btn" data-copy="${ACCOUNT_NO}" title="Copy">
                <i class="fa-regular fa-copy"></i>
              </button>
            </span>
          </div>
          <div class="co-bank-row highlight">
            <span class="co-bank-label">Amount to Pay</span>
            <span class="co-bank-value amount-due">₦${total}</span>
          </div>
          <div class="co-bank-row">
            <span class="co-bank-label">Reference</span>
            <span class="co-bank-value ref-no">${orderRef}</span>
          </div>
        </div>

        <div class="co-field" style="margin-top:18px;">
          <label>Payment Proof (optional)</label>
          <input type="text" id="coProof" placeholder="e.g. transaction ID or screenshot description">
        </div>

        <button class="co-confirm-btn" id="coPaidBtn">
          <i class="fa-solid fa-check-circle"></i> I've Paid
        </button>
        <button class="co-back-btn" id="coBackBtn">← Back</button>
      </div>

      <!-- STEP 3: Confirmation -->
      <div class="co-step co-hidden" id="coStep3">
        <div class="co-success-icon"><i class="fa-solid fa-circle-check"></i></div>
        <h2 class="co-title">Order Confirmed!</h2>
        <p class="co-success-msg">
          Thank you! Your order has been received. We'll verify your payment and contact you shortly.
        </p>
        <div class="co-ref-box">
          <p class="co-ref-label">Order Reference</p>
          <p class="co-ref-val" id="coRefDisplay">${orderRef}</p>
        </div>
        <div class="co-contact-note">
          Questions? Call or WhatsApp: <strong>+234 916 502 8766</strong>
        </div>
        <button class="co-confirm-btn" id="coDoneBtn">Done</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.querySelector('.co-box').classList.add('co-open'));

  function closeModal() {
    modal.querySelector('.co-box').classList.remove('co-open');
    setTimeout(() => { modal.remove(); document.body.style.overflow = ''; }, 320);
  }
  modal.querySelector('.co-close').addEventListener('click', closeModal);
  modal.querySelector('.co-backdrop').addEventListener('click', closeModal);

  // Copy account number
  modal.querySelector('.co-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(ACCOUNT_NO).then(() => showToast('Account number copied!'));
  });

  // Step 1 → 2
  modal.querySelector('#coNextBtn').addEventListener('click', () => {
    const name    = document.getElementById('coName').value.trim();
    const phone   = document.getElementById('coPhone').value.trim();
    const address = document.getElementById('coAddress').value.trim();
    if (!name || !phone || !address) { showToast('Please fill in all fields.'); return; }
    document.getElementById('coStep1').classList.add('co-hidden');
    document.getElementById('coStep2').classList.remove('co-hidden');
  });

  // Step 2 → 1
  modal.querySelector('#coBackBtn').addEventListener('click', () => {
    document.getElementById('coStep2').classList.add('co-hidden');
    document.getElementById('coStep1').classList.remove('co-hidden');
  });

  // Step 2 → 3: Place order + notify admin
  modal.querySelector('#coPaidBtn').addEventListener('click', () => {
    const name    = document.getElementById('coName').value.trim();
    const phone   = document.getElementById('coPhone').value.trim();
    const address = document.getElementById('coAddress').value.trim();
    const payment = document.getElementById('coPayment').value;
    const proof   = document.getElementById('coProof')?.value.trim() || 'Not provided';

    const itemsList = cart.map(i =>
      `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''} — ₦${i.price * i.qty}`
    ).join('\n');

    // Save order to localStorage for admin
    const orders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
    orders.unshift({
      ref: orderRef,
      name, phone, address, payment, proof,
      items: cart.map(i => ({ ...i })),
      total,
      date: new Date().toLocaleString('en-NG'),
      status: 'Pending'
    });
    localStorage.setItem('fifeOrders', JSON.stringify(orders));

    // Send email notification via EmailJS
    sendAdminNotification({
      order_ref:    orderRef,
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      payment_method: payment,
      payment_proof: proof,
      items_list:   itemsList,
      order_total:  `₦${total}`,
      order_date:   new Date().toLocaleString('en-NG'),
      admin_email:  ADMIN_EMAIL,
    });

    // Show confirmation
    document.getElementById('coStep2').classList.add('co-hidden');
    document.getElementById('coStep3').classList.remove('co-hidden');

    // Clear cart
    cart = [];
    renderCart();
    closeCart();
  });

  modal.querySelector('#coDoneBtn').addEventListener('click', closeModal);
}

/* ===== EMAIL NOTIFICATION (EmailJS) ===== */
function sendAdminNotification(params) {
  // Load EmailJS SDK if not already loaded
  if (typeof emailjs === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.onload = () => {
      emailjs.init(EMAILJS_PUBLIC_KEY);
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
        .then(() => console.log('Admin notified ✓'))
        .catch(err => console.warn('Email notification failed:', err));
    };
    document.head.appendChild(script);
  } else {
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
      .then(() => console.log('Admin notified ✓'))
      .catch(err => console.warn('Email notification failed:', err));
  }
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
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ===== SCROLL REVEAL ===== */
const revealEls = document.querySelectorAll('.service-card, .review-card, .contact-card');
const revealObserver = new IntersectionObserver(entries => {
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
  el.style.transition = `opacity .5s ease ${i * 0.07}s, transform .5s ease ${i * 0.07}s, box-shadow .35s ease`;
  revealObserver.observe(el);
});

/* ===== INIT ===== */
loadProducts();
