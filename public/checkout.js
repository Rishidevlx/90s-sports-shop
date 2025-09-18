document.addEventListener('DOMContentLoaded', () => {

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
        alert("Please sign in to proceed to checkout.");
        window.location.href = 'shop.html';
        return;
    }
    if (!cartForCheckout || cartForCheckout.length === 0) {
        alert("Your cart is empty. Please add items to proceed.");
        window.location.href = 'shop.html';
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
            document.getElementById(`${event.target.id}-details`).classList.add('active');
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
        document.getElementById('email').value = profile.email || '';
        const [firstName, ...lastNameParts] = (profile.name || '').split(' ');
        document.getElementById('firstName').value = firstName;
        document.getElementById('lastName').value = lastNameParts.join(' ');
    }

    function renderOrderSummary(currentCart) {
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
        subtotalAmountEl.textContent = `₹${subtotal.toLocaleString()}`;
        shippingAmountEl.textContent = shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString()}`;
        totalAmountEl.textContent = `₹${totalAmount.toLocaleString()}`;
    }

    async function handlePlaceOrder(event) {
        event.preventDefault();
        if (!validateForm()) {
            showToast("Please fill all required fields correctly.");
            return;
        }

        toggleButtonLoading(true);

        const orderPayload = {
            userDetails: {
                email: document.getElementById('email').value,
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                phone: document.getElementById('phone').value,
            },
            shippingAddress: {
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                pincode: document.getElementById('pincode').value,
            },
            orderItems: cartForCheckout,
            paymentMethod: document.querySelector('input[name="payment"]:checked').value
        };

        try {
            const response = await fetch('http://localhost:3000/api/place-order', {
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
                localStorage.removeItem('shoppingCart');
                if(typeof window.updateCartDisplay === 'function') {
                    window.updateCartDisplay();
                }
            }
            
            localStorage.setItem('lastOrderId', result.orderId);
            window.location.href = 'order-confirmation.html';

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
        const btnText = placeOrderBtn.querySelector('.btn-text');
        const spinner = placeOrderBtn.querySelector('.spinner');
        placeOrderBtn.disabled = isLoading;
        btnText.style.display = isLoading ? 'none' : 'inline-block';
        spinner.style.display = isLoading ? 'inline-block' : 'none';
    }
    
    function showToast(message) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
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

