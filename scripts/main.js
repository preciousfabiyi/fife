let cart = [];

// LOAD PRODUCTS FROM ADMIN STORAGE
let products = JSON.parse(localStorage.getItem("products")) || [];

function renderProducts() {
  const list = document.getElementById("productList");
  list.innerHTML = "";

  products.forEach((p, index) => {
    list.innerHTML += `
      <div class="card">
        <img src="${p.image}" width="100%">
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <b>₦${p.price}</b>

        <button onclick="addCart(${index})">
          Add to Cart
        </button>
      </div>
    `;
  });
  // WHATSAPP CHECKOUT
document.getElementById("payBtn").addEventListener("click", () => {

  if (cart.length === 0) {
    alert("Your cart is empty");
    return;
  }

  let message = "🛍️ New Order from Fife Beauty Hub%0A%0A";

  cart.forEach((item, index) => {
    message += `${index + 1}. ${item.name} - ₦${item.price}%0A`;
  });

  message += `%0A💰 Total: ₦${total}%0A`;
  message += `%0APlease confirm my order.`;

  const phoneNumber = "2349165028766"; // 👉 your WhatsApp number

  const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`;

  window.open(whatsappURL, "_blank");
});

}
import { useState, useEffect, useRef } from "react";

// ── STORAGE HELPERS ──────────────────────────────────────────────
const KEYS = {
  products: "fife_products",
  bookings: "fife_bookings",
  orders: "fife_orders",
  reviews: "fife_reviews",
  cart: "fife_cart",
};
const load = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ── SEED DATA ────────────────────────────────────────────────────
const SEED_PRODUCTS = [
  { id: 1, name: "Rose Glow Facial", category: "facial", price: 75, duration: "60 min", image: "🌸", desc: "Deep cleansing & anti-ageing facial with botanical extracts and luxury rose serum.", stock: 10, type: "service" },
  { id: 2, name: "Hot Stone Massage", category: "massage", price: 90, duration: "75 min", image: "🕯️", desc: "Melt tension away with warm basalt stones and aromatic essential oils.", stock: 8, type: "service" },
  { id: 3, name: "Luxury Manicure", category: "nails", price: 35, duration: "45 min", image: "💅", desc: "Shape, buff, cuticle care and gel polish in your chosen shade.", stock: 15, type: "service" },
  { id: 4, name: "Lash Lift & Tint", category: "lash", price: 55, duration: "60 min", image: "✨", desc: "Lift, curl and tint your natural lashes for weeks of effortless glamour.", stock: 12, type: "service" },
  { id: 5, name: "Aromatherapy Oil Set", category: "product", price: 28, duration: null, image: "🌿", desc: "A curated set of 3 pure essential oil blends for relaxation and renewal.", stock: 20, type: "product" },
  { id: 6, name: "Spa Day Package", category: "spa", price: 180, duration: "Full Day", image: "👑", desc: "The ultimate indulgence — facial, massage, nails & lounge access with champagne.", stock: 5, type: "service" },
];
const SEED_REVIEWS = [
  { id: 1, productId: 1, name: "Sarah M.", rating: 5, comment: "Absolutely glowing after this facial. My skin has never looked better!", date: "2026-04-10" },
  { id: 2, productId: 2, name: "Claire T.", rating: 5, comment: "The hot stone massage was pure heaven. I fell asleep it was so relaxing!", date: "2026-04-15" },
  { id: 3, productId: 6, name: "Rachel K.", rating: 5, comment: "Best birthday treat ever. The spa day package exceeded every expectation.", date: "2026-05-01" },
];

// ── DESIGN TOKENS ────────────────────────────────────────────────
const T = {
  deep: "#2a1f1a", ivory: "#f5f0e8", blush: "#e8c9b8",
  rose: "#c9857a", gold: "#c9a96e", sage: "#8a9e8f", smoke: "#d4cfc8",
  card: "rgba(255,255,255,0.03)", border: "rgba(201,169,110,0.15)",
};

// ── GLOBAL STYLES ────────────────────────────────────────────────
const GS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@200;300;400&display=swap');
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
  html,body,#root{height:100%;font-family:'Jost',sans-serif;font-weight:300;background:#2a1f1a;color:#f5f0e8;overflow-x:hidden;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#2a1f1a;} ::-webkit-scrollbar-thumb{background:#c9a96e;border-radius:2px;}
  input,textarea,select{font-family:'Jost',sans-serif;font-weight:300;}
  button{font-family:'Jost',sans-serif;cursor:pointer;}
  .serif{font-family:'Cormorant Garamond',serif;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  @keyframes pulse{0%,100%{opacity:0.6;}50%{opacity:1;}}
  @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
  .anim-fadeUp{animation:fadeUp 0.5s ease forwards;}
  .anim-fadeIn{animation:fadeIn 0.4s ease forwards;}
`;

// ── REUSABLE COMPONENTS ──────────────────────────────────────────
const Btn = ({ children, onClick, variant = "gold", size = "md", style = {}, disabled = false }) => {
  const [hov, setHov] = useState(false);
  const base = {
    padding: size === "sm" ? "0.5rem 1.2rem" : size === "lg" ? "1rem 2.5rem" : "0.7rem 1.8rem",
    fontSize: size === "sm" ? "0.65rem" : "0.72rem",
    letterSpacing: "0.25em", textTransform: "uppercase", border: "none",
    cursor: disabled ? "not-allowed" : "pointer", position: "relative", overflow: "hidden",
    transition: "all 0.3s", fontWeight: 300, opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    gold: { background: hov ? T.gold : "transparent", color: hov ? T.deep : T.gold, border: `1px solid ${T.gold}` },
    rose: { background: hov ? T.rose : "transparent", color: hov ? T.ivory : T.rose, border: `1px solid ${T.rose}` },
    solid: { background: hov ? "#a88558" : T.gold, color: T.deep, border: `1px solid ${T.gold}` },
    ghost: { background: "transparent", color: hov ? T.ivory : T.smoke, border: `1px solid ${T.border}` },
    danger: { background: hov ? "#c0392b" : "transparent", color: hov ? T.ivory : "#e57373", border: "1px solid #e57373" },
  };
  return (
    <button onClick={!disabled ? onClick : undefined} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

const Input = ({ label, type = "text", value, onChange, placeholder, options, rows, required }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
    {label && <label style={{ fontSize: "0.62rem", letterSpacing: "0.3em", textTransform: "uppercase", color: T.gold }}>{label}{required && " *"}</label>}
    {type === "select" ? (
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, color: T.ivory, padding: "0.75rem 1rem", fontSize: "0.82rem", outline: "none", appearance: "none" }}>
        {options?.map(o => <option key={o.value ?? o} value={o.value ?? o} style={{ background: T.deep }}>{o.label ?? o}</option>)}
      </select>
    ) : type === "textarea" ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows || 3}
        style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, color: T.ivory, padding: "0.75rem 1rem", fontSize: "0.82rem", outline: "none", resize: "vertical" }} />
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, color: T.ivory, padding: "0.75rem 1rem", fontSize: "0.82rem", outline: "none" }} />
    )}
  </div>
);

