document.getElementById("adminForm").addEventListener("submit", function(e){

e.preventDefault();

const name = document.getElementById("productName").value;

const price = document.getElementById("productPrice").value;

const description = document.getElementById("productDescription").value;

const imageInput = document.getElementById("productImage");

const file = imageInput.files[0];

if(!file){

alert("Please select an image.");

return;

}

const reader = new FileReader();

reader.onload = function(event){

const imageURL = event.target.result;

const newProduct = {

name:name,
price:price,
description:description,
image:imageURL

};

let products = JSON.parse(localStorage.getItem("products")) || [];

products.push(newProduct);

localStorage.setItem("products", JSON.stringify(products));

alert("Product uploaded successfully!");

document.getElementById("adminForm").reset();

};

reader.readAsDataURL(file);

});