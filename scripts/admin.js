/* ========================= */
/* FILE: admin.js */
/* ========================= */

const productForm =
document.getElementById("productForm");

const adminProducts =
document.getElementById("adminProducts");

productForm.addEventListener("submit",
function(e){

  e.preventDefault();

  const name =
  document.getElementById("productName").value;

  const price =
  document.getElementById("productPrice").value;

  const image =
  document.getElementById("productImage").value;

  const product =
  document.createElement("div");

  product.classList.add("admin-product");

  product.innerHTML = `
    <img src="${image}"
    width="100%"
    style="border-radius:15px">

    <h3>${name}</h3>

    <p>${price}</p>
  `;

  adminProducts.appendChild(product);

  productForm.reset();

});