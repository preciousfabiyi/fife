/* ============================================
   FIFE BEAUTY HUB & SPA — Main JS
============================================ */

/* ===== FIREBASE — used for Products (live catalog) and Orders ===== */
const firebaseConfig = {
  apiKey: "AIzaSyAk9_7mqgi22VUznizgg569SNzuoiplfKE",
  authDomain: "fife-beauty-hub-b41de.firebaseapp.com",
  projectId: "fife-beauty-hub-b41de",
  storageBucket: "fife-beauty-hub-b41de.firebasestorage.app",
  messagingSenderId: "688954759472",
  appId: "1:688954759472:web:02d0c84dbab6b4a4f810f5"
};

let _ordersDb = null;
try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    _ordersDb = firebase.firestore();
  }
} catch (e) { console.warn('Firebase (orders) init failed:', e); }

/* ===== PAYMENT & NOTIFICATION CONFIG ===== */
const BANK_NAME    = 'Moniepoint';
const ACCOUNT_NO   = '6442284424';
const ACCOUNT_NAME = 'Fifesbeauty Limited';
const ADMIN_EMAIL  = 'victoriaayomide32@gmail.com';

// EmailJS config — use Gmail SMTP service (see EMAILJS_SETUP.md)
const EMAILJS_SERVICE_ID  = 'service_owqkvu8';
const EMAILJS_TEMPLATE_ID = 'template_2aauh8t';
const EMAILJS_PUBLIC_KEY  = 'JrK8JL9Ki1GA4yE8R';

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
let activeFilter     = 'All';
let activeSearch     = '';
let activeSort       = 'newest';
let cachedProducts   = []; // avoid re-fetching Firestore on every search/filter/sort

async function loadProducts() {
  var grid = document.getElementById('productGrid');
  if (!grid) return;

  // Show loading spinner
  grid.innerHTML = '<div class="no-products-msg">' +
    '<i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--rose);display:block;margin-bottom:12px;"></i>' +
    '<p>Loading products…</p></div>';

  if (!_ordersDb) {
    grid.innerHTML = '<div class="no-products-msg">' +
      '<i class="fa-solid fa-triangle-exclamation"></i>' +
      '<p>Could not connect. Please check back soon!</p></div>';
    return;
  }

  try {
    const snap = await _ordersDb.collection('products').get();
    const allProducts = snap.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));

    // Sort client-side so products missing a createdAt field (older/imported items)
    // still show up instead of being silently excluded by Firestore's orderBy.
    allProducts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });

    cachedProducts = allProducts; // cache so filters/search/sort don't re-hit Firestore

    if (allProducts.length === 0) {
      grid.innerHTML = '<div class="no-products-msg">' +
        '<i class="fa-solid fa-box-open"></i>' +
        '<p>No products yet. Check back soon!</p></div>';
      return;
    }

    renderProductGrid(allProducts);

  } catch (error) {
    console.warn('Failed to load products from Firebase:', error.message);
    grid.innerHTML = '<div class="no-products-msg">' +
      '<i class="fa-solid fa-triangle-exclamation"></i>' +
      '<p>Could not load products. Please check back soon!</p></div>';
  }
}

// Build a lighter, transformed Cloudinary URL for fast-loading thumbnails.
// If the image isn't hosted on Cloudinary (e.g. an old placeholder), returns it unchanged.
function cloudinaryThumb(url, width) {
  if (!url || url.indexOf('res.cloudinary.com') === -1) return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const transform = `w_${width || 400},q_auto,f_auto,c_fill`;
  return url.slice(0, idx + marker.length) + transform + '/' + url.slice(idx + marker.length);
}

function renderProductGrid(allProducts) {
  // 1. Filter by category
  let filtered = activeFilter === 'All'
    ? [...allProducts]
    : allProducts.filter(p => (p.category || 'General') === activeFilter);

  // 2. Filter by search
  if (activeSearch) {
    const q = activeSearch.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }

  // 3. Sort
  if (activeSort === 'price-asc')  filtered.sort((a, b) => a.price - b.price);
  if (activeSort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  if (activeSort === 'name-asc')   filtered.sort((a, b) => a.name.localeCompare(b.name));

  // 4. Result count
  const countEl = document.getElementById('productResultCount');
  if (countEl) {
    countEl.textContent = filtered.length === 0
      ? ''
      : `Showing ${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
  }

  // Render all matching products — no pagination, images lazy-load as you scroll
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-products-msg">
        <i class="fa-solid fa-box-open"></i>
        <p>${activeSearch || activeFilter !== 'All' ? 'No products match your search.' : 'No products yet. Check back soon!'}</p>
      </div>`;
  } else {
    grid.innerHTML = filtered.map(p => `
      <div class="product-card">
        <div class="product-image">
          <img src="${cloudinaryThumb(p.image, 400)}" alt="${p.name}" loading="lazy"
               onerror="this.src='https://placehold.co/400x300?text=No+Image'">
          <div class="product-overlay">
            <button class="btn-quick-add add-cart" data-name="${p.name}" data-price="${p.price}">Quick Add</button>
          </div>
        </div>
        <div class="product-info">
          ${p.category ? `<span class="product-category">${p.category}</span>` : ''}
          <h3>${p.name}</h3>
          <p class="product-price">₦${Number(p.price).toLocaleString()}</p>
          <button class="btn btn-primary add-cart" data-name="${p.name}" data-price="${p.price}">Add To Cart</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.add-cart').forEach(btn => {
      btn.addEventListener('click', () => addToCart(btn.dataset.name, btn.dataset.price));
    });

    grid.querySelectorAll('.product-card').forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px)';
      el.style.transition = `opacity .45s ease ${Math.min(i, 20) * 0.04}s, transform .45s ease ${Math.min(i, 20) * 0.04}s, box-shadow .35s ease`;
      revealObserver.observe(el);
    });
  }
}



// Toolbar listeners
document.getElementById('productSearch')?.addEventListener('input', e => {
  activeSearch  = e.target.value.trim();
  renderProductGrid(cachedProducts);
});

document.getElementById('filterBtns')?.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.cat;
    renderProductGrid(cachedProducts);
  });
});

document.getElementById('productSort')?.addEventListener('change', e => {
  activeSort  = e.target.value;
  renderProductGrid(cachedProducts);
});




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

        <!-- Payment Proof Upload -->
        <div class="co-proof-section">
          <label class="co-proof-label">
            Upload Payment Screenshot <span class="co-required">*Required</span>
          </label>
          <div class="co-proof-zone" id="coProofZone">
            <input type="file" id="coProofInput" accept="image/*" hidden>
            <div class="co-proof-placeholder" id="coProofPlaceholder">
              <i class="fa-solid fa-image"></i>
              <p>Tap to upload screenshot</p>
              <span>Take a photo or choose from gallery</span>
            </div>
            <div class="co-proof-preview hidden" id="coProofPreview">
              <img id="coProofImg" src="" alt="Payment proof">
              <button type="button" class="co-proof-remove" id="coProofRemove">
                <i class="fa-solid fa-xmark"></i>
              </button>
              <div class="co-proof-ready">
                <i class="fa-solid fa-circle-check"></i> Screenshot uploaded
              </div>
            </div>
            <div class="co-proof-loading hidden" id="coProofLoading">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <p>Processing image…</p>
            </div>
          </div>
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

  // Proof image state
  let proofBase64 = null;

  // Wire up proof upload zone
  const proofZone        = modal.querySelector('#coProofZone');
  const proofInput       = modal.querySelector('#coProofInput');
  const proofPlaceholder = modal.querySelector('#coProofPlaceholder');
  const proofPreview     = modal.querySelector('#coProofPreview');
  const proofImgEl       = modal.querySelector('#coProofImg');
  const proofRemove      = modal.querySelector('#coProofRemove');
  const proofLoading     = modal.querySelector('#coProofLoading');

  proofZone.addEventListener('click', e => {
    if (!e.target.closest('.co-proof-remove')) proofInput.click();
  });

  proofInput.addEventListener('change', () => {
    if (proofInput.files[0]) handleProofImage(proofInput.files[0]);
  });

  proofRemove.addEventListener('click', e => {
    e.stopPropagation();
    proofBase64 = null;
    proofInput.value = '';
    proofImgEl.src = '';
    proofPreview.classList.add('hidden');
    proofPlaceholder.classList.remove('hidden');
  });

  function handleProofImage(file) {
    if (!file.type.startsWith('image/')) { showToast('Please select an image file.'); return; }
    proofPlaceholder.classList.add('hidden');
    proofLoading.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        // Compress to max 1000px, 80% quality
        const MAX = 1000;
        let { width, height } = img;
        if (width > height && width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        else if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }

        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        proofBase64 = canvas.toDataURL('image/jpeg', 0.80);

        proofImgEl.src = proofBase64;
        proofLoading.classList.add('hidden');
        proofPreview.classList.remove('hidden');
        showToast('Screenshot uploaded ✓');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

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

    if (!proofBase64) {
      showToast('Please upload your payment screenshot.');
      proofZone.classList.add('co-proof-shake');
      setTimeout(() => proofZone.classList.remove('co-proof-shake'), 600);
      return;
    }

    const itemsList = cart.map(i =>
      `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''} — ₦${i.price * i.qty}`
    ).join('\n');

    const orderData = {
      ref: orderRef,
      name, phone, address, payment,
      proof: proofBase64,
      items: cart.map(i => ({ ...i })),
      total,
      date: new Date().toLocaleString('en-NG'),
      status: 'Pending'
    };

    // Save to Firestore so ANY device (admin) can see this order globally
    if (_ordersDb) {
      _ordersDb.collection('orders').add({
        ...orderData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(err => console.warn('Order save to Firestore failed, kept locally only:', err));
    }

    // Also keep a local copy as a fallback/offline cache
    const localOrders = JSON.parse(localStorage.getItem('fifeOrders') || '[]');
    localOrders.unshift(orderData);
    localStorage.setItem('fifeOrders', JSON.stringify(localOrders));

    // Send email notification via EmailJS
    sendAdminNotification({
      order_ref:        orderRef,
      customer_name:    name,
      customer_phone:   phone,
      customer_address: address,
      payment_method:   payment,
      items_list:       itemsList,
      order_total:      `₦${total}`,
      order_date:       new Date().toLocaleString('en-NG'),
      admin_email:      ADMIN_EMAIL,
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
// Initialise EmailJS once on page load
(function initEmailJS() {
  if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }
})();

function sendAdminNotification(params) {
  if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY' ||
      EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' ||
      EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID') {
    console.warn('EmailJS not configured — see EMAILJS_SETUP.md for instructions.');
    return;
  }
  if (typeof emailjs === 'undefined') {
    console.warn('EmailJS SDK not loaded.');
    return;
  }
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
    .then(() => console.log('✓ Admin notification sent to', ADMIN_EMAIL))
    .catch(err => console.error('✗ EmailJS error:', err));
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