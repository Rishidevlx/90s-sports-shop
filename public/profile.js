// --- API BASE URL & GLOBAL VARS ---
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost ? 'http://localhost:3000' : '';
let userProfile = JSON.parse(localStorage.getItem('userProfile'));
let currentModalProductId = null;

// --- DOM ELEMENTS ---
const profileContentArea = document.getElementById('profile-content-area');
const profileMenuItems = document.querySelectorAll('.profile-menu li');
// Modal DOM Elements (for wishlist click)
const productModal = document.getElementById('product-modal');
const modalOverlay = productModal.querySelector('.product-modal-overlay');
const closeModalBtn = productModal.querySelector('.close-modal-btn');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (!userProfile) {
        window.location.href = 'login.html';
        return;
    }
    // Load sidebar info
    document.getElementById('sidebar-profile-pic').src = userProfile.picture || `https://placehold.co/90x90/ff6600/FFF?text=${userProfile.name.charAt(0)}`;
    document.getElementById('sidebar-user-name').textContent = userProfile.name;
    document.getElementById('sidebar-user-email').textContent = userProfile.email;

    // Load initial content (My Profile)
    navigateTo('my-profile');

    // Setup menu item clicks
    profileMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            profileMenuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            navigateTo(item.dataset.content);
        });
    });

    // Setup modal close buttons
    if(closeModalBtn) closeModalBtn.addEventListener('click', () => productModal.style.display = 'none');
    if(modalOverlay) modalOverlay.addEventListener('click', () => productModal.style.display = 'none');
});

// --- NAVIGATION ---
function navigateTo(contentId) {
    profileContentArea.innerHTML = '<div class="loader"></div>';
    switch (contentId) {
        case 'my-profile':
            renderMyProfileContent();
            break;
        case 'my-orders':
            renderMyOrdersContent();
            break;
        case 'wishlist':
            renderWishlistContent();
            break;
        case 'payments':
            renderPaymentHistoryContent();
            break;
        case 'security':
            renderSecurityContent();
            break;
        default:
            profileContentArea.innerHTML = '<h2>Content not found</h2>';
    }
}

// --- CONTENT RENDERERS ---

// 1. MY PROFILE
async function renderMyProfileContent() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user?email=${userProfile.email}`);
        const userData = await response.json();
        
        profileContentArea.innerHTML = `
            <div class="content-section">
                <h2>My Profile</h2>
                <form id="profile-form" class="profile-form">
                    <div class="form-row">
                        <div class="form-group"><label for="name">Full Name</label><input type="text" id="name" value="${userData.name || ''}" required></div>
                        <div class="form-group"><label for="email">Email Address</label><input type="email" id="email" value="${userData.email || ''}" disabled></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label for="phone">Phone Number</label><input type="tel" id="phone" value="${userData.phone || ''}"></div>
                        <div class="form-group"><label for="dob">Date of Birth</label><input type="date" id="dob" value="${userData.dob || ''}"></div>
                    </div>
                    <div class="form-actions"><button type="submit" class="save-btn">Save Changes</button></div>
                </form>
            </div>`;
        document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
    } catch (error) {
        profileContentArea.innerHTML = '<h2>Could not load profile data.</h2>';
    }
}

// 2. MY ORDERS
async function renderMyOrdersContent() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/my-orders?email=${userProfile.email}`);
        const orders = await response.json();
        let ordersHtml = '<div class="content-section"><h2>My Orders</h2>';
        if (orders.length === 0) {
            ordersHtml += '<p>You have not placed any orders yet.</p>';
        } else {
            orders.forEach(order => {
                ordersHtml += `
                    <div class="order-card">
                        <div class="order-header">
                            <span class="order-id">Order #${order.id}</span>
                            <span class="order-status ${order.status}">${order.status}</span>
                        </div>
                        <div class="order-details">
                            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                            <p><strong>Total:</strong> ₹${parseFloat(order.total_amount).toLocaleString('en-IN')}</p>
                            <p><strong>Payment:</strong> ${order.payment_method}</p>
                        </div>
                        <div class="order-actions">
                             <button class="view-details-btn" data-order-id="${order.id}">View Details</button>
                             ${order.status === 'Pending' ? `<button class="cancel-btn" data-order-id="${order.id}">Cancel Order</button>` : ''}
                        </div>
                    </div>`;
            });
        }
        ordersHtml += '</div>';
        profileContentArea.innerHTML = ordersHtml;

        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', handleCancelOrder);
        });
        
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', handleViewOrderDetails);
        });

    } catch (error) {
        profileContentArea.innerHTML = '<h2>Could not load orders.</h2>';
    }
}

