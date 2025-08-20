const API_URL = 'http://localhost:3000';
let products = [];

async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        products = await response.json();
        renderTable();
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

async function saveProduct(product) {
    const method = product.id ? 'PUT' : 'POST';
    const url = product.id
        ? `${API_URL}/products/${product.id}`
        : `${API_URL}/products`;

    console.log("Saving product to:", url, "Method:", method, "Data:", product);

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(product),
        });

        if (!response.ok) throw new Error('Failed to save product');
        return await response.json();
    } catch (error) {
        console.error('Error saving product:', error);
        throw error;
    }
}

async function deleteProductFromServer(id) {
    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete product');
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
}

function renderTable() {
    const tableBody = document.getElementById("product-table-body");
    tableBody.innerHTML = "";

    products.forEach((product, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${product.id}</td>
            <td><img src="${product.image || 'placeholder.jpg'}" alt="${product.name}" style="width:50px;height:50px;"></td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.description}</td>
            <td>${product.quantity}</td>
            <td>₹${product.price}</td>
            <td>
                <button onclick="editProduct(${index})">Edit</button>
                <button onclick="deleteProduct(${index})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

document.getElementById("save-product-btn").addEventListener("click", async () => {
    const name = document.getElementById("product-name").value.trim();
    const description = document.getElementById("product-description").value.trim();
    const category = document.getElementById("product-category").value.trim();
    const quantity = document.getElementById("product-quantity").value.trim();
    const price = document.getElementById("product-price").value.trim();
    const image = document.getElementById("product-image").value.trim();

    if (!(name && category && quantity && price && description)) {
        alert("Please fill all the required fields......");
        return;
    }

    const existingProductIndex = products.findIndex((product) => product.isEditing);
    console.log(existingProductIndex, "existingProductIndex", products);

    try {
        if (existingProductIndex > -1) {
            const updatedProduct = {
                ...products[existingProductIndex],
                name,
                category,
                description,
                image,
                quantity: parseInt(quantity),
                price: parseFloat(price),
                isEditing: false,
            };
            await saveProduct(updatedProduct);
        } else {
            const newProduct = {
                name,
                category,
                description,
                image: image || 'placeholder.jpg',
                quantity: parseInt(quantity),
                price: parseFloat(price)
            };
            await saveProduct(newProduct);
        }

        // Clear the form
        document.getElementById("product-name").value = "";
        document.getElementById("product-description").value = "";
        document.getElementById("product-category").value = "";
        document.getElementById("product-quantity").value = "";
        document.getElementById("product-price").value = "";
        document.getElementById("product-image").value = "";

        await fetchProducts();
    } catch (error) {
        alert("Error saving product. Please try again.");
    }
});

function editProduct(index) {
    const product = products[index];
    product.isEditing = true;
    document.getElementById("product-name").value = product.name;
    document.getElementById("product-description").value = product.description;
    document.getElementById("product-category").value = product.category;
    document.getElementById("product-quantity").value = product.quantity;
    document.getElementById("product-price").value = product.price;
    document.getElementById("product-image").value = product.image || '';
}

async function deleteProduct(index) {
    const product = products[index];
    if (confirm(`Do you really want to delete the product ${product.name}?`)) {
        try {
            await deleteProductFromServer(product.id);
            await fetchProducts();
        } catch (error) {
            alert("Deleting product failed. Please try again.");
        }
    }
}

window.onload = fetchProducts;