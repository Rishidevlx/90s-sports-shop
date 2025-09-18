// --- GLOBAL STATE ---
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost ? 'http://localhost:3000' : '';
let allProducts = [];
let currentPage = 1;
const productsPerPage = 12;
let currentModalProductId = null;
let wishlistItems = []; 

// --- DOM ELEMENTS ---
const productsGrid = document.getElementById('products-grid');
const paginationContainer = document.getElementById('pagination-container');
const categoryFilter = document.getElementById('category-filter');
const priceRange = document.getElementById('price-range');
const priceValue = document.getElementById('price-value');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const customPriceBtn = document.getElementById('custom-price-btn');
const searchInput = document.getElementById('search-input');
const modal = document.getElementById('product-modal');
const modalOverlay = document.getElementById('product-modal-overlay');
const closeModalBtn = document.querySelector('.close-modal-btn');
const loginModal = document.getElementById('login-modal');
const closeLoginModalBtn = loginModal.querySelector('.close-login-modal-btn');
const loginModalOverlay = loginModal.querySelector('.login-modal-overlay');

// --- FUNCTIONS ---
async function fetchWishlist() {
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    if (!userProfile) {
        wishlistItems = []; 
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/wishlist?email=${userProfile.email}`);
        if (!response.ok) throw new Error('Could not fetch wishlist');
        const data = await response.json();
        wishlistItems = data.map(item => item.id);
    } catch (error) {
        console.error(error.message);
        wishlistItems = [];
    }
}

async function fetchProducts() {
    productsGrid.innerHTML = '<div class="loader"></div>';
    await fetchWishlist(); 
    try {
        const searchTerm = searchInput.value;
        let apiUrl = `${API_BASE_URL}/api/products`;
        if (searchTerm) {
            apiUrl += `?search=${encodeURIComponent(searchTerm)}`;
        }
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        
        allProducts = await response.json();
        
        if (categoryFilter.length <= 1 && !searchTerm) {
            populateCategories();
        }
        
        applyFilters(); 
    } catch (error) {
        console.error('Failed to fetch products:', error);
        productsGrid.innerHTML = `<p>Could not load products. Please try again later.</p>`;
    }
}

function applyFilters() {
    const selectedCategory = categoryFilter.value;
    const maxPrice = parseInt(priceRange.value);
    const customMin = parseInt(minPriceInput.value) || 0;
    const customMax = parseInt(maxPriceInput.value) || Infinity;

    let filteredProducts = allProducts.filter(product => {
        const productPrice = product.discountPrice;
        const matchesCategory = selectedCategory === 'All Products' || product.category === selectedCategory;
        const matchesPriceRange = productPrice <= maxPrice;
        const matchesCustomPrice = productPrice >= customMin && productPrice <= customMax;
        return matchesCategory && matchesPriceRange && matchesCustomPrice;
    });
    
    currentPage = 1;
    renderProducts(filteredProducts);
    renderPagination(filteredProducts);
}

function renderProducts(products) {
    productsGrid.innerHTML = '';
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const paginatedProducts = products.slice(startIndex, endIndex);

    if (paginatedProducts.length === 0) {
        productsGrid.innerHTML = `<p>No products found matching your criteria.</p>`;
        return;
    }

    paginatedProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = product.id;
        
        const discountPrice = parseFloat(product.discountPrice);
        const regularPrice = parseFloat(product.regularPrice);
        
        let priceHTML = `<span class="current-price">₹${discountPrice.toLocaleString('en-IN')}</span>`;
        if (regularPrice && regularPrice > discountPrice) {
            priceHTML = `<span class="old-price">₹${regularPrice.toLocaleString('en-IN')}</span> ${priceHTML}`;
        }
        
        const isWishlisted = wishlistItems.includes(product.id);
        
        // --- PUDHU STOCK LOGIC ---
        let stockInfo = '';
        let outOfStockLabel = '';
        let isOutOfStock = false;
        
        if (product.stock === 0) {
            outOfStockLabel = '<div class="out-of-stock-label">OUT OF STOCK</div>';
            isOutOfStock = true;
        } else if (product.stock <= 10) {
            stockInfo = `<div class="stock-info">Only ${product.stock} left in stock!</div>`;
        } else {
            stockInfo = `<div class="stock-info"></div>`; // Empty div to maintain height
        }

        card.innerHTML = `
            ${outOfStockLabel}
            <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" data-product-id="${product.id}">
                <i class="fas fa-heart"></i>
            </button>
            <img src="${product.imageUrl || 'https://placehold.co/400x400/eee/ccc?text=Image'}" alt="${product.name}">
            <h4>${product.name}</h4>
            <div class="product-price">${priceHTML}</div>
            ${stockInfo}
            <button class="add-to-cart-btn" ${isOutOfStock ? 'disabled' : ''}>Add to Cart</button>
        `;
        productsGrid.appendChild(card);
    });
}

function renderPagination(products) {
    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(products.length / productsPerPage);
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        if (i === currentPage) pageButton.classList.add('active');
        pageButton.addEventListener('click', () => {
            currentPage = i;
            renderProducts(products);
            document.querySelector('.pagination-container .active')?.classList.remove('active');
            pageButton.classList.add('active');
        });
        paginationContainer.appendChild(pageButton);
    }
}

async function handleWishlistToggle(button) {
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    if (!userProfile) {
        loginModal.style.display = 'flex';
        return;
    }

    const productId = button.dataset.productId;
    button.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/wishlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userProfile.email, productId: productId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        button.classList.toggle('active');
        showToast(result.message, true);
        
        if (result.added) {
            wishlistItems.push(parseInt(productId));
        } else {
            wishlistItems = wishlistItems.filter(id => id != productId);
        }

    } catch (error) {
        showToast(error.message || 'Failed to update wishlist.', false);
    } finally {
        button.disabled = false;
    }
}

async function openProductModal(productId) {
    currentModalProductId = productId;
    try {
        const [productRes, commentsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/products/${productId}`),
            fetch(`${API_BASE_URL}/api/products/${productId}/comments`)
        ]);

        if (!productRes.ok) throw new Error('Product not found');
        
        const product = await productRes.json();
        const comments = commentsRes.ok ? await commentsRes.json() : [];
        
        modal.querySelector('#modal-title').textContent = product.name;
        modal.querySelector('#modal-image').src = product.imageUrl || 'https://placehold.co/600x600/eee/ccc?text=Image';
        modal.querySelector('#modal-description').textContent = product.description || 'No description available.';
        
        const discountPrice = parseFloat(product.discountPrice);
        const regularPrice = parseFloat(product.regularPrice);

        modal.querySelector('#modal-discount-price').textContent = `₹${discountPrice.toLocaleString('en-IN')}`;
        if (regularPrice && regularPrice > discountPrice) {
            modal.querySelector('#modal-original-price').textContent = `₹${regularPrice.toLocaleString('en-IN')}`;
            modal.querySelector('#modal-original-price').style.display = 'inline';
        } else {
            modal.querySelector('#modal-original-price').style.display = 'none';
        }
        
        const averageRating = comments.length > 0 ? (comments.reduce((sum, c) => sum + c.rating, 0) / comments.length).toFixed(1) : 0;
        modal.querySelector('#modal-rating-stars').innerHTML = generateStarRating(averageRating) + ` <span>(${averageRating} based on ${comments.length} reviews)</span>`;

        renderComments(comments);
        renderAddCommentSection();
        
        // --- PUDHU MODAL STOCK LOGIC ---
        const addToCartBtnModal = modal.querySelector('.add-to-cart-btn-modal');
        const buyNowBtnModal = modal.querySelector('.buy-now-btn-modal');
        
        if (product.stock === 0) {
            addToCartBtnModal.disabled = true;
            buyNowBtnModal.disabled = true;
        } else {
            addToCartBtnModal.disabled = false;
            buyNowBtnModal.disabled = false;
        }

        addToCartBtnModal.onclick = () => {
             window.addToCart({ id: product.id, name: product.name, price: discountPrice, imageUrl: product.imageUrl, category: product.category });
             showToast(`${product.name} added to cart!`, true);
        };
        
        buyNowBtnModal.onclick = () => {
            const userProfile = JSON.parse(localStorage.getItem('userProfile'));
            if (userProfile) {
                const productToBuy = { id: product.id, name: product.name, price: discountPrice, imageUrl: product.imageUrl, category: product.category, quantity: 1 };
                sessionStorage.setItem('buyNowItem', JSON.stringify(productToBuy));
                window.location.href = 'checkout.html';
            } else {
                loginModal.style.display = 'flex';
            }
        };

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error fetching product details:', error);
        showToast('Could not load product details.');
    }
}

async function submitComment() {
    const rating = document.querySelector('.new-rating-stars').dataset.rating;
    const commentText = document.getElementById('comment-textarea').value.trim();
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));

    if (!rating || rating === "0") return showToast("Please select a star rating.");
    if (!commentText) return showToast("Please write a review.");
    if (!userProfile) return showToast("You must be logged in to comment.");

    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${currentModalProductId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: userProfile.name, userImage: userProfile.picture, rating: parseInt(rating), commentText: commentText })
        });
        if (!response.ok) throw new Error('Failed to submit comment');
        showToast("Thank you for your review!", true);
        openProductModal(currentModalProductId);
    } catch (error) {
        showToast("Could not submit your review.");
    }
}

// --- HELPER FUNCTIONS ---

function populateCategories() {
    const categories = ['All Products', ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    categoryFilter.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function renderComments(comments) {
    const commentsList = modal.querySelector('#comments-list');
    if (comments.length === 0) {
        commentsList.innerHTML = '<p>No reviews yet. Be the first to write one!</p>';
        return;
    }
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <img src="${comment.user_image || 'https://placehold.co/40x40/ccc/333?text=U'}" alt="${comment.user_name}" class="comment-user-pic">
                <strong>${comment.user_name}</strong>
            </div>
            <div class="comment-rating">${generateStarRating(comment.rating)}</div>
            <p>${comment.comment_text}</p>
        </div>
    `).join('');
}

function renderAddCommentSection() {
    const addCommentContainer = modal.querySelector('#add-comment-container');
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    if (userProfile) {
        addCommentContainer.innerHTML = `
            <h5>Write your review</h5>
            <div class="new-rating-stars" data-rating="0">
                ${[1,2,3,4,5].map(v => `<i class="far fa-star" data-value="${v}"></i>`).join('')}
            </div>
            <textarea id="comment-textarea" placeholder="Share your thoughts..."></textarea>
            <button id="submit-comment-btn">Submit</button>
        `;
        addCommentContainer.querySelector('#submit-comment-btn').onclick = submitComment;
        const starsContainer = addCommentContainer.querySelector('.new-rating-stars');
        starsContainer.onmouseover = handleStarHover;
        starsContainer.onmouseout = handleStarMouseOut;
        starsContainer.onclick = handleStarClick;
    } else {
        addCommentContainer.innerHTML = `<p>Please <a href="login.html">Sign in</a> to write a review.</p>`;
    }
}

function handleStarHover(e) {
    if (e.target.matches('.fa-star')) {
        const hoverVal = e.target.dataset.value;
        e.currentTarget.querySelectorAll('.fa-star').forEach(s => s.classList.toggle('hover', s.dataset.value <= hoverVal));
    }
}
function handleStarMouseOut(e) { e.currentTarget.querySelectorAll('.fa-star').forEach(s => s.classList.remove('hover')); }
function handleStarClick(e) {
    if (e.target.matches('.fa-star')) {
        const rating = e.target.dataset.value;
        e.currentTarget.dataset.rating = rating;
        e.currentTarget.querySelectorAll('.fa-star').forEach(s => {
            s.classList.toggle('selected', s.dataset.value <= rating);
            s.classList.toggle('fas', s.dataset.value <= rating);
            s.classList.toggle('far', s.dataset.value > rating);
        });
    }
}

function generateStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) stars += '<i class="fas fa-star"></i>';
        else stars += '<i class="far fa-star"></i>';
    }
    return stars;
}

// --- EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', fetchProducts);

let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(fetchProducts, 500);
});

categoryFilter.addEventListener('change', applyFilters);
priceRange.addEventListener('input', () => {
    priceValue.textContent = `₹${parseInt(priceRange.value).toLocaleString()}`;
    applyFilters();
});
customPriceBtn.addEventListener('click', applyFilters);

productsGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;

    const cartBtn = e.target.closest('.add-to-cart-btn');
    const wishlistBtn = e.target.closest('.wishlist-btn');

    if (cartBtn && !cartBtn.disabled) {
        e.stopPropagation(); 
        const product = allProducts.find(p => p.id == card.dataset.productId);
        if (product) {
            window.addToCart({ id: product.id, name: product.name, price: product.discountPrice, imageUrl: product.imageUrl, category: product.category });
            showToast(`${product.name} added to cart!`, true);
        }
    } else if (wishlistBtn) {
        e.stopPropagation(); 
        handleWishlistToggle(wishlistBtn);
    } else {
        openProductModal(card.dataset.productId);
    }
});


closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
modalOverlay.addEventListener('click', () => modal.style.display = 'none');
closeLoginModalBtn.addEventListener('click', () => loginModal.style.display = 'none');
loginModalOverlay.addEventListener('click', () => loginModal.style.display = 'none');

modal.querySelector('.comments-toggle').addEventListener('click', (e) => {
    const content = modal.querySelector('.comments-content');
    e.currentTarget.classList.toggle('active');
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
});