// 3. WISHLIST
async function renderWishlistContent() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/wishlist?email=${userProfile.email}`);
        if (!response.ok) throw new Error('Failed to fetch wishlist from server.');
        
        const wishlistItems = await response.json();
        let wishlistHtml = '<div class="content-section"><h2>My Wishlist</h2>';

        if (wishlistItems.length === 0) {
            wishlistHtml += '<p>Your wishlist is empty. Add items from the shop!</p>';
        } else {
            wishlistHtml += '<div class="wishlist-grid">';
            wishlistItems.forEach(item => {
                wishlistHtml += `
                    <div class="wishlist-item" data-product-id="${item.id}">
                        <button class="remove-wishlist-btn" data-product-id="${item.id}">&times;</button>
                        <img src="${item.imageUrl}" alt="${item.name}">
                        <h4>${item.name}</h4>
                        <p>₹${(item.discountPrice || item.regularPrice).toLocaleString()}</p>
                    </div>`;
            });
            wishlistHtml += '</div>';
        }
        wishlistHtml += '</div>';
        profileContentArea.innerHTML = wishlistHtml;
        
        profileContentArea.querySelectorAll('.wishlist-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('.remove-wishlist-btn')) {
                   openProductModal(item.dataset.productId);
                }
            });
        });
        profileContentArea.querySelectorAll('.remove-wishlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleRemoveFromWishlist(btn.dataset.productId);
            });
        });

    } catch (error) {
        profileContentArea.innerHTML = '<h2>Could not load wishlist.</h2>';
    }
}

// 4. PAYMENTS
async function renderPaymentHistoryContent() {
     try {
        const response = await fetch(`${API_BASE_URL}/api/payment-history?email=${userProfile.email}`);
        const history = await response.json();
        const totalSpent = history.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
        let historyHtml = `
            <div class="content-section">
                <h2>Payment History</h2>
                <div class="total-spent-card">
                    <p>Total Spent</p>
                    <h3>${totalSpent.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</h3>
                </div>
                <div class="payment-history-list">`;
        if (history.length === 0) {
            historyHtml += '<p>No payment history found.</p>';
        } else {
            history.forEach(order => {
                historyHtml += `
                    <div class="order-card">
                        <div class="order-header">
                             <span class="order-id">Order #${order.id} (${new Date(order.created_at).toLocaleDateString()})</span>
                        </div>
                        <div class="order-details">
                             <p><strong>Products:</strong> ${order.products}</p>
                             <p><strong>Amount:</strong> ₹${parseFloat(order.total_amount).toLocaleString('en-IN')} | <strong>Method:</strong> ${order.payment_method}</p>
                        </div>
                    </div>`;
            });
        }
        historyHtml += '</div></div>';
        profileContentArea.innerHTML = historyHtml;

    } catch (error) {
        profileContentArea.innerHTML = '<h2>Could not load payment history.</h2>';
    }
}

// 5. SECURITY
function renderSecurityContent() {
    profileContentArea.innerHTML = `
        <div class="content-section">
            <h2>Security Settings</h2>
            <form id="security-form" class="security-form">
                <h4>Change Password</h4>
                <div class="input-group">
                    <i class="fas fa-lock"></i>
                    <input type="password" id="current-password" placeholder="Current Password" required />
                    <i class="fas fa-eye-slash eye-icon" data-target="current-password"></i>
                </div>
                <div class="input-group">
                    <i class="fas fa-lock"></i>
                    <input type="password" id="new-password" placeholder="New Password" required />
                    <i class="fas fa-eye-slash eye-icon" data-target="new-password"></i>
                </div>
                <div class="input-group">
                    <i class="fas fa-lock"></i>
                    <input type="password" id="confirm-new-password" placeholder="Confirm New Password" required />
                    <i class="fas fa-eye-slash eye-icon" data-target="confirm-new-password"></i>
                </div>
                <div class="form-actions">
                    <button type="submit" class="save-btn">Update Password</button>
                </div>
            </form>
        </div>`;
    document.getElementById('security-form').addEventListener('submit', handleChangePassword);
    document.querySelectorAll('.eye-icon').forEach(icon => {
        icon.addEventListener('click', togglePasswordVisibility);
    });
}


// --- EVENT HANDLERS & LOGIC ---

async function handleProfileUpdate(e) {
    e.preventDefault();
    const updatedUser = {
        name: document.getElementById('name').value,
        email: userProfile.email,
        phone: document.getElementById('phone').value,
        dob: document.getElementById('dob').value,
        originalEmail: userProfile.email
    };
    try {
        const response = await fetch(`${API_BASE_URL}/api/user`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        
        localStorage.setItem('userProfile', JSON.stringify(result.user));
        userProfile = result.user;
        document.getElementById('sidebar-user-name').textContent = result.user.name;

        showToast('Profile updated successfully!', true);
    } catch (error) {
        showToast(error.message || 'Failed to update profile.', false);
    }
}

async function handleCancelOrder(e) {
    const orderId = e.target.dataset.orderId;
    if (confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, { method: 'PUT' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            showToast('Order cancelled. Refund will be processed in 2 business days if paid.', true);
            renderMyOrdersContent();
        } catch (error) {
            showToast(error.message || 'Failed to cancel order.', false);
        }
    }
}

function handleViewOrderDetails(e) {
    const orderId = e.target.dataset.orderId;
    localStorage.setItem('viewOrderId', orderId);
    window.location.href = 'order-confirmation.html';
}

async function handleRemoveFromWishlist(productId) {
     try {
        const response = await fetch(`${API_BASE_URL}/api/wishlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userProfile.email, productId: productId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showToast('Item removed from wishlist.', true);
        renderWishlistContent();
    } catch (error) {
        showToast(error.message || 'Failed to remove item.', false);
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    if (newPassword !== confirmNewPassword) {
        return showToast('New passwords do not match.', false);
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userProfile.email, currentPassword, newPassword })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showToast(result.message, true);
        e.target.reset();
    } catch (error) {
        showToast(error.message || 'Failed to change password.', false);
    }
}

