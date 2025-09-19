document.addEventListener('DOMContentLoaded', () => {

    // --- API BASE URL LOGIC (Important for Deployment) ---
    // ITHU THAAN MUKKIYAMANA MAATRAM. Ippo Render la correct ah work aagum.
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE_URL = isLocalhost ? 'http://localhost:3000' : '';

    // --- DOM ELEMENTS ---
    const orderItemsContainer = document.getElementById('order-items-container');
    const subtotalAmountEl = document.getElementById('subtotal-amount');
    const shippingAmountEl = document.getElementById('shipping-amount');
    const totalAmountEl = document.getElementById('total-amount');
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtn = document.getElementById('place-order-btn');

    // --- INITIALIZATION ---
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    const buyNowItemStr = sessionStorage.getItem('buyNowItem');
    let cartForCheckout;

    if (buyNowItemStr) {
        cartForCheckout = [JSON.parse(buyNowItemStr)];
    } else {
        cartForCheckout = window.getCart();
    }

    if (!userProfile) {
        // Using a custom modal or redirect is better than alert
        console.error("User not logged in. Redirecting...");
        window.location.href = '/login.html';
        return;
    }
    if (!cartForCheckout || cartForCheckout.length === 0) {
        console.error("Cart is empty. Redirecting...");
        window.location.href = '/shop.html';
        return;
    }
    
    populateUserDetails(userProfile);
    renderOrderSummary(cartForCheckout);

    // --- EVENT LISTENERS ---
    checkoutForm.addEventListener('submit', handlePlaceOrder);
    
    const inputs = checkoutForm.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('input', () => validateInput(input));
        input.addEventListener('blur', () => validateInput(input));
    });

    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            document.querySelectorAll('.payment-details').forEach(div => div.classList.remove('active'));
            const detailsDiv = document.getElementById(`${event.target.id}-details`);
            if (detailsDiv) {
                detailsDiv.classList.add('active');
            }
        });
    });
    
    document.querySelectorAll('.accordion-header').forEach(button => {
        button.addEventListener('click', () => {
            const content = button.nextElementSibling;
            button.classList.toggle('active');
            content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
        });
    });

    // --- FUNCTIONS ---
    
    function populateUserDetails(profile) {
        if(document.getElementById('email')) document.getElementById('email').value = profile.email || '';
        const [firstName, ...lastNameParts] = (profile.name || '').split(' ');
        if(document.getElementById('firstName')) document.getElementById('firstName').value = firstName;
        if(document.getElementById('lastName')) document.getElementById('lastName').value = lastNameParts.join(' ');
    }

    function renderOrderSummary(currentCart) {
        if(!orderItemsContainer) return;
        orderItemsContainer.innerHTML = '';
        let subtotal = 0;
        currentCart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            orderItemsContainer.innerHTML += `
                <div class="order-item">
                    <div class="item-info">
                        <img src="${item.imageUrl}" alt="${item.name}">
                        <div class="item-details">
                            <span>${item.name}</span>
                            <span class="item-qty">Qty: ${item.quantity}</span>
                        </div>
                    </div>
                    <span>₹${itemTotal.toLocaleString()}</span>
                </div>
            `;
        });
        const shippingFee = subtotal > 5000 ? 0 : 50;
        const totalAmount = subtotal + shippingFee;
        if(subtotalAmountEl) subtotalAmountEl.textContent = `₹${subtotal.toLocaleString()}`;
        if(shippingAmountEl) shippingAmountEl.textContent = shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString()}`;
        if(totalAmountEl) totalAmountEl.textContent = `₹${totalAmount.toLocaleString()}`;
    }

    async function handlePlaceOrder(event) {
        event.preventDefault();
        if (!validateForm()) {
            showToast("Please fill all required fields correctly.");
            return;
        }

        toggleButtonLoading(true);

        const orderPayload = {
            userId: userProfile.id, // We need user ID
            customerName: `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`,
            shippingAddress: `${document.getElementById('address').value}, ${document.getElementById('city').value}, ${document.getElementById('state').value} - ${document.getElementById('pincode').value}`,
            phone: document.getElementById('phone').value,
            items: cartForCheckout,
            totalAmount: cartForCheckout.reduce((sum, item) => sum + (item.price * item.quantity), 0) + (cartForCheckout.reduce((sum, item) => sum + (item.price * item.quantity), 0) > 5000 ? 0 : 50)
        };
        
        try {
            // Intha line ippo correct ah request anupum
            const response = await fetch(`${API_BASE_URL}/api/place-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to place order.');
            }
            
            if (buyNowItemStr) {
                sessionStorage.removeItem('buyNowItem');
            } else {
                const cartKey = `cart_${userProfile.email}`;
                localStorage.setItem(cartKey, JSON.stringify([])); // Clear user specific cart
            }
            
            if(typeof window.updateCartDisplay === 'function') {
                window.updateCartDisplay();
            }
            
            localStorage.setItem('lastOrderId', result.orderId);
            window.location.href = '/order-confirmation.html';

        } catch (error) {
            console.error('Order placement error:', error);
            showToast(error.message || "There was an issue placing your order. Please try again.");
            toggleButtonLoading(false);
        }
    }
    
    function validateForm() {
        let isFormValid = true;
        checkoutForm.querySelectorAll('input[required]').forEach(input => {
            if (!validateInput(input)) isFormValid = false;
        });
        return isFormValid;
    }
    
    function validateInput(input) {
        const errorEl = input.nextElementSibling;
        let isValid = true;
        let errorMessage = '';
        input.value = input.value.trim();
        if (!input.value) {
            isValid = false;
            errorMessage = `${input.previousElementSibling.textContent.replace('*','').trim()} is required.`;
        } else if (input.pattern && !new RegExp(input.pattern).test(input.value)) {
            isValid = false;
            errorMessage = input.title || `Please enter a valid value.`;
        }
        input.classList.toggle('invalid', !isValid);
        if (errorEl && errorEl.classList.contains('error-message')) {
            errorEl.textContent = errorMessage;
            errorEl.style.display = isValid ? 'none' : 'block';
        }
        return isValid;
    }

    function toggleButtonLoading(isLoading) {
        if(!placeOrderBtn) return;
        const btnText = placeOrderBtn.querySelector('.btn-text');
        const spinner = placeOrderBtn.querySelector('.spinner');
        placeOrderBtn.disabled = isLoading;
        if(btnText) btnText.style.display = isLoading ? 'none' : 'inline-block';
        if(spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
    }
    
    function showToast(message) {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.5s forwards';
            toast.addEventListener('animationend', () => toast.remove());
        }, 4500);
    }
});
