/* ================= REVIEWS ================= */

const reviewForm =
document.getElementById("reviewForm");

const reviewList =
document.getElementById("reviewList");

reviewForm.addEventListener("submit",
function(e){

    e.preventDefault();

    const name =
    document.getElementById("name").value;

    const review =
    document.getElementById("review").value;

    const reviewCard =
    document.createElement("div");

    reviewCard.classList.add("review-card");

    reviewCard.innerHTML = `
        <h3>${name}</h3>
        <p>${review}</p>
    `;

    reviewList.appendChild(reviewCard);

    reviewForm.reset();

});

/* ================= SHOPPING CART ================= */

const cartIcon =
document.querySelector(".fa-cart-shopping");

const cartSidebar =
document.getElementById("cartSidebar");

const closeCart =
document.getElementById("closeCart");

const addCartButtons =
document.querySelectorAll(".add-cart");

const cartItems =
document.getElementById("cartItems");

const cartTotal =
document.getElementById("cartTotal");

let total = 0;

/* OPEN CART */

cartIcon.addEventListener("click", () => {
    cartSidebar.classList.add("active");
});

/* CLOSE CART */

closeCart.addEventListener("click", () => {
    cartSidebar.classList.remove("active");
});

/* ADD PRODUCTS */

addCartButtons.forEach(button => {

    button.addEventListener("click", () => {

        const name =
        button.getAttribute("data-name");

        const price =
        button.getAttribute("data-price");

        total += Number(price);

        cartTotal.innerText = total;

        const cartItem =
        document.createElement("div");

        cartItem.classList.add("cart-item");

        cartItem.innerHTML = `
            <p>${name}</p>
            <span>$${price}</span>
        `;

        cartItems.appendChild(cartItem);

        cartSidebar.classList.add("active");

    });

});