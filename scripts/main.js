// Current Year
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

// Last Modified
const lastModified = document.querySelector("#lastModified");
if (lastModified) {
    lastModified.textContent = `Last Modified: ${document.lastModified}`;
}

// Products Array
const products = [
    {
        name: "Luxury Body Spa Oil",
        price: "₦33,000",
        category: "Spa Treatment",
        image: "images/spa-oil.webp"
    },
    {
        name: "Vitamin C Glow Serum",
        price: "₦48,000",
        category: "Facial Care",
        image: "images/serum.webp"
    },
    {
        name: "Relaxation Face Mask",
        price: "₦28,000",
        category: "Spa Essentials",
        image: "images/facemask.webp"
    },
    {
        name: "Organic Skin Moisturizer",
        price: "₦42,000",
        category: "Skin Therapy",
        image: "images/moisturizer.webp"
    },
    {
        name: "Aromatherapy Candle Set",
        price: "₦30,000",
        category: "Spa Accessories",
        image: "images/candle.webp"
    }
];

// Product Display
const productGrid = document.querySelector(".product-grid");

function displayProducts() {
    if (!productGrid) return;

    productGrid.innerHTML = "";

    products.forEach(product => {
        productGrid.innerHTML += `
            <article class="card fade-in">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                <div class="card-content">
                    <h3>${product.name}</h3>
                    <p class="category">${product.category}</p>
                    <p class="price">${product.price}</p>
                    <button class="buy-btn">Book / Order</button>
                </div>
            </article>
        `;
    });
}

// Cart Counter
function updateCart() {
    let cartCount = localStorage.getItem("cartCount") || 0;
    const cartDisplay = document.querySelector("#cartCount");

    if (cartDisplay) {
        cartDisplay.textContent = cartCount;
    }
}

// Buttons
function activateButtons() {
    const buttons = document.querySelectorAll(".buy-btn");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            let cartCount = localStorage.getItem("cartCount") || 0;
            cartCount++;

            localStorage.setItem("cartCount", cartCount);
            updateCart();

            button.textContent = "Added ✓";

            setTimeout(() => {
                button.textContent = "Book / Order";
            }, 2000);
        });
    });
}

// Run
document.addEventListener("DOMContentLoaded", () => {
    displayProducts();
    updateCart();

    setTimeout(() => {
        activateButtons();
    }, 200);
});