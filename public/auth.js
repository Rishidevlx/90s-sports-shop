// --- DOM ELEMENTS (ella page-layum irukuradhu) ---
const userProfileContainer = document.getElementById('user-profile-container');
const userProfilePic = document.getElementById('user-profile-pic');
const signoutBtn = document.getElementById('signout-btn');
const cartCountSpan = document.getElementById('cart-count');
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.querySelector(".nav-links");
const loginNavLink = document.getElementById('login-nav-link');

// ==========================================================
// === PUDHU CART LOGIC (USER-SPECIFIC) =====================
// ==========================================================

// Intha helper function, user login panniruntha avanga email vechi key create pannum, illana guest-ku create pannum
function getCartKey() {
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    if (userProfile && userProfile.email) {
        // Login panniruntha, key -> 'cart_pooshaoff@gmail.com'
        return `cart_${userProfile.email}`;
    } else {
        // Login pannalana, key -> 'cart_guest'
        return 'cart_guest';
    }
}

// Cart-la irukura items-ah user-ku sonthamaana key-la irundhu eduka
window.getCart = function() {
    const cartKey = getCartKey();
    return JSON.parse(localStorage.getItem(cartKey)) || [];
}

// Cart-ah user-ku sonthamaana key-la save panna
function saveCart(cart) {
    const cartKey = getCartKey();
    localStorage.setItem(cartKey, JSON.stringify(cart));
    updateCartDisplay();
}

// Cart-ku pudhu item add panna (intha logic maara theva illa)
window.addToCart = function(productToAdd) {
    const cart = window.getCart();
    const existingProduct = cart.find(item => item.id === productToAdd.id);
    if (existingProduct) {
        existingProduct.quantity++;
    } else {
        productToAdd.quantity = 1;
        cart.push(productToAdd);
    }
    saveCart(cart);
}

// Item-oda quantity-ah update panna (intha logic maara theva illa)
window.updateItemQuantity = function(productId, newQuantity) {
    const cart = window.getCart().map(item =>
        item.id == productId ? { ...item, quantity: newQuantity } : item
    );
    saveCart(cart);
}

// Cart-la irundhu oru item-ah remove panna (intha logic maara theva illa)
window.removeFromCart = function(productId) {
    let cart = window.getCart().filter(item => item.id != productId);
    saveCart(cart);
}

// Navbar-la cart icon-la count-ah kaata
function updateCartDisplay() {
    const totalItems = window.getCart().reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountSpan) {
        cartCountSpan.textContent = totalItems;
        cartCountSpan.style.display = totalItems > 0 ? 'block' : 'none';
    }
}

// ==========================================================
// === AUTHENTICATION & COMMON PAGE LOGIC ===================
// ==========================================================

function runAuthAndCartSetup() {
    checkLoginStatus();
    updateCartDisplay();
}

window.addEventListener('DOMContentLoaded', runAuthAndCartSetup);

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => navLinks.classList.toggle("active"));
}

function checkLoginStatus() {
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    
    if (userProfile) {
        if(loginNavLink) loginNavLink.style.display = 'none';
        if(userProfileContainer) userProfileContainer.style.display = 'flex';
        
        if(userProfilePic) {
            userProfilePic.src = userProfile.picture || `https://placehold.co/40x40/ff6600/FFF?text=${userProfile.name.charAt(0).toUpperCase()}`;
            userProfilePic.style.cursor = 'pointer';
            userProfilePic.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });
        }
    } else {
        if(loginNavLink) loginNavLink.style.display = 'list-item';
        if(userProfileContainer) userProfileContainer.style.display = 'none';
    }
}

if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
        // User logout pannumbodhu, guest cart-ku maarurathukaana velaiya seiyum
        const guestCartBeforeLogout = JSON.parse(localStorage.getItem('cart_guest')) || [];
        localStorage.removeItem('userProfile');
        
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
        }

        showToast("You have been signed out.", true);
        
        setTimeout(() => {
            if(window.location.pathname.includes('profile.html')) {
                window.location.href = 'index.html';
            } else {
                location.reload();
            }
        }, 1500);
    });
}

// --- TOAST NOTIFICATION (Helper Function) ---
function showToast(message, isSuccess = false) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${isSuccess ? 'success' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);
    toast.style.animation = 'slideIn 0.5s forwards, fadeOut 0.5s 4.5s forwards';
    setTimeout(() => toast.remove(), 5000);
}
