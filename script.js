const API_URL = 'http://localhost:3000';

// Common functions
async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        return await response.json();
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

async function updateProductQuantity(id, newQuantity) {
    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: newQuantity })
        });
        if (!response.ok) throw new Error('Failed to update product quantity');
        return await response.json();
    } catch (error) {
        console.error('Error updating product quantity:', error);
    }
}

// Cart functions
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) cartCountElement.textContent = count;
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

async function addToCart(productId, quantity = 1) {
    const products = await fetchProducts();
    const product = products.find(p => String(p.id) === String(productId));
    const existingItem = cart.find(item => item.id === productId);
    const totalRequested = (existingItem?.quantity || 0) + quantity;

    if (!product || product.quantity < totalRequested) {
        alert('Not enough stock available');
        return;
    }

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity,
            image: product.image
        });
    }

    saveCart();
    return true;
}

async function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
}

async function updateCartItemQuantity(productId, newQuantity) {
    const products = await fetchProducts();
    const product = products.find(p => String(p.id) === String(productId));
    const item = cart.find(item => item.id === productId);

    if (item && product && newQuantity <= product.quantity) {
        item.quantity = parseInt(newQuantity);
        saveCart();
    } else {
        alert('Requested quantity exceeds available stock');
    }
}

// Catalog Page
if (document.getElementById('product-container')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const products = await fetchProducts();
        const productContainer = document.getElementById('product-container');

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            const disabled = product.quantity === 0 ? 'disabled' : '';
            const buttonText = product.quantity === 0 ? 'Out of Stock' : 'Add to Cart';

            productCard.innerHTML = `
                <img src="${product.image || 'placeholder.jpg'}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-category">${product.category}</p>
                    <p class="product-description">${product.description}</p>
                    <p class="product-quantity">Available: ${product.quantity}</p>
                    <p class="product-price">₹${product.price}</p>
                    <button onclick="addToCart('${product.id}', 1)" class="btn" ${disabled}>${buttonText}</button>
                </div>
            `;
            productContainer.appendChild(productCard);
        });

        updateCartCount();
    });
}

// Admin Authentication
const ADMIN_CODE = 'admin955055';
if (document.getElementById('admin-btn')) {
    document.getElementById('admin-btn').addEventListener('click', () => {
        document.getElementById('admin-auth').style.display = 'block';
    });

    document.getElementById('submit-code').addEventListener('click', () => {
        const code = document.getElementById('admin-code').value;
        if (code === ADMIN_CODE) {
            window.location.href = 'admin/inventory.html';
        } else {
            alert('Invalid admin code');
        }
    });
}

// Checkout Page
if (document.getElementById('cart-items')) {
    document.addEventListener('DOMContentLoaded', async () => {
        renderCart();

        document.getElementById('proceed-btn').addEventListener('click', () => {
            if (cart.length === 0) {
                alert('Your cart is empty!');
                return;
            }
            document.getElementById('payment-form').style.display = 'block';
            document.getElementById('cart-items').style.display = 'none';
            document.getElementById('proceed-btn').style.display = 'none';
            document.getElementById('payment-btn').style.display = 'block';
        });

        document.getElementById('payment-btn').addEventListener('click', async () => {
            const userConfirmed = confirm('Confirm to place your order?');
            if (!userConfirmed) return;

            const products = await fetchProducts();
            for (const item of cart) {
                const product = products.find(p => String(p.id) === String(item.id));
                if (!product || product.quantity < item.quantity) {
                    alert(`Sorry, ${item.name} is out of stock or quantity unavailable`);
                    renderCart();
                    return;
                }
            }

            try {
                const orderDetails = {
                    items: cart.map(item => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        image: item.image,
                        total: item.price * item.quantity
                    })),
                    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
                    date: new Date().toLocaleString()
                };

                localStorage.setItem('lastOrder', JSON.stringify(orderDetails));

                for (const item of cart) {
                    const product = products.find(p => String(p.id) === String(item.id));
                    if (product) {
                        const newQuantity = product.quantity - item.quantity;
                        await updateProductQuantity(item.id, newQuantity);
                        await fetch(`${API_URL}/orders`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                productId: item.id,
                                name: item.name,
                                quantity: item.quantity,
                                price: item.price,
                                date: new Date().toISOString()
                            })
                        });
                    }
                }

                cart = [];
                saveCart();
                window.location.href = 'order-success.html';
            } catch (error) {
                console.error('Payment failed:', error);
                alert('Payment failed. Please try again.');
            }
        });
    });
}

// Cart Renderer
function renderCart() {
    const cartItemsElement = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    if (!cartItemsElement) return;

    cartItemsElement.innerHTML = '';
    if (cart.length === 0) {
        cartItemsElement.innerHTML = '<tr><td colspan="5">Your cart is empty</td></tr>';
        document.getElementById('proceed-btn').style.display = 'none';
        return;
    }

    let total = 0;
    cart.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <img src="${item.image || 'placeholder.jpg'}" alt="${item.name}" style="width:50px;height:50px;">
                <div>
                    <strong>${item.name}</strong><br>
                    <small>${item.category || ''}</small>
                </div>
            </td>
            <td>₹${item.price}</td>
            <td>
                <input type="number" value="${item.quantity}" min="1"
                       onchange="updateCartItemQuantity('${item.id}', this.value)">
            </td>
            <td>₹${item.price * item.quantity}</td>
            <td><button onclick="removeFromCart('${item.id}')">Remove</button></td>
        `;
        cartItemsElement.appendChild(row);
        total += item.price * item.quantity;
    });

    cartTotalElement.textContent = `₹${total}`;
    document.getElementById('proceed-btn').style.display = 'block';
}

// Payment Confirmation
if (document.getElementById('confirm-payment')) {
    document.getElementById('confirm-payment').addEventListener('click', () => {
        alert('Payment method added successfully!');
    });
}

// Order Success Page
if (document.getElementById('order-details')) {
    document.addEventListener('DOMContentLoaded', () => {
        const orderDetails = JSON.parse(localStorage.getItem('lastOrder'));
        const orderDetailsElement = document.getElementById('order-details');

        if (orderDetails) {
            orderDetailsElement.innerHTML = `
                <p><strong>Order Date:</strong> ${orderDetails.date}</p>
                <h3>Order Summary:</h3>
                ${orderDetails.items.map(item => `
                    <div class="order-item">
                        <span>${item.quantity} x ${item.name}</span>
                        <span>₹${item.total}</span>
                    </div>
                `).join('')}
                <div class="order-item" style="font-weight:bold; border-top:1px solid #ddd; padding-top:8px;">
                    <span>Total</span>
                    <span>₹${orderDetails.total}</span>
                </div>
            `;
            localStorage.removeItem('lastOrder');
        } else {
            orderDetailsElement.innerHTML = '<p>No order details found.</p>';
        }
    });
}