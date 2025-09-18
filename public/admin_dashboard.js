document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL VARS & API URL ---
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE_URL = isLocalhost ? 'http://localhost:3000' : '';
    let currentEditProductId = null;
    let allAdminProducts = []; 
    let allAdminOrders = []; 
    let allAdminReviews = [];
    let allAdminUsers = []; // PUDHU GLOBAL VARIABLE (Users kaaga)

    // --- DOM ELEMENTS ---
    const mainContent = document.getElementById('main-content');
    const navItems = document.querySelectorAll('.nav-item');
    const productModal = document.getElementById('product-modal');
    const closeModalBtn = productModal.querySelector('.close-modal-btn');
    const productForm = document.getElementById('product-form');

    // --- AUTHENTICATION & INITIALIZATION ---
    const adminProfile = JSON.parse(sessionStorage.getItem('adminProfile'));
    if (!adminProfile) {
        window.location.href = 'login.html';
        return;
    }
    
    navigateTo('dashboard'); 

    // --- EVENT LISTENERS ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.currentTarget.id === 'admin-logout-btn') {
                sessionStorage.removeItem('adminProfile');
                window.location.href = 'login.html';
                return;
            }
            navItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            navigateTo(e.currentTarget.dataset.target);
        });
    });

    closeModalBtn.addEventListener('click', () => productModal.style.display = 'none');
    productForm.addEventListener('submit', handleFormSubmit);

    // --- NAVIGATION LOGIC ---
    function navigateTo(target) {
        mainContent.innerHTML = '<div class="loader"></div>';
        
        navItems.forEach(nav => {
            if (nav.dataset.target === target) {
                nav.classList.add('active');
            } else {
                nav.classList.remove('active');
            }
        });
        
        switch (target) {
            case 'dashboard':
                renderDashboard();
                break;
            case 'products':
                renderProductsPage();
                break;
            case 'orders':
                renderOrdersPage();
                break;
            case 'reviews':
                renderReviewsPage();
                break;
            // ===============================================
            // === PUDHU FEATURE: USERS PAGE NAVIGATION ======
            // ===============================================
            case 'users':
                renderUsersPage();
                break;
            default:
                mainContent.innerHTML = `<div class="products-page-container"><h2>${target.charAt(0).toUpperCase() + target.slice(1)}</h2><p>This section is under construction.</p></div>`;
        }
    }

    // --- RENDER FUNCTIONS ---
    async function renderDashboard() {
        try {
            const [statsRes, productsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/admin/stats`),
                fetch(`${API_BASE_URL}/api/admin/products`)
            ]);

            if (!statsRes.ok || !productsRes.ok) throw new Error('Failed to load dashboard data.');

            const stats = await statsRes.json();
            const products = await productsRes.json();
            allAdminProducts = products;
            const totalRevenue = stats.totalRevenue ? `₹${parseFloat(stats.totalRevenue).toLocaleString('en-IN')}` : '₹0.00';

            const statsHtml = `
                <div class="dashboard-overview">
                    <div class="stat-card revenue">
                        <div class="stat-icon"><i class="fas fa-rupee-sign"></i></div>
                        <div class="stat-info"><p>Total Revenue</p><h3>${totalRevenue}</h3></div>
                    </div>
                    <div class="stat-card orders clickable" data-target="orders">
                        <div class="stat-icon"><i class="fas fa-shopping-cart"></i></div>
                        <div class="stat-info"><p>Total Orders</p><h3>${stats.totalOrders}</h3></div>
                    </div>
                    <div class="stat-card products clickable" data-target="products">
                        <div class="stat-icon"><i class="fas fa-box-open"></i></div>
                        <div class="stat-info"><p>Total Products</p><h3>${stats.totalProducts}</h3></div>
                    </div>
                </div>`;
            
            mainContent.innerHTML = `<h1>Dashboard Overview</h1>${statsHtml}<div id="dashboard-product-list"></div>`;
            renderProductTable(products.slice(0, 5), 'dashboard-product-list', 'Recently Added Products');
            
            mainContent.querySelectorAll('.clickable').forEach(card => card.addEventListener('click', (e) => navigateTo(e.currentTarget.dataset.target)));

        } catch (error) {
            mainContent.innerHTML = '<h2>Error loading dashboard.</h2>';
        }
    }

    async function renderProductsPage() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/products`);
            if (!response.ok) throw new Error('Failed to fetch products.');

            allAdminProducts = await response.json();

            mainContent.innerHTML = `
                <div class="products-page-container">
                    <div class="content-header">
                        <h1>Manage Products</h1>
                        <div class="filter-controls">
                            <select id="stock-filter" class="stock-filter">
                                <option value="all">All Stock Levels</option>
                                <option value="in-stock">In Stock (> 10)</option>
                                <option value="low-stock">Low Stock (1-10)</option>
                                <option value="out-of-stock">Out of Stock (0)</option>
                            </select>
                            <input type="text" id="product-search-bar" class="search-bar" placeholder="Search by name or brand...">
                             <button class="add-new-btn" id="download-all-products-btn" style="background-color: #28a745;">
                                <i class="fas fa-file-pdf"></i> Download All
                            </button>
                        </div>
                        <button class="add-new-btn" id="add-product-btn">Add New Product</button>
                    </div>
                    <div id="products-table-container"></div>
                </div>`;
            
            renderProductTable(allAdminProducts, 'products-table-container');

            document.getElementById('add-product-btn').addEventListener('click', openAddModal);
            document.getElementById('product-search-bar').addEventListener('input', applyAdminProductFilters);
            document.getElementById('stock-filter').addEventListener('change', applyAdminProductFilters);
            document.getElementById('download-all-products-btn').addEventListener('click', handleAllProductsDownload); 

        } catch (error) {
            mainContent.innerHTML = '<h2>Error loading products.</h2>';
        }
    }
    
    async function renderOrdersPage() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/orders`);
            if (!response.ok) throw new Error('Failed to fetch orders.');
            allAdminOrders = await response.json();

            mainContent.innerHTML = `
                <div class="products-page-container">
                    <div class="content-header">
                        <h1>Manage Orders</h1>
                         <div class="filter-controls">
                            <input type="text" id="order-search-bar" class="search-bar" placeholder="Search by ID, Customer, Email...">
                            <button id="download-all-orders-btn" class="add-new-btn" style="background-color: #007bff;">
                                <i class="fas fa-file-pdf"></i> Download All
                            </button>
                        </div>
                    </div>
                    <div id="orders-table-container"></div>
                </div>`;

            renderOrdersTable(allAdminOrders);
            document.getElementById('order-search-bar').addEventListener('input', applyAdminOrderFilters);
            document.getElementById('download-all-orders-btn').addEventListener('click', () => handleAllOrdersDownload(allAdminOrders));
            
        } catch (error) {
             mainContent.innerHTML = '<h2>Error loading orders.</h2>';
        }
    }
    
    async function renderReviewsPage() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/reviews`);
            if (!response.ok) throw new Error('Failed to fetch reviews.');
            allAdminReviews = await response.json();
            
            mainContent.innerHTML = `
                <div class="products-page-container">
                    <div class="content-header">
                        <h1>Manage Reviews</h1>
                         <div class="filter-controls">
                            <input type="text" id="review-search-bar" class="search-bar" placeholder="Search by Product Name...">
                        </div>
                    </div>
                    <div id="reviews-table-container"></div>
                </div>`;

            renderReviewsTable(allAdminReviews);
            document.getElementById('review-search-bar').addEventListener('input', applyAdminReviewFilters);
            
        } catch (error) {
            mainContent.innerHTML = '<h2>Error loading reviews.</h2>';
        }
    }
    
    // ==========================================================
    // === PUDHU FEATURE: USERS PAGE RENDER PANNURA LOGIC =======
    // ==========================================================
    async function renderUsersPage() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users`);
            if (!response.ok) throw new Error('Failed to fetch users.');
            allAdminUsers = await response.json();

            mainContent.innerHTML = `
                <div class="products-page-container">
                    <div class="content-header">
                        <h1>Manage Users</h1>
                        <div class="filter-controls">
                            <input type="text" id="user-search-bar" class="search-bar" placeholder="Search by User Name...">
                            <button id="download-all-users-btn" class="add-new-btn" style="background-color: #17a2b8;">
                                <i class="fas fa-file-pdf"></i> Download All Users
                            </button>
                        </div>
                    </div>
                    <div id="users-table-container"></div>
                </div>`;
            
            renderUsersTable(allAdminUsers);
            document.getElementById('user-search-bar').addEventListener('input', applyAdminUserFilters);
            document.getElementById('download-all-users-btn').addEventListener('click', () => handleAllUsersDownload(allAdminUsers));

        } catch (error) {
            mainContent.innerHTML = '<h2>Error loading users.</h2>';
        }
    }

    function renderUsersTable(users) {
        const container = document.getElementById('users-table-container');
        if (!container) return;
        
        const userRows = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td class="actions-cell">
                    <button class="action-icon-btn download-single-user-btn" data-id="${user.id}" title="Download User Report">
                        <i class="fas fa-file-download"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        container.innerHTML = `
            <table class="content-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Joined On</th>
                        <th class="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${userRows.length > 0 ? userRows : '<tr><td colspan="7" style="text-align:center;">No users found.</td></tr>'}
                </tbody>
            </table>
        `;
        
        container.querySelectorAll('.download-single-user-btn').forEach(btn => btn.addEventListener('click', e => handleSingleUserDownload(e.currentTarget.dataset.id)));
    }

    function applyAdminUserFilters() {
        const searchTerm = document.getElementById('user-search-bar').value.toLowerCase();
        const filteredUsers = allAdminUsers.filter(u => 
            u.name.toLowerCase().includes(searchTerm)
        );
        renderUsersTable(filteredUsers);
    }

    function renderReviewsTable(reviews) {
        const container = document.getElementById('reviews-table-container');
        if (!container) return;

        const reviewRows = reviews.map(review => {
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            return `
                <tr>
                    <td class="col-product-name">${review.product_name}</td>
                    <td>${review.user_name}</td>
                    <td class="col-rating">${stars}</td>
                    <td class="col-comment">${review.comment_text}</td>
                    <td>${new Date(review.created_at).toLocaleDateString()}</td>
                    <td class="actions-cell">
                        <button class="action-icon-btn delete-btn" data-id="${review.id}" title="Delete Review">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="content-table">
                <thead>
                    <tr>
                        <th class="col-product-name">Product</th>
                        <th>Customer</th>
                        <th class="col-rating">Rating</th>
                        <th class="col-comment">Comment</th>
                        <th>Date</th>
                        <th class="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${reviewRows.length > 0 ? reviewRows : '<tr><td colspan="6" style="text-align:center;">No reviews found.</td></tr>'}
                </tbody>
            </table>
        `;
        
        container.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => confirmAndDeleteReview(e.currentTarget.dataset.id)));
    }
    
    function applyAdminReviewFilters() {
        const searchTerm = document.getElementById('review-search-bar').value.toLowerCase();
        const filteredReviews = allAdminReviews.filter(r => 
            r.product_name.toLowerCase().includes(searchTerm)
        );
        renderReviewsTable(filteredReviews);
    }
    
    function confirmAndDeleteReview(reviewId) {
        const existingModal = document.getElementById('confirm-modal');
        if (existingModal) existingModal.remove();

        const modalHtml = `
            <div class="confirm-modal-backdrop" id="confirm-modal">
                <div class="confirm-modal-content">
                    <h3>Delete Review?</h3>
                    <p>Are you sure you want to permanently delete this review?</p>
                    <div class="confirm-modal-buttons">
                        <button class="cancel-btn">Cancel</button>
                        <button class="confirm-btn">Delete</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalBackdrop = document.getElementById('confirm-modal');
        modalBackdrop.querySelector('.cancel-btn').addEventListener('click', () => modalBackdrop.remove());
        modalBackdrop.querySelector('.confirm-btn').addEventListener('click', async () => {
            modalBackdrop.remove();
            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/reviews/${reviewId}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showToast(result.message, true);
                navigateTo('reviews'); 
            } catch (error) {
                showToast(error.message || 'Could not delete review.', false);
            }
        });
    }

    function renderOrdersTable(orders) {
        const container = document.getElementById('orders-table-container');
        if (!container) return;
        
        const orderRows = orders.map(order => {
            const statusOptions = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];
            const selectOptions = statusOptions.map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`).join('');
            
            return `
                <tr>
                    <td>#${order.id}</td>
                    <td>
                        <div>${order.customer_name}</div>
                        <div class="sub-text">${order.user_email}</div>
                    </td>
                    <td class="col-address">${order.shipping_address}</td>
                    <td>₹${parseFloat(order.total_amount).toLocaleString('en-IN')}</td>
                    <td>
                        <select class="status-select status-${order.status.toLowerCase()}" data-order-id="${order.id}">
                            ${selectOptions}
                        </select>
                    </td>
                     <td class="actions-cell">
                        <button class="action-icon-btn download-single-btn" data-id="${order.id}" title="Download Invoice">
                            <i class="fas fa-file-download"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="content-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th class="col-address">Shipping Address</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderRows.length > 0 ? orderRows : '<tr><td colspan="6" style="text-align:center;">No orders found.</td></tr>'}
                </tbody>
            </table>
        `;
        
        container.querySelectorAll('.status-select').forEach(select => select.addEventListener('change', handleStatusUpdate));
        container.querySelectorAll('.download-single-btn').forEach(btn => btn.addEventListener('click', (e) => handleSingleOrderDownload(e.currentTarget.dataset.id)));
    }
    
    function applyAdminOrderFilters() {
        const searchTerm = document.getElementById('order-search-bar').value.toLowerCase();
        const filteredOrders = allAdminOrders.filter(o => 
            o.id.toString().includes(searchTerm) ||
            o.customer_name.toLowerCase().includes(searchTerm) ||
            o.user_email.toLowerCase().includes(searchTerm)
        );
        renderOrdersTable(filteredOrders);
    }
    
    async function handleStatusUpdate(event) {
        const orderId = event.target.dataset.orderId;
        const newStatus = event.target.value;
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            showToast('Order status updated successfully!', true);
            
            event.target.className = `status-select status-${newStatus.toLowerCase()}`;
            
            const freshResponse = await fetch(`${API_BASE_URL}/api/admin/orders`);
            allAdminOrders = await freshResponse.json();

        } catch (error) {
            showToast(error.message || 'Failed to update status.', false);
        }
    }

    function applyAdminProductFilters() {
        const searchTerm = document.getElementById('product-search-bar').value.toLowerCase();
        const stockFilter = document.getElementById('stock-filter').value;
        
        const filteredProducts = allAdminProducts.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm) || (p.brand && p.brand.toLowerCase().includes(searchTerm));
            
            let matchesStock = true;
            if (stockFilter === 'in-stock') {
                matchesStock = p.stock > 10;
            } else if (stockFilter === 'low-stock') {
                matchesStock = p.stock > 0 && p.stock <= 10;
            } else if (stockFilter === 'out-of-stock') {
                matchesStock = p.stock == 0;
            }
            
            return matchesSearch && matchesStock;
        });
        
        renderProductTable(filteredProducts, 'products-table-container');
    }

    function renderProductTable(products, containerId, title = '') {
        const container = document.getElementById(containerId);
        if (!container) return;

        let productRows = products.map(p => `
            <tr>
                <td class="col-id">${p.id}</td>
                <td class="col-image"><img src="${p.imageUrl}" alt="${p.name}"></td>
                <td class="col-name">${p.name}</td>
                <td class="col-brand">${p.brand || 'N/A'}</td>
                <td class="col-price">₹${(p.discountPrice).toLocaleString('en-IN')}</td>
                <td class="col-stock">${p.stock}</td>
                <td class="col-actions actions-cell">
                    <button class="action-icon-btn edit-btn" data-id="${p.id}" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                    <button class="action-icon-btn delete-btn" data-id="${p.id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    <button class="action-icon-btn download-single-btn" data-id="${p.id}" title="Download Report"><i class="fas fa-file-download"></i></button>
                </td>
            </tr>`).join('');
        
        let headerHtml = '';
        if (title) { 
            headerHtml = `
            <div class="content-header">
                <h2>${title}</h2>
                <button class="add-new-btn" id="add-product-btn-dash">Add Product</button>
            </div>`;
        }

        container.innerHTML = `
            ${headerHtml}
            <table class="content-table">
                <thead>
                    <tr>
                        <th class="col-id">ID</th>
                        <th class="col-image">Image</th>
                        <th class="col-name">Name</th>
                        <th class="col-brand">Brand</th>
                        <th class="col-price">Price</th>
                        <th class="col-stock">Stock</th>
                        <th class="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${productRows.length > 0 ? productRows : '<tr><td colspan="7" style="text-align:center;">No products found.</td></tr>'}
                </tbody>
            </table>
        `;
        
        const addBtnDash = document.getElementById('add-product-btn-dash');
        if(addBtnDash) addBtnDash.addEventListener('click', openAddModal);

        attachActionListeners(container);
    }

    function attachActionListeners(container) {
        container.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => openEditModal(e.currentTarget.dataset.id)));
        container.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => confirmAndDelete(e.currentTarget.dataset.id)));
        container.querySelectorAll('.download-single-btn').forEach(btn => btn.addEventListener('click', (e) => handleSingleProductDownload(e.currentTarget.dataset.id)));
    }
    
    function openAddModal() {
        currentEditProductId = null;
        productForm.reset();
        document.getElementById('modal-title').textContent = 'Add New Product';
        productModal.style.display = 'flex';
    }

    async function openEditModal(productId) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/products/${productId}`);
            const product = await res.json();
            currentEditProductId = productId;
            
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-brand').value = product.brand || '';
            document.getElementById('product-regularPrice').value = product.regularPrice;
            document.getElementById('product-discountPrice').value = product.discountPrice;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-stock').value = product.stock;
            document.getElementById('product-imageUrl').value = product.imageUrl;
            document.getElementById('product-description').value = product.description;

            document.getElementById('modal-title').textContent = 'Edit Product';
            productModal.style.display = 'flex';
        } catch(error) {
            showToast('Could not fetch product details.', false);
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const productData = {
            name: document.getElementById('product-name').value.trim(),
            brand: document.getElementById('product-brand').value.trim() || 'N/A',
            regularPrice: document.getElementById('product-regularPrice').value || null,
            discountPrice: document.getElementById('product-discountPrice').value,
            category: document.getElementById('product-category').value.trim(),
            stock: document.getElementById('product-stock').value || 0,
            imageUrl: document.getElementById('product-imageUrl').value.trim(),
            description: document.getElementById('product-description').value.trim()
        };
        
        if (!productData.name || !productData.discountPrice || !productData.category || !productData.imageUrl) {
            return showToast('Please fill all required fields.', false);
        }

        const method = currentEditProductId ? 'PUT' : 'POST';
        const url = currentEditProductId 
            ? `${API_BASE_URL}/api/admin/products/${currentEditProductId}`
            : `${API_BASE_URL}/api/admin/products`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            const result = await response.json();
            if(!response.ok) throw new Error(result.message);

            showToast(`Product ${currentEditProductId ? 'updated' : 'added'} successfully!`, true);
            productModal.style.display = 'none';
            
            const activeTab = document.querySelector('.nav-item.active').dataset.target;
            navigateTo(activeTab);

        } catch (error) {
            showToast(error.message || 'An error occurred.', false);
        }
    }
    
    function confirmAndDelete(productId) {
        const existingModal = document.getElementById('confirm-modal');
        if (existingModal) existingModal.remove();

        const modalHtml = `
            <div class="confirm-modal-backdrop" id="confirm-modal">
                <div class="confirm-modal-content">
                    <h3>Are you sure?</h3>
                    <p>This action cannot be undone. The product will be permanently deleted.</p>
                    <div class="confirm-modal-buttons">
                        <button class="cancel-btn">Cancel</button>
                        <button class="confirm-btn">Delete</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalBackdrop = document.getElementById('confirm-modal');
        modalBackdrop.querySelector('.cancel-btn').addEventListener('click', () => modalBackdrop.remove());
        modalBackdrop.querySelector('.confirm-btn').addEventListener('click', async () => {
            modalBackdrop.remove();
            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/products/${productId}`, { method: 'DELETE' });
                const result = await response.json();
                 if(!response.ok) throw new Error(result.message);
                showToast('Product deleted successfully!', true);
                navigateTo(document.querySelector('.nav-item.active').dataset.target);
            } catch (error) {
                showToast(error.message || 'Could not delete product.', false);
            }
        });
    }
    
    function imageToBase64(url, callback) {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() {
            const reader = new FileReader();
            reader.onloadend = function() {
                callback(reader.result);
            }
            reader.readAsDataURL(xhr.response);
        };
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();
    }
    
    async function handleSingleOrderDownload(orderId) {
        showToast('Generating Invoice PDF...', true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`);
            if (!res.ok) throw new Error('Could not fetch order data.');
            const order = await res.json();

            generateInvoicePDF(order, `Order_Invoice_${order.id}.pdf`);
        } catch(error) {
            showToast(error.message, false);
        }
    }

    function handleAllOrdersDownload(orders) {
        if (orders.length === 0) return showToast('No orders to download.', false);
        showToast('Generating All Orders PDF...', true);
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        imageToBase64('Asset/logo.png', function(base64Img) {
            const img = new Image();
            img.src = base64Img;
            img.onload = function() {
                doc.setFontSize(18);
                doc.text("All Orders Report", 14, 22);
                doc.setFontSize(11);
                doc.setTextColor(100);
                doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

                const tableColumn = ["ID", "Customer", "Email", "Address", "Total (Rs.)", "Status", "Date"];
                const tableRows = [];

                orders.forEach(order => {
                    const orderData = [
                        `#${order.id}`,
                        order.customer_name,
                        order.user_email,
                        order.shipping_address,
                        parseFloat(order.total_amount).toLocaleString('en-IN'),
                        order.status,
                        new Date(order.created_at).toLocaleDateString()
                    ];
                    tableRows.push(orderData);
                });

                doc.autoTable({
                    head: [tableColumn], body: tableRows, startY: 35,
                    headStyles: { fillColor: [30, 42, 56] }
                });
                
                doc.save(`90sSports_All_Orders_Report_${new Date().toISOString().slice(0,10)}.pdf`);
            }
        });
    }
    
    function generateInvoicePDF(order, filename) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        imageToBase64('Asset/logo.png', function(base64Img) {
            const img = new Image();
            img.src = base64Img;
            img.onload = function() {
                doc.addImage(base64Img, 'PNG', 14, 5, 35, (img.height * 35) / img.width); 
                doc.setFontSize(20);
                doc.text("Tax Invoice", 196, 20, { align: 'right' });
                doc.line(14, 35, 196, 35);
                doc.setFontSize(10);
                doc.text(`Order ID: #${order.id}`, 14, 42);
                doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`, 196, 42, { align: 'right' });
                doc.setFontSize(12);
                doc.text("Shipping To:", 14, 55);
                doc.setFontSize(10);
                doc.text(order.customer_name, 14, 61);
                doc.text(doc.splitTextToSize(order.shipping_address, 80), 14, 66);

                const tableColumn = ["Item", "Quantity", "Price", "Total"];
                const tableRows = order.items.map(item => [
                    item.product_name, item.quantity,
                    `Rs. ${item.price.toLocaleString()}`,
                    `Rs. ${(item.price * item.quantity).toLocaleString()}`
                ]);

                doc.autoTable({
                    head: [tableColumn], body: tableRows, startY: 85,
                    theme: 'striped', headStyles: { fillColor: [255, 102, 0] }
                });
                
                const finalY = doc.autoTable.previous.finalY;
                const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const shipping = parseFloat(order.total_amount) - subtotal;
                
                doc.setFontSize(11);
                doc.text(`Subtotal: Rs. ${subtotal.toLocaleString()}`, 196, finalY + 10, { align: 'right' });
                doc.text(`Shipping: ${shipping > 0 ? `Rs. ${shipping.toLocaleString()}` : 'FREE'}`, 196, finalY + 16, { align: 'right' });
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(`Grand Total: Rs. ${parseFloat(order.total_amount).toLocaleString()}`, 196, finalY + 24, { align: 'right' });
                
                doc.save(filename);
            }
        });
    }

    async function handleSingleProductDownload(productId) {
        showToast('Generating PDF...', true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/products/${productId}`);
            if (!res.ok) throw new Error('Could not fetch product data.');
            const product = await res.json();
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            imageToBase64('Asset/logo.png', function(base64Img) {
                const img = new Image();
                img.src = base64Img;
                img.onload = function() {
                    doc.addImage(base64Img, 'PNG', 14, 10, 35, (img.height * 35) / img.width);
                    doc.setFontSize(22).setFont('helvetica', 'bold').text("Product Details Report", 196, 22, { align: 'right' });
                    doc.setFontSize(10).setFont('helvetica', 'normal').text(`Generated: ${new Date().toLocaleString()}`, 196, 28, { align: 'right' });
                    doc.line(14, 40, 196, 40);

                    doc.autoTable({
                        body: [
                            ["Product ID", product.id.toString()],
                            ["Name", product.name],
                            ["Brand", product.brand || 'N/A'],
                            ["Category", product.category],
                            ["Stock", product.stock.toString()],
                            ["Regular Price", (product.regularPrice && product.regularPrice > 0) ? `Rs. ${product.regularPrice.toLocaleString('en-IN')}` : 'N/A'],
                            ["Discount Price", `Rs. ${product.discountPrice.toLocaleString('en-IN')}`]
                        ],
                        startY: 50, theme: 'grid',
                        headStyles: { fillColor: [30, 42, 56], textColor: 255 },
                        styles: { fontSize: 11, cellPadding: 3 },
                        columnStyles: { 0: { fontStyle: 'bold' } }
                    });
                    
                    const finalY = doc.autoTable.previous.finalY;
                    doc.setFontSize(14).setFont('helvetica', 'bold').text("Description:", 14, finalY + 15);
                    const descLines = doc.splitTextToSize(product.description || 'No description available.', 180);
                    doc.setFontSize(11).setFont('helvetica', 'normal').setTextColor(80).text(descLines, 14, finalY + 22);

                    doc.save(`Product_Report_${product.id}_${product.name}.pdf`);
                }
            });
            
        } catch (error) {
            showToast(error.message, false);
        }
    }
    
    async function handleAllProductsDownload() {
        showToast('Generating report for all products...', true);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        imageToBase64('Asset/logo.png', function(base64Img) {
            doc.setFontSize(18).text("All Products Stock Report", 14, 22);
            const tableColumn = ["ID", "Name", "Brand", "Category", "Price (Rs.)", "Stock"];
            const tableRows = allAdminProducts.map(p => [ p.id, p.name, p.brand || 'N/A', p.category, p.discountPrice.toLocaleString('en-IN'), p.stock ]);
            doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30, headStyles: { fillColor: [30, 42, 56] } });
            doc.save(`90sSports_All_Products_Report_${new Date().toISOString().slice(0,10)}.pdf`);
        });
    }

    // ===============================================
    // === PUDHU FEATURE: USERS PDF DOWNLOAD LOGIC ====
    // ===============================================

    function handleSingleUserDownload(userId) {
        const user = allAdminUsers.find(u => u.id == userId);
        if (!user) return showToast('User not found.', false);

        showToast('Generating User PDF...', true);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        imageToBase64('Asset/logo.png', function(base64Img) {
            doc.addImage(base64Img, 'PNG', 14, 10, 35, (35 * 1) / 1); // Assuming logo is square
            doc.setFontSize(22).setFont('helvetica', 'bold').text("User Details Report", 196, 22, { align: 'right' });
            
            doc.autoTable({
                startY: 50,
                theme: 'grid',
                head: [["Attribute", "Value"]],
                body: [
                    ["User ID", user.id.toString()],
                    ["Name", user.name],
                    ["Email", user.email],
                    ["Phone", user.phone || 'N/A'],
                    ["Role", user.role.charAt(0).toUpperCase() + user.role.slice(1)],
                    ["Joined On", new Date(user.created_at).toLocaleString()]
                ],
                columnStyles: { 0: { fontStyle: 'bold' } }
            });

            doc.save(`User_Report_${user.id}_${user.name}.pdf`);
        });
    }
    
    function handleAllUsersDownload(users) {
        if (users.length === 0) return showToast('No users to download.', false);
        showToast('Generating All Users PDF...', true);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        imageToBase64('Asset/logo.png', function(base64Img) {
            doc.setFontSize(18).text("All Users Report", 14, 22);
            const tableColumn = ["ID", "Name", "Email", "Phone", "Role", "Joined Date"];
            const tableRows = users.map(u => [ u.id, u.name, u.email, u.phone || 'N/A', u.role, new Date(u.created_at).toLocaleDateString() ]);
            doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30, headStyles: { fillColor: [30, 42, 56] } });
            doc.save(`90sSports_All_Users_Report_${new Date().toISOString().slice(0,10)}.pdf`);
        });
    }


    function showToast(message, isSuccess = false) {
        const container = document.getElementById('toast-container');
        if(!container) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${isSuccess ? 'success' : ''}`;
        toast.textContent = message;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
});

