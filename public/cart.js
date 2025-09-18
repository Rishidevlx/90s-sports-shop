// --- GLOBAL STATE ---
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost ? 'http://localhost:3000' : '';
let currentModalProductId = null;

// --- DOM ELEMENTS ---
const cartItemsContainer = document.getElementById('cart-items-container');
const checkoutSummaryContainer = document.getElementById('checkout-summary');
const relatedProductsContainer = document.getElementById('related-products-container');
const productModal = document.getElementById('product-modal');
const loginModal = document.getElementById('login-modal');

document.addEventListener('DOMContentLoaded', () => {
    renderCartPage();

    productModal.querySelector('.close-modal-btn').addEventListener('click', () => productModal.style.display = 'none');
    productModal.querySelector('.product-modal-overlay').addEventListener('click', () => productModal.style.display = 'none');
    
    loginModal.querySelector('.close-login-modal-btn').addEventListener('click', () => loginModal.style.display = 'none');
    loginModal.querySelector('.login-modal-overlay').addEventListener('click', () => loginModal.style.display = 'none');
});

async function renderCartPage() {
    const cart = window.getCart();
    renderCartItems(cart);
    renderCheckoutSummary(cart);
    await renderRelatedProducts(cart);
}

function renderCartItems(cart) {
    cartItemsContainer.innerHTML = ''; 

    if (!cart || cart.length === 0) {
        cartItemsContainer.innerHTML = `<div class="empty-cart-message"><h2>Your cart is empty!</h2><a href="shop.html">Continue Shopping</a></div>`;
        return;
    }

    cart.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div class="cart-item-image"><img src="${item.imageUrl}" alt="${item.name}"></div>
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p class="cart-item-price">₹${(item.price * item.quantity).toLocaleString()}</p>
                <div class="cart-item-actions">
                    <div class="quantity-control">
                        <button class="decrease-qty" data-id="${item.id}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="increase-qty" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-btn" data-id="${item.id}">Remove</button>
                </div>
            </div>`;
        cartItemsContainer.appendChild(itemEl);
    });

    cartItemsContainer.querySelectorAll('.increase-qty, .decrease-qty').forEach(btn => btn.addEventListener('click', handleQuantityChange));
    cartItemsContainer.querySelectorAll('.remove-btn').forEach(btn => btn.addEventListener('click', handleRemoveItem));
}

function renderCheckoutSummary(cart) {
    if (!cart || cart.length === 0) {
        checkoutSummaryContainer.style.display = 'none';
        return;
    }
    
    checkoutSummaryContainer.style.display = 'block';
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const shippingFee = subtotal > 5000 ? 0 : 50;
    const totalAmount = subtotal + shippingFee;

    checkoutSummaryContainer.innerHTML = `
        <h3>PRICE DETAILS</h3>
        <div class="price-details">
            <div class="detail-line"><span>Price (${totalItems} items)</span><span>₹${subtotal.toLocaleString()}</span></div>
            <div class="detail-line"><span>Shipping Fee</span><span class="${shippingFee === 0 ? 'value free-shipping' : 'value'}">${shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString()}`}</span></div>
        </div>
        <div class="total-line"><span>Total Amount</span><span>₹${totalAmount.toLocaleString()}</span></div>
        <button id="proceed-btn" class="proceed-btn">Proceed to Pay</button>`;
    
    document.getElementById('proceed-btn').addEventListener('click', handleProceedToPay);
}

async function renderRelatedProducts(cart) {
    if (!cart || cart.length === 0) {
        relatedProductsContainer.style.display = 'none';
        return;
    }
    relatedProductsContainer.style.display = 'block';
    relatedProductsContainer.innerHTML = '<h3>You might also like</h3>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const allProducts = await response.json();
        
        const related = allProducts.filter(p => 
            cart.some(item => item.category === p.category) && !cart.some(item => item.id === p.id)
        ).slice(0, 3);

        if (related.length > 0) {
             related.forEach(product => {
                const productEl = document.createElement('div');
                productEl.className = 'related-product-card';
                productEl.dataset.productId = product.id;
                productEl.innerHTML = `<img src="${product.imageUrl}" alt="${product.name}"><div><h5>${product.name}</h5><p>₹${(product.discountPrice || product.regularPrice).toLocaleString()}</p></div>`;
                relatedProductsContainer.appendChild(productEl);
             });
             relatedProductsContainer.querySelectorAll('.related-product-card').forEach(card => {
                 card.addEventListener('click', () => openProductModal(card.dataset.productId));
             });
        } else {
            relatedProductsContainer.innerHTML += '<p>No related items found.</p>';
        }

    } catch (error) {
        relatedProductsContainer.innerHTML += '<p>Could not load items.</p>';
    }
}

// --- EVENT HANDLERS & MODAL LOGIC ---

function handleQuantityChange(event) {
    const { id } = event.target.dataset;
    const isIncrease = event.target.classList.contains('increase-qty');
    const item = window.getCart().find(i => i.id == id);
    if (item) {
        const newQuantity = isIncrease ? item.quantity + 1 : item.quantity - 1;
        newQuantity > 0 ? window.updateItemQuantity(id, newQuantity) : window.removeFromCart(id);
        renderCartPage(); 
    }
}

function handleRemoveItem(event) {
    window.removeFromCart(event.target.dataset.id);
    renderCartPage();
}

function handleProceedToPay() {
    sessionStorage.removeItem('buyNowItem');
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    if (!userProfile) {
        loginModal.style.display = 'flex';
        return;
    }
    if (window.getCart().length === 0) {
        showToast("Your cart is empty.");
        return;
    }
    window.location.href = 'checkout.html';
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
        
        productModal.querySelector('#modal-title').textContent = product.name;
        productModal.querySelector('#modal-image').src = product.imageUrl || 'https://placehold.co/400';
        productModal.querySelector('#modal-description').textContent = product.description;

        const currentPrice = product.discountPrice || product.regularPrice;
        productModal.querySelector('#modal-discount-price').textContent = `₹${currentPrice.toLocaleString()}`;
        if (product.discountPrice && product.regularPrice) {
            productModal.querySelector('#modal-original-price').textContent = `₹${product.regularPrice.toLocaleString()}`;
        } else {
             productModal.querySelector('#modal-original-price').textContent = '';
        }

        const averageRating = comments.length ? (comments.reduce((s, c) => s + c.rating, 0) / comments.length).toFixed(1) : 0;
        productModal.querySelector('#modal-rating-stars').innerHTML = generateStarRating(averageRating) + `<span>(${averageRating})</span>`;
        
        productModal.querySelector('.add-to-cart-btn-modal').onclick = () => {
             window.addToCart({ id: product.id, name: product.name, price: currentPrice, imageUrl: product.imageUrl, category: product.category });
             showToast(`${product.name} added to cart!`, true);
             renderCartPage();
        };
        
         productModal.querySelector('.buy-now-btn-modal').onclick = () => {
            const userProfile = JSON.parse(localStorage.getItem('userProfile'));
            if (userProfile) {
                const productToBuy = { id: product.id, name: product.name, price: currentPrice, imageUrl: product.imageUrl, category: product.category, quantity: 1 };
                sessionStorage.setItem('buyNowItem', JSON.stringify(productToBuy));
                window.location.href = 'checkout.html';
            } else {
                loginModal.style.display = 'flex';
            }
        };

        renderComments(comments);
        renderAddCommentSection();

        // ITHU THAAN PUDHU FIX: Comments toggle event listener-a ingayum serkurom
        const commentsToggle = productModal.querySelector('.comments-toggle');
        commentsToggle.onclick = () => {
            const content = productModal.querySelector('.comments-content');
            commentsToggle.classList.toggle('active');
            content.style.display = content.style.display === 'block' ? 'none' : 'block';
        };
        
        productModal.style.display = 'flex';
    } catch (error) {
        console.error('Error opening product modal:', error);
    }
}

// --- HELPER FUNCTIONS ---
function renderComments(comments) {
    const commentsList = productModal.querySelector('#comments-list');
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p>No reviews yet.</p>';
        return;
    }
    commentsList.innerHTML = comments.map(c => `
        <div class="comment-item">
            <div class="comment-header"><img src="${c.user_image || 'https://placehold.co/40'}" class="comment-user-pic"><strong>${c.user_name}</strong></div>
            <div class="comment-rating">${generateStarRating(c.rating)}</div><p>${c.comment_text}</p>
        </div>`).join('');
}

function renderAddCommentSection() {
    const addCommentContainer = productModal.querySelector('#add-comment-container');
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    if (userProfile) {
        addCommentContainer.innerHTML = `
            <h5>Write your review</h5>
            <div class="new-rating-stars" data-rating="0">${[1,2,3,4,5].map(v=>`<i class="far fa-star" data-value="${v}"></i>`).join('')}</div>
            <textarea id="comment-textarea" placeholder="Share your thoughts..."></textarea>
            <button id="submit-comment-btn">Submit</button>`;
        addCommentContainer.querySelector('#submit-comment-btn').onclick = submitComment;
        const starsContainer = addCommentContainer.querySelector('.new-rating-stars');
        starsContainer.onmouseover = handleStarHover;
        starsContainer.onmouseout = handleStarMouseOut;
        starsContainer.onclick = handleStarClick;
    } else {
        addCommentContainer.innerHTML = `<p>Please <a href="login.html">sign in</a> to write a review.</p>`;
    }
}

async function submitComment() {
    const rating = productModal.querySelector('.new-rating-stars').dataset.rating;
    const commentText = productModal.querySelector('#comment-textarea').value.trim();
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    if (rating == "0" || !commentText) return showToast("Please provide a rating and a comment.");
    
    try {
        await fetch(`${API_BASE_URL}/api/products/${currentModalProductId}/comments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: userProfile.name, userImage: userProfile.picture, rating: parseInt(rating), commentText: commentText })
        });
        showToast("Review submitted!", true);
        openProductModal(currentModalProductId); 
    } catch (error) { showToast("Could not submit review."); }
}

function generateStarRating(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) starsHTML += '<i class="fas fa-star"></i>';
        else starsHTML += '<i class="far fa-star"></i>';
    }
    return starsHTML;
}

function handleStarHover(e) { if (e.target.matches('.fa-star')) { const v = e.target.dataset.value; e.currentTarget.querySelectorAll('.fa-star').forEach(s => s.classList.toggle('hover', s.dataset.value <= v)); } }
function handleStarMouseOut(e) { e.currentTarget.querySelectorAll('.fa-star').forEach(s => s.classList.remove('hover')); }
function handleStarClick(e) { if (e.target.matches('.fa-star')) { const r = e.target.dataset.value; e.currentTarget.dataset.rating = r; e.currentTarget.querySelectorAll('.fa-star').forEach(s => { s.classList.toggle('selected', s.dataset.value <= r); s.classList.toggle('fas', s.dataset.value <= r); s.classList.toggle('far', s.dataset.value > r); }); } }