function togglePasswordVisibility(e) {
    const targetInput = document.getElementById(e.target.dataset.target);
    if (targetInput.type === 'password') {
        targetInput.type = 'text';
        e.target.classList.replace('fa-eye-slash', 'fa-eye');
    } else {
        targetInput.type = 'password';
        e.target.classList.replace('fa-eye', 'fa-eye-slash');
    }
}

// --- MODAL LOGIC ---
async function openProductModal(productId) {
    currentModalProductId = productId;
    try {
        const productRes = await fetch(`${API_BASE_URL}/api/products/${productId}`);
        if (!productRes.ok) throw new Error('Product not found');
        const product = await productRes.json();
        
        productModal.querySelector('#modal-title').textContent = product.name;
        productModal.querySelector('#modal-image').src = product.imageUrl;
        productModal.querySelector('#modal-description').textContent = product.description;

        const currentPrice = product.discountPrice || product.regularPrice;
        productModal.querySelector('#modal-discount-price').textContent = `₹${currentPrice.toLocaleString()}`;
        productModal.querySelector('#modal-original-price').textContent = (product.discountPrice && product.regularPrice) ? `₹${product.regularPrice.toLocaleString()}` : '';
        
        const addToCartBtn = productModal.querySelector('.add-to-cart-btn-modal');
        const buyNowBtn = productModal.querySelector('.buy-now-btn-modal');

        // ==========================================================
        // === PUDHU CORRECTION: STOCK CHECK FOR WISHLIST MODAL ====
        // ==========================================================
        if (product.stock === 0) {
            addToCartBtn.disabled = true;
            buyNowBtn.disabled = true;
        } else {
            addToCartBtn.disabled = false;
            buyNowBtn.disabled = false;
        }

        addToCartBtn.onclick = () => {
            window.addToCart({ 
                id: product.id, name: product.name, price: currentPrice, 
                imageUrl: product.imageUrl, category: product.category 
            });
            showToast(`${product.name} added to cart!`, true);
        };

        buyNowBtn.onclick = () => {
            const productToBuy = { 
                id: product.id, name: product.name, price: currentPrice, 
                imageUrl: product.imageUrl, category: product.category, quantity: 1 
            };
            sessionStorage.setItem('buyNowItem', JSON.stringify(productToBuy));
            window.location.href = 'checkout.html';
        };

        productModal.style.display = 'flex';
    } catch (error) {
        showToast('Could not load product details.', false);
    }
}