const Tag = ({ children, color = T.gold }) => (
  <span style={{ fontSize: "0.58rem", letterSpacing: "0.25em", textTransform: "uppercase", color, border: `1px solid ${color}`, padding: "0.2rem 0.6rem", borderRadius: "0" }}>{children}</span>
);

const Stars = ({ rating, onRate, size = 14 }) => (
  <div style={{ display: "flex", gap: "2px" }}>
    {[1,2,3,4,5].map(i => (
      <span key={i} onClick={() => onRate?.(i)}
        style={{ fontSize: size, color: i <= rating ? T.gold : T.border, cursor: onRate ? "pointer" : "default", transition: "color 0.2s" }}>★</span>
    ))}
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease" }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "#321e16", border: `1px solid ${T.border}`, padding: "2.5rem", maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 className="serif" style={{ fontSize: "1.6rem", fontWeight: 300, color: T.ivory }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.smoke, fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const Toast = ({ msg, type }) => (
  <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: type === "error" ? "#5a2020" : "#1a3a2a", border: `1px solid ${type === "error" ? "#c0392b" : T.sage}`, color: T.ivory, padding: "1rem 1.5rem", zIndex: 2000, fontSize: "0.82rem", animation: "fadeUp 0.3s ease", maxWidth: 300 }}>
    {msg}
  </div>
);

// ── NAVBAR ───────────────────────────────────────────────────────
const Navbar = ({ view, setView, cart, isAdmin, setIsAdmin, user, setUser }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(42,31,26,0.95)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${T.border}`, padding: "0 5%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div className="serif" onClick={() => setView("home")}
          style={{ fontSize: "1.5rem", fontWeight: 300, cursor: "pointer", color: T.ivory }}>
          Fife <span style={{ color: T.gold }}>Beauty</span> Hub
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {!isAdmin && (
            <>
              {["home","shop","bookings"].map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ background: "none", border: "none", color: view === v ? T.gold : T.smoke, fontSize: "0.68rem", letterSpacing: "0.25em", textTransform: "uppercase", cursor: "pointer", padding: "0.5rem 0.8rem", transition: "color 0.2s" }}>
                  {v === "bookings" ? "My Bookings" : v}
                </button>
              ))}
              <button onClick={() => setView("cart")}
                style={{ background: "none", border: `1px solid ${T.border}`, color: T.gold, fontSize: "0.68rem", letterSpacing: "0.2em", padding: "0.4rem 1rem", cursor: "pointer", position: "relative" }}>
                🛒 {cart.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: T.rose, color: T.ivory, borderRadius: "50%", width: 16, height: 16, fontSize: "0.55rem", display: "flex", alignItems: "center", justifyContent: "center" }}>{cart.reduce((a,c)=>a+c.qty,0)}</span>}
              </button>
            </>
          )}
          {isAdmin && (
            <>
              {["dashboard","products","orders","reviews"].map(v => (
                <button key={v} onClick={() => setView("admin_"+v)}
                  style={{ background: "none", border: "none", color: view === "admin_"+v ? T.gold : T.smoke, fontSize: "0.68rem", letterSpacing: "0.25em", textTransform: "uppercase", cursor: "pointer", padding: "0.5rem 0.8rem", transition: "color 0.2s" }}>
                  {v}
                </button>
              ))}
            </>
          )}
          <button onClick={() => { setIsAdmin(!isAdmin); setView(isAdmin ? "home" : "admin_dashboard"); }}
            style={{ background: "none", border: `1px solid ${isAdmin ? T.rose : T.border}`, color: isAdmin ? T.rose : T.smoke, fontSize: "0.6rem", letterSpacing: "0.2em", padding: "0.35rem 0.8rem", cursor: "pointer", textTransform: "uppercase" }}>
            {isAdmin ? "Exit Admin" : "Admin"}
          </button>
        </div>
      </div>
    </nav>
  );
};

// ── HOME PAGE ────────────────────────────────────────────────────
const HomePage = ({ setView, products, reviews }) => {
  const avg = r => r.length ? (r.reduce((a,c)=>a+c.rating,0)/r.length).toFixed(1) : "—";
  return (
    <div>
      {/* Hero */}
      <div style={{ position: "relative", minHeight: "90vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "radial-gradient(ellipse 80% 80% at 60% 40%, #3d2218 0%, #2a1f1a 70%)" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,169,110,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(201,169,110,0.04) 1px,transparent 1px)", backgroundSize: "80px 80px", transform: "perspective(600px) rotateX(60deg) translateY(30%)", transformOrigin: "center bottom", maskImage: "linear-gradient(to top,rgba(0,0,0,0.4) 0%,transparent 60%)", pointerEvents: "none" }} />
        {["🌸","✨","🕯️"].map((e,i) => (
          <div key={i} style={{ position: "absolute", fontSize: "4rem", opacity: 0.05, animation: "float 4s ease-in-out infinite", animationDelay: `${i*1.5}s`, left: `${15+i*35}%`, top: `${20+i*15}%`, pointerEvents: "none" }}>{e}</div>
        ))}
        <div style={{ position: "relative", textAlign: "center", padding: "2rem", animation: "fadeUp 1s ease" }}>
          <p style={{ fontSize: "0.65rem", letterSpacing: "0.5em", textTransform: "uppercase", color: T.gold, marginBottom: "1.5rem" }}>✦ Where Beauty Meets Serenity ✦</p>
          <h1 className="serif" style={{ fontSize: "clamp(3.5rem,10vw,8rem)", fontWeight: 300, lineHeight: 0.9, marginBottom: "1.5rem" }}>
            Fife<br /><em style={{ color: T.rose, fontStyle: "italic" }}>Beauty Hub</em><br />
            <span style={{ fontSize: "0.4em", letterSpacing: "0.3em", textTransform: "uppercase", color: T.blush, fontStyle: "normal" }}>& Spa</span>
          </h1>
          <p style={{ color: T.smoke, letterSpacing: "0.15em", marginBottom: "2.5rem", fontSize: "0.85rem" }}>Luxury Treatments · Holistic Wellness · Transformative Experiences</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Btn onClick={() => setView("shop")} variant="solid" size="lg">Browse Treatments</Btn>
            <Btn onClick={() => setView("shop")} variant="gold" size="lg">Book Now</Btn>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", justifyContent: "center", gap: "0", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        {[["2,500+","Happy Clients"],["30+","Treatments"],["4.9★","Rating"],["8+","Years"]].map(([v,l],i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", padding: "2.5rem 1rem", borderRight: i<3 ? `1px solid ${T.border}` : "none" }}>
            <div className="serif" style={{ fontSize: "2.5rem", color: T.gold, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.3em", textTransform: "uppercase", color: T.smoke, marginTop: "0.4rem" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Featured */}
      <div style={{ padding: "5rem 5%" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span style={{ fontSize: "0.62rem", letterSpacing: "0.45em", textTransform: "uppercase", color: T.gold, display: "block", marginBottom: "0.8rem" }}>✦ Featured ✦</span>
          <h2 className="serif" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 300 }}>Our <em style={{ color: T.rose, fontStyle: "italic" }}>Signature</em> Treatments</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
          {products.slice(0,3).map(p => {
            const pr = reviews.filter(r => r.productId === p.id);
            return (
              <div key={p.id} onClick={() => setView("shop")}
                style={{ background: T.card, border: `1px solid ${T.border}`, padding: "2rem", cursor: "pointer", transition: "all 0.3s", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = ""; }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>{p.image}</div>
                <h3 className="serif" style={{ fontSize: "1.4rem", fontWeight: 300, marginBottom: "0.5rem" }}>{p.name}</h3>
                <p style={{ fontSize: "0.78rem", color: T.smoke, lineHeight: 1.7, marginBottom: "1rem" }}>{p.desc}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="serif" style={{ fontSize: "1.3rem", color: T.gold }}>£{p.price}</span>
                  {pr.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><Stars rating={Math.round(pr.reduce((a,c)=>a+c.rating,0)/pr.length)} size={11} /><span style={{ fontSize: "0.65rem", color: T.smoke }}>({pr.length})</span></div>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <Btn onClick={() => setView("shop")} variant="gold">View All Treatments →</Btn>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div style={{ padding: "4rem 5%", borderTop: `1px solid ${T.border}`, background: "rgba(255,255,255,0.01)" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 className="serif" style={{ fontSize: "2.5rem", fontWeight: 300 }}>Voices of <em style={{ color: T.rose, fontStyle: "italic" }}>Radiance</em></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1.5rem" }}>
            {reviews.slice(-3).map(r => (
              <div key={r.id} style={{ border: `1px solid ${T.border}`, padding: "2rem", transition: "all 0.3s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.gold} onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                <div className="serif" style={{ fontSize: "3rem", color: `${T.gold}22`, lineHeight: 0.8, marginBottom: "0.8rem" }}>"</div>
                <Stars rating={r.rating} size={12} />
                <p className="serif" style={{ fontStyle: "italic", fontSize: "1rem", lineHeight: 1.7, color: T.ivory, margin: "0.8rem 0" }}>{r.comment}</p>
                <p style={{ fontSize: "0.65rem", letterSpacing: "0.25em", textTransform: "uppercase", color: T.gold }}>— {r.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── SHOP PAGE ────────────────────────────────────────────────────
const ShopPage = ({ products, reviews, cart, setCart, setView, toast }) => {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [bookModal, setBookModal] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [booking, setBooking] = useState({ name: "", email: "", phone: "", date: "", time: "", notes: "" });
  const [review, setReview] = useState({ name: "", rating: 5, comment: "" });

  const cats = ["all","facial","massage","nails","lash","spa","product"];
  const filtered = filter === "all" ? products : products.filter(p => p.category === filter);

  const addToCart = (p) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      const next = ex ? prev.map(i => i.id === p.id ? { ...i, qty: i.qty+1 } : i) : [...prev, { ...p, qty: 1 }];
      save(KEYS.cart, next); return next;
    });
    toast(`${p.name} added to cart ✓`);
  };

  const submitBooking = () => {
    if (!booking.name || !booking.email || !booking.date || !booking.time) { toast("Please fill required fields", "error"); return; }
    const b = { id: Date.now(), productId: bookModal.id, productName: bookModal.name, price: bookModal.price, ...booking, status: "pending", createdAt: new Date().toISOString() };
    const prev = load(KEYS.bookings, []);
    save(KEYS.bookings, [...prev, b]);
    setBookModal(null); setBooking({ name:"",email:"",phone:"",date:"",time:"",notes:"" });
    toast("Booking confirmed! We'll be in touch soon ✓");
  };

  const submitReview = () => {
    if (!review.name || !review.comment) { toast("Please fill all fields", "error"); return; }
    const r = { id: Date.now(), productId: reviewModal.id, ...review, date: new Date().toISOString().slice(0,10) };
    const prev = load(KEYS.reviews, []);
    save(KEYS.reviews, [...prev, r]);
    setReviewModal(null); setReview({ name:"",rating:5,comment:"" });
    toast("Review submitted, thank you! ✓");
    window.location.reload();
  };

  const productReviews = (id) => reviews.filter(r => r.productId === id);

  return (
    <div style={{ padding: "3rem 5%" }}>
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 className="serif" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 300 }}>Our <em style={{ color: T.rose, fontStyle: "italic" }}>Treatments</em> & Products</h1>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{ background: filter===c ? T.gold : "transparent", color: filter===c ? T.deep : T.smoke, border: `1px solid ${filter===c ? T.gold : T.border}`, padding: "0.4rem 1.2rem", fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}>
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1rem" }}>
        {filtered.map(p => {
          const pr = productReviews(p.id);
          const avgR = pr.length ? pr.reduce((a,c)=>a+c.rating,0)/pr.length : 0;
          return (
            <div key={p.id} style={{ background: T.card, border: `1px solid ${T.border}`, overflow: "hidden", transition: "all 0.3s", display: "flex", flexDirection: "column", animation: "fadeUp 0.4s ease" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = ""; }}>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "2.5rem", textAlign: "center", fontSize: "3rem", position: "relative" }}>
                {p.image}
                {p.type === "service" && <div style={{ position: "absolute", top: "0.8rem", right: "0.8rem" }}><Tag>Service</Tag></div>}
                {p.type === "product" && <div style={{ position: "absolute", top: "0.8rem", right: "0.8rem" }}><Tag color={T.sage}>Product</Tag></div>}
              </div>
              <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                <h3 className="serif" style={{ fontSize: "1.4rem", fontWeight: 300, marginBottom: "0.4rem" }}>{p.name}</h3>
                {p.duration && <p style={{ fontSize: "0.65rem", color: T.gold, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.8rem" }}>⏱ {p.duration}</p>}
                <p style={{ fontSize: "0.78rem", color: T.smoke, lineHeight: 1.7, flex: 1, marginBottom: "1rem" }}>{p.desc}</p>
                {pr.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                    <Stars rating={Math.round(avgR)} size={12} />
                    <span style={{ fontSize: "0.65rem", color: T.smoke }}>{avgR.toFixed(1)} ({pr.length} review{pr.length!==1?"s":""})</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span className="serif" style={{ fontSize: "1.5rem", color: T.gold }}>£{p.price}</span>
                  <span style={{ fontSize: "0.65rem", color: p.stock > 5 ? T.sage : T.rose, letterSpacing: "0.1em" }}>{p.stock > 0 ? `${p.stock} available` : "Sold out"}</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {p.type === "service"
                    ? <Btn onClick={() => setBookModal(p)} variant="solid" style={{ flex: 1 }}>Book</Btn>
                    : <Btn onClick={() => addToCart(p)} variant="solid" style={{ flex: 1 }} disabled={p.stock === 0}>Add to Cart</Btn>
                  }
                  <Btn onClick={() => setReviewModal(p)} variant="ghost" size="sm">Review</Btn>
                </div>
                {pr.length > 0 && (
                  <button onClick={() => setSelected(selected===p.id ? null : p.id)}
                    style={{ background: "none", border: "none", color: T.gold, fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", marginTop: "0.8rem", textAlign: "left" }}>
                    {selected===p.id ? "▲ Hide Reviews" : `▼ See Reviews (${pr.length})`}
                  </button>
                )}
                {selected === p.id && (
                  <div style={{ marginTop: "1rem", borderTop: `1px solid ${T.border}`, paddingTop: "1rem" }}>
                    {pr.map(r => (
                      <div key={r.id} style={{ marginBottom: "0.8rem", paddingBottom: "0.8rem", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                          <Stars rating={r.rating} size={10} />
                          <span style={{ fontSize: "0.6rem", color: T.smoke }}>{r.date}</span>
                        </div>
                        <p className="serif" style={{ fontStyle: "italic", fontSize: "0.88rem", color: T.ivory, lineHeight: 1.5 }}>"{r.comment}"</p>
                        <p style={{ fontSize: "0.6rem", color: T.gold, marginTop: "0.3rem", letterSpacing: "0.2em" }}>— {r.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem", color: T.smoke }}>No treatments in this category yet.</div>
      )}

      {/* Book Modal */}
      {bookModal && (
        <Modal title={`Book: ${bookModal.name}`} onClose={() => setBookModal(null)}>
          <p style={{ fontSize: "0.8rem", color: T.smoke, marginBottom: "1.5rem" }}>£{bookModal.price} · {bookModal.duration}</p>
          <Input label="Full Name" value={booking.name} onChange={v=>setBooking({...booking,name:v})} placeholder="Your name" required />
          <Input label="Email" type="email" value={booking.email} onChange={v=>setBooking({...booking,email:v})} placeholder="your@email.com" required />
          <Input label="Phone" type="tel" value={booking.phone} onChange={v=>setBooking({...booking,phone:v})} placeholder="+44 7700 000000" />
          <Input label="Preferred Date" type="date" value={booking.date} onChange={v=>setBooking({...booking,date:v})} required />
          <Input label="Preferred Time" type="select" value={booking.time} onChange={v=>setBooking({...booking,time:v})} required
            options={[{value:"",label:"Select a time"},{value:"9:00",label:"9:00 AM"},{value:"10:00",label:"10:00 AM"},{value:"11:00",label:"11:00 AM"},{value:"12:00",label:"12:00 PM"},{value:"13:00",label:"1:00 PM"},{value:"14:00",label:"2:00 PM"},{value:"15:00",label:"3:00 PM"},{value:"16:00",label:"4:00 PM"}]} />
          <Input label="Special Requests" type="textarea" value={booking.notes} onChange={v=>setBooking({...booking,notes:v})} placeholder="Allergies, preferences, special occasions…" />
          <Btn onClick={submitBooking} variant="solid" style={{ width: "100%" }}>Confirm Booking →</Btn>
        </Modal>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <Modal title={`Review: ${reviewModal.name}`} onClose={() => setReviewModal(null)}>
          <Input label="Your Name" value={review.name} onChange={v=>setReview({...review,name:v})} placeholder="Your name" required />
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.62rem", letterSpacing: "0.3em", textTransform: "uppercase", color: T.gold, display: "block", marginBottom: "0.5rem" }}>Rating</label>
            <Stars rating={review.rating} onRate={r=>setReview({...review,rating:r})} size={24} />
          </div>
          <Input label="Your Review" type="textarea" value={review.comment} onChange={v=>setReview({...review,comment:v})} placeholder="Tell us about your experience…" rows={4} required />
          <Btn onClick={submitReview} variant="solid" style={{ width: "100%" }}>Submit Review →</Btn>
        </Modal>
      )}
    </div>
  );
};

// ── CART PAGE ────────────────────────────────────────────────────
const CartPage = ({ cart, setCart, toast }) => {
  const [checkout, setCheckout] = useState(false);
  const [info, setInfo] = useState({ name:"",email:"",address:"",city:"",postcode:"" });

  const update = (id, delta) => {
    setCart(prev => {
      const next = prev.map(i => i.id===id ? {...i,qty:Math.max(0,i.qty+delta)} : i).filter(i=>i.qty>0);
      save(KEYS.cart, next); return next;
    });
  };

  const total = cart.reduce((a,c)=>a+c.price*c.qty, 0);

  const submitOrder = () => {
    if (!info.name || !info.email || !info.address) { toast("Please fill required fields", "error"); return; }
    const order = { id: Date.now(), items: cart, total, ...info, status: "confirmed", createdAt: new Date().toISOString() };
    const prev = load(KEYS.orders, []);
    save(KEYS.orders, [...prev, order]);
    save(KEYS.cart, []);
    setCart([]);
    toast("Order placed successfully! Thank you ✓");
    setCheckout(false);
  };

  if (cart.length === 0) return (
    <div style={{ padding: "5rem", textAlign: "center" }}>
      <div style={{ fontSize: "4rem", marginBottom: "1.5rem", opacity: 0.3 }}>🛒</div>
      <h2 className="serif" style={{ fontSize: "2rem", fontWeight: 300, color: T.smoke }}>Your cart is empty</h2>
      <p style={{ color: T.smoke, marginTop: "0.8rem", fontSize: "0.85rem" }}>Browse our treatments and products to get started.</p>
    </div>
  );

  return (
    <div style={{ padding: "3rem 5%", maxWidth: 800, margin: "0 auto" }}>
      <h1 className="serif" style={{ fontSize: "2.5rem", fontWeight: 300, marginBottom: "2rem" }}>Your <em style={{ color: T.rose, fontStyle: "italic" }}>Cart</em></h1>
      {cart.map(item => (
        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 0", borderBottom: `1px solid ${T.border}`, gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
            <span style={{ fontSize: "2rem" }}>{item.image}</span>
            <div>
              <p style={{ fontSize: "0.9rem", marginBottom: "0.3rem" }}>{item.name}</p>
              <p className="serif" style={{ fontSize: "1.1rem", color: T.gold }}>£{item.price}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <button onClick={() => update(item.id, -1)} style={{ background: "none", border: `1px solid ${T.border}`, color: T.ivory, width: 28, height: 28, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <span style={{ minWidth: 20, textAlign: "center" }}>{item.qty}</span>
            <button onClick={() => update(item.id, 1)} style={{ background: "none", border: `1px solid ${T.border}`, color: T.ivory, width: 28, height: 28, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
          <span className="serif" style={{ fontSize: "1.2rem", color: T.gold, minWidth: 70, textAlign: "right" }}>£{(item.price*item.qty).toFixed(2)}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem 0", borderTop: `1px solid ${T.gold}` }}>
        <span className="serif" style={{ fontSize: "1.5rem", fontWeight: 300 }}>Total</span>
        <span className="serif" style={{ fontSize: "2rem", color: T.gold }}>£{total.toFixed(2)}</span>
      </div>
      <Btn onClick={() => setCheckout(true)} variant="solid" size="lg" style={{ width: "100%", marginTop: "0.5rem" }}>Proceed to Checkout →</Btn>

      {checkout && (
        <Modal title="Checkout" onClose={() => setCheckout(false)}>
          <Input label="Full Name" value={info.name} onChange={v=>setInfo({...info,name:v})} placeholder="Your full name" required />
          <Input label="Email" type="email" value={info.email} onChange={v=>setInfo({...info,email:v})} placeholder="your@email.com" required />
          <Input label="Delivery Address" value={info.address} onChange={v=>setInfo({...info,address:v})} placeholder="Street address" required />
          <Input label="City" value={info.city} onChange={v=>setInfo({...info,city:v})} placeholder="City" />
          <Input label="Postcode" value={info.postcode} onChange={v=>setInfo({...info,postcode:v})} placeholder="Postcode" />
          <div style={{ margin: "1rem 0", padding: "1rem", background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: "0.72rem", color: T.smoke, marginBottom: "0.5rem" }}>Order Summary</p>
            {cart.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: T.smoke, marginBottom: "0.3rem" }}><span>{i.name} ×{i.qty}</span><span>£{(i.price*i.qty).toFixed(2)}</span></div>)}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: T.gold, borderTop: `1px solid ${T.border}`, paddingTop: "0.5rem", marginTop: "0.5rem" }}><strong>Total</strong><strong>£{total.toFixed(2)}</strong></div>
          </div>
          <Btn onClick={submitOrder} variant="solid" style={{ width: "100%" }}>Place Order →</Btn>
        </Modal>
      )}
    </div>
  );
};

// ── BOOKINGS PAGE (Customer) ──────────────────────────────────────
const BookingsPage = ({ toast }) => {
  const [email, setEmail] = useState("");
  const [results, setResults] = useState(null);

  const search = () => {
    if (!email) { toast("Enter your email to find bookings", "error"); return; }
    const all = load(KEYS.bookings, []);
    const found = all.filter(b => b.email.toLowerCase() === email.toLowerCase());
    setResults(found);
  };

  const statusColor = s => ({ pending: T.gold, confirmed: T.sage, cancelled: T.rose, completed: T.smoke })[s] || T.smoke;

  return (
    <div style={{ padding: "3rem 5%", maxWidth: 700, margin: "0 auto" }}>
      <h1 className="serif" style={{ fontSize: "2.5rem", fontWeight: 300, marginBottom: "0.5rem" }}>My <em style={{ color: T.rose, fontStyle: "italic" }}>Bookings</em></h1>
      <p style={{ color: T.smoke, fontSize: "0.82rem", marginBottom: "2rem" }}>Enter your email to view your appointment history.</p>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
          onKeyDown={e=>e.key==="Enter"&&search()}
          style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, color: T.ivory, padding: "0.75rem 1rem", fontSize: "0.82rem", outline: "none" }} />
        <Btn onClick={search} variant="solid">Search</Btn>
      </div>
      {results !== null && (
        results.length === 0
          ? <p style={{ color: T.smoke, fontSize: "0.85rem" }}>No bookings found for this email address.</p>
          : results.map(b => (
            <div key={b.id} style={{ border: `1px solid ${T.border}`, padding: "1.5rem", marginBottom: "1rem", transition: "border-color 0.3s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
                <h3 className="serif" style={{ fontSize: "1.3rem", fontWeight: 300 }}>{b.productName}</h3>
                <Tag color={statusColor(b.status)}>{b.status}</Tag>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.78rem", color: T.smoke }}>
                <span>📅 {b.date} at {b.time}</span>
                <span className="serif" style={{ color: T.gold, fontSize: "1rem" }}>£{b.price}</span>
                {b.notes && <span style={{ gridColumn: "1/-1" }}>📝 {b.notes}</span>}
              </div>
            </div>
          ))
      )}
    </div>
  );
};

// ── ADMIN DASHBOARD ───────────────────────────────────────────────
const AdminDashboard = ({ products, setView }) => {
  const bookings = load(KEYS.bookings, []);
  const orders = load(KEYS.orders, []);
  const reviews = load(KEYS.reviews, []);
  const revenue = [...bookings,...orders].reduce((a,c) => a + (c.price || c.total || 0), 0);

  const stats = [
    { label: "Products", value: products.length, icon: "🌸", view: "admin_products" },
    { label: "Bookings", value: bookings.length, icon: "📅", view: "admin_orders" },
    { label: "Orders", value: orders.length, icon: "📦", view: "admin_orders" },
    { label: "Reviews", value: reviews.length, icon: "⭐", view: "admin_reviews" },
  ];

  return (
    <div style={{ padding: "3rem 5%" }}>
      <h1 className="serif" style={{ fontSize: "2.5rem", fontWeight: 300, marginBottom: "0.5rem" }}>Admin <em style={{ color: T.rose, fontStyle: "italic" }}>Dashboard</em></h1>
      <p style={{ color: T.smoke, fontSize: "0.82rem", marginBottom: "2.5rem" }}>Welcome back. Here's an overview of Fife Beauty Hub & Spa.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
        {stats.map(s => (
          <div key={s.label} onClick={() => setView(s.view)}
            style={{ background: T.card, border: `1px solid ${T.border}`, padding: "1.5rem", cursor: "pointer", transition: "all 0.3s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.gold; e.currentTarget.style.transform="translateY(-2px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform=""; }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.8rem" }}>{s.icon}</div>
            <div className="serif" style={{ fontSize: "2.5rem", color: T.gold, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: T.smoke, marginTop: "0.4rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <h2 className="serif" style={{ fontSize: "1.5rem", fontWeight: 300, marginBottom: "1rem", color: T.gold }}>Recent Bookings</h2>
      {bookings.length === 0 ? <p style={{ color: T.smoke, fontSize: "0.82rem", marginBottom: "2rem" }}>No bookings yet.</p> : (
        <div style={{ marginBottom: "2rem" }}>
          {bookings.slice(-5).reverse().map(b => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.9rem 1rem", borderBottom: `1px solid ${T.border}`, fontSize: "0.82rem" }}>
              <span>{b.name}</span>
              <span style={{ color: T.smoke }}>{b.productName}</span>
              <span style={{ color: T.smoke }}>{b.date} {b.time}</span>
              <Tag color={{ pending: T.gold, confirmed: T.sage, cancelled: T.rose }[b.status] || T.smoke}>{b.status}</Tag>
            </div>
          ))}
        </div>
      )}

      {/* Recent Reviews */}
      <h2 className="serif" style={{ fontSize: "1.5rem", fontWeight: 300, marginBottom: "1rem", color: T.gold }}>Recent Reviews</h2>
      {reviews.length === 0 ? <p style={{ color: T.smoke, fontSize: "0.82rem" }}>No reviews yet.</p> : (
        reviews.slice(-3).reverse().map(r => (
          <div key={r.id} style={{ border: `1px solid ${T.border}`, padding: "1rem", marginBottom: "0.8rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <span style={{ fontSize: "0.8rem" }}>{r.name}</span>
              <Stars rating={r.rating} size={11} />
            </div>
            <p className="serif" style={{ fontStyle: "italic", fontSize: "0.88rem", color: T.smoke }}>"{r.comment}"</p>
          </div>
        ))
      )}
    </div>
  );
};

// ── ADMIN PRODUCTS ────────────────────────────────────────────────
const AdminProducts = ({ products, setProducts, toast }) => {
  const blank = { name:"",category:"facial",price:"",duration:"",image:"🌸",desc:"",stock:"",type:"service" };
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const fileRef = useRef();

  const open = (p=null) => { setEditing(p); setForm(p ? {...p,price:String(p.price),stock:String(p.stock)} : blank); setModal(true); };

  const submit = () => {
    if (!form.name || !form.price) { toast("Name and price are required", "error"); return; }
    const p = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock)||0, id: editing?.id || Date.now() };
    const next = editing ? products.map(x=>x.id===editing.id?p:x) : [...products, p];
    save(KEYS.products, next); setProducts(next);
    setModal(false); toast(editing ? "Product updated ✓" : "Product added ✓");
  };

  const del = (id) => {
    if (!confirm("Delete this product?")) return;
    const next = products.filter(p=>p.id!==id);
    save(KEYS.products, next); setProducts(next); toast("Product deleted");
  };

  const handleImage = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f=>({...f, image: ev.target.result}));
    reader.readAsDataURL(file);
  };

  const EMOJIS = ["🌸","🕯️","💅","✨","🌿","👑","🧖","💆","🛁","🌺","🍃","💎","🌙","🌹","🫧"];

  return (
    <div style={{ padding: "3rem 5%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 className="serif" style={{ fontSize: "2.5rem", fontWeight: 300 }}>Manage <em style={{ color: T.rose, fontStyle: "italic" }}>Products</em></h1>
        <Btn onClick={() => open()} variant="solid">+ Add Product</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
        {products.map(p => (
          <div key={p.id} style={{ background: T.card, border: `1px solid ${T.border}`, padding: "1.5rem", position: "relative" }}>
            <div style={{ fontSize: p.image?.startsWith("data:") ? "0" : "2.5rem", marginBottom: "0.8rem" }}>
              {p.image?.startsWith("data:")
                ? <img src={p.image} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 2 }} />
                : p.image}
            </div>
            <Tag color={p.type==="service" ? T.gold : T.sage}>{p.category}</Tag>
            <h3 className="serif" style={{ fontSize: "1.2rem", fontWeight: 300, margin: "0.6rem 0 0.3rem" }}>{p.name}</h3>
            <p style={{ fontSize: "0.75rem", color: T.smoke, marginBottom: "0.8rem", lineHeight: 1.5 }}>{p.desc.slice(0,80)}…</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span className="serif" style={{ fontSize: "1.3rem", color: T.gold }}>£{p.price}</span>
              <span style={{ fontSize: "0.65rem", color: T.smoke }}>Stock: {p.stock}</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Btn onClick={() => open(p)} variant="gold" size="sm" style={{ flex: 1 }}>Edit</Btn>
              <Btn onClick={() => del(p.id)} variant="danger" size="sm" style={{ flex: 1 }}>Delete</Btn>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={editing ? "Edit Product" : "Add New Product"} onClose={() => setModal(false)}>
          <Input label="Product / Treatment Name" value={form.name} onChange={v=>setForm({...form,name:v})} placeholder="e.g. Rose Glow Facial" required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Input label="Type" type="select" value={form.type} onChange={v=>setForm({...form,type:v})}
              options={[{value:"service",label:"Service (Bookable)"},{value:"product",label:"Product (Purchasable)"}]} />
            <Input label="Category" type="select" value={form.category} onChange={v=>setForm({...form,category:v})}
              options={["facial","massage","nails","lash","spa","product","wellness","other"]} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Input label="Price (£)" type="number" value={form.price} onChange={v=>setForm({...form,price:v})} placeholder="75" required />
            <Input label="Stock / Slots" type="number" value={form.stock} onChange={v=>setForm({...form,stock:v})} placeholder="10" />
          </div>
          {form.type === "service" && <Input label="Duration" value={form.duration} onChange={v=>setForm({...form,duration:v})} placeholder="e.g. 60 min" />}
          <Input label="Description" type="textarea" value={form.desc} onChange={v=>setForm({...form,desc:v})} placeholder="Describe this treatment or product…" rows={3} />

          {/* Icon / Image picker */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.62rem", letterSpacing: "0.3em", textTransform: "uppercase", color: T.gold, display: "block", marginBottom: "0.6rem" }}>Icon / Image</label>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.8rem" }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={()=>setForm({...form,image:e})}
                  style={{ fontSize: "1.4rem", padding: "0.3rem", background: form.image===e ? `${T.gold}33` : "transparent", border: `1px solid ${form.image===e ? T.gold : T.border}`, cursor: "pointer", borderRadius: 2 }}>{e}</button>
              ))}
            </div>
            <p style={{ fontSize: "0.65rem", color: T.smoke, marginBottom: "0.5rem" }}>Or upload an image:</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
            <Btn onClick={()=>fileRef.current.click()} variant="ghost" size="sm">📁 Upload Image</Btn>
            {form.image?.startsWith("data:") && <img src={form.image} alt="" style={{ width: 60, height: 60, objectFit: "cover", marginTop: "0.5rem", display: "block" }} />}
          </div>

          <Btn onClick={submit} variant="solid" style={{ width: "100%" }}>{editing ? "Update Product →" : "Add Product →"}</Btn>
        </Modal>
      )}
    </div>
  );
};

// ── ADMIN ORDERS ──────────────────────────────────────────────────
const AdminOrders = ({ toast }) => {
  const [bookings, setBookings] = useState(load(KEYS.bookings, []));
  const [orders, setOrders] = useState(load(KEYS.orders, []));
  const [tab, setTab] = useState("bookings");

  const updateStatus = (type, id, status) => {
    if (type === "booking") {
      const next = bookings.map(b=>b.id===id?{...b,status}:b);
      save(KEYS.bookings, next); setBookings(next);
    } else {
      const next = orders.map(o=>o.id===id?{...o,status}:o);
      save(KEYS.orders, next); setOrders(next);
    }
    toast(`Status updated to "${status}" ✓`);
  };

  const statusColor = s => ({ pending: T.gold, confirmed: T.sage, cancelled: T.rose, completed: T.smoke, processing: "#9b8ea8", shipped: "#6a8fa8" })[s] || T.smoke;
  const bookingStatuses = ["pending","confirmed","completed","cancelled"];
  const orderStatuses = ["confirmed","processing","shipped","completed","cancelled"];

  return (
    <div style={{ padding: "3rem 5%" }}>
      <h1 className="serif" style={{ fontSize: "2.5rem", fontWeight: 300, marginBottom: "2rem" }}>Bookings & <em style={{ color: T.rose, fontStyle: "italic" }}>Orders</em></h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        {["bookings","orders"].map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{ background: tab===t ? T.gold : "transparent", color: tab===t ? T.deep : T.smoke, border: `1px solid ${tab===t ? T.gold : T.border}`, padding: "0.5rem 1.5rem", fontSize: "0.65rem", letterSpacing: "0.25em", textTransform: "uppercase", cursor: "pointer" }}>
            {t} ({(t==="bookings"?bookings:orders).length})
          </button>
        ))}
      </div>

      {tab === "bookings" && (
        <div>
          {bookings.length === 0 ? <p style={{ color: T.smoke }}>No bookings yet.</p> : bookings.slice().reverse().map(b => (
            <div key={b.id} style={{ border: `1px solid ${T.border}`, padding: "1.5rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 className="serif" style={{ fontSize: "1.2rem", fontWeight: 300 }}>{b.productName}</h3>
                  <p style={{ fontSize: "0.75rem", color: T.smoke }}>{b.name} · {b.email} {b.phone && `· ${b.phone}`}</p>
                  <p style={{ fontSize: "0.75rem", color: T.gold, marginTop: "0.3rem" }}>📅 {b.date} at {b.time} · £{b.price}</p>
                  {b.notes && <p style={{ fontSize: "0.72rem", color: T.smoke, marginTop: "0.3rem", fontStyle: "italic" }}>"{b.notes}"</p>}
                </div>
                <Tag color={statusColor(b.status)}>{b.status}</Tag>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {bookingStatuses.filter(s=>s!==b.status).map(s => (
                  <Btn key={s} onClick={()=>updateStatus("booking",b.id,s)} variant="ghost" size="sm">→ {s}</Btn>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "orders" && (
        <div>
          {orders.length === 0 ? <p style={{ color: T.smoke }}>No orders yet.</p> : orders.slice().reverse().map(o => (
            <div key={o.id} style={{ border: `1px solid ${T.border}`, padding: "1.5rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 className="serif" style={{ fontSize: "1.2rem", fontWeight: 300 }}>{o.name}</h3>
                  <p style={{ fontSize: "0.75rem", color: T.smoke }}>{o.email} · {o.address}, {o.city} {o.postcode}</p>
                  <p style={{ fontSize: "0.75rem", color: T.smoke, marginTop: "0.4rem" }}>{o.items?.map(i=>`${i.name} ×${i.qty}`).join(", ")}</p>
                  <p className="serif" style={{ fontSize: "1.1rem", color: T.gold, marginTop: "0.4rem" }}>£{o.total?.toFixed(2)}</p>
                </div>
                <Tag color={statusColor(o.status)}>{o.status}</Tag>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {orderStatuses.filter(s=>s!==o.status).map(s => (
                  <Btn key={s} onClick={()=>updateStatus("order",o.id,s)} variant="ghost" size="sm">→ {s}</Btn>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── ADMIN REVIEWS ──────────────────────────────────────────────────
const AdminReviews = ({ products, toast }) => {
  const [reviews, setReviews] = useState(load(KEYS.reviews, []));

  const del = (id) => {
    if (!confirm("Delete this review?")) return;
    const next = reviews.filter(r=>r.id!==id);
    save(KEYS.reviews, next); setReviews(next); toast("Review deleted");
  };

  const getProduct = (id) => products.find(p=>p.id===id);

  return (
    <div style={{ padding: "3rem 5%" }}>
      <h1 className="serif" style={{ fontSize: "2.5rem", fontWeight: 300, marginBottom: "2rem" }}>Manage <em style={{ color: T.rose, fontStyle: "italic" }}>Reviews</em></h1>
      {reviews.length === 0 ? (
        <p style={{ color: T.smoke }}>No reviews yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1rem" }}>
          {reviews.slice().reverse().map(r => {
            const p = getProduct(r.productId);
            return (
              <div key={r.id} style={{ border: `1px solid ${T.border}`, padding: "1.5rem", position: "relative" }}>
                {p && <Tag color={T.gold}>{p.name}</Tag>}
                <div style={{ margin: "0.8rem 0" }}><Stars rating={r.rating} size={14} /></div>
                <p className="serif" style={{ fontStyle: "italic", fontSize: "0.95rem", color: T.ivory, lineHeight: 1.6, marginBottom: "0.8rem" }}>"{r.comment}"</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "0.65rem", color: T.gold, letterSpacing: "0.2em" }}>— {r.name}</p>
                    <p style={{ fontSize: "0.6rem", color: T.smoke }}>{r.date}</p>
                  </div>
                  <Btn onClick={()=>del(r.id)} variant="danger" size="sm">Delete</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState(() => {
    const stored = load(KEYS.products, null);
    if (!stored || stored.length === 0) { save(KEYS.products, SEED_PRODUCTS); return SEED_PRODUCTS; }
    return stored;
  });
  const [reviews] = useState(() => {
    const stored = load(KEYS.reviews, null);
    if (!stored || stored.length === 0) { save(KEYS.reviews, SEED_REVIEWS); return SEED_REVIEWS; }
    return stored;
  });
  const [cart, setCart] = useState(() => load(KEYS.cart, []));
  const [toastMsg, setToastMsg] = useState(null);

  const toast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const allReviews = load(KEYS.reviews, []);

  const pages = {
    home: <HomePage setView={setView} products={products} reviews={allReviews} />,
    shop: <ShopPage products={products} reviews={allReviews} cart={cart} setCart={setCart} setView={setView} toast={toast} />,
    cart: <CartPage cart={cart} setCart={setCart} toast={toast} />,
    bookings: <BookingsPage toast={toast} />,
    admin_dashboard: <AdminDashboard products={products} setView={setView} />,
    admin_products: <AdminProducts products={products} setProducts={setProducts} toast={toast} />,
    admin_orders: <AdminOrders toast={toast} />,
    admin_reviews: <AdminReviews products={products} toast={toast} />,
  };

  return (
    <>
      <style>{GS}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar view={view} setView={setView} cart={cart} isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
        <main style={{ flex: 1 }}>
          {pages[view] || pages.home}
        </main>
        <footer style={{ borderTop: `1px solid ${T.border}`, padding: "2rem 5%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div className="serif" style={{ fontSize: "1.2rem", fontWeight: 300 }}>Fife <span style={{ color: T.gold }}>Beauty</span> Hub & Spa</div>
          <p style={{ fontSize: "0.65rem", color: T.smoke, letterSpacing: "0.2em" }}>© 2026 · Crafted with care ✦ Made in Scotland</p>
          <div style={{ display: "flex", gap: "1rem" }}>
            {["home","shop","bookings"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{ background:"none",border:"none",color:T.smoke,fontSize:"0.65rem",letterSpacing:"0.2em",textTransform:"uppercase",cursor:"pointer" }}>{v}</button>
            ))}
          </div>
        </footer>
      </div>
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} />}
    </>
  );
}

