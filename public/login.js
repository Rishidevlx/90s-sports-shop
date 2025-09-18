// --- FINAL SETUP FOR DEPLOYMENT & LOCALHOST ---
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost ? 'http://localhost:3000' : '';

// --- DOM ELEMENTS ---
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const rememberMeCheckbox = document.getElementById('remember-me');
const eyeIcons = document.querySelectorAll('.eye-icon');
const signUpLinkMobile = document.getElementById('signUpLinkMobile');
const signInLinkMobile = document.getElementById('signInLinkMobile');
const modalBackdrop = document.getElementById('modal-backdrop');
const alreadyExistsModal = document.getElementById('already-exists-modal');
const forgotPasswordModal = document.getElementById('forgot-password-modal');
const goToSignInBtn = document.getElementById('go-to-signin-btn');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const closeButtons = document.querySelectorAll('.close-modal');
const emailStep = document.getElementById('email-step');
const otpStep = document.getElementById('otp-step');
const resetStep = document.getElementById('reset-step');
const forgotEmailForm = document.getElementById('forgot-email-form');
const forgotOtpForm = document.getElementById('forgot-otp-form');
const forgotResetForm = document.getElementById('forgot-reset-form');
let userEmailForReset = ''; 

// --- PUDHU FUNCTION: GUEST CART-AH USER CART KOODA SERKA ---
async function mergeGuestCart(userEmail) {
    const guestCartKey = 'cart_guest';
    const userCartKey = `cart_${userEmail}`;

    const guestCart = JSON.parse(localStorage.getItem(guestCartKey)) || [];
    const userCart = JSON.parse(localStorage.getItem(userCartKey)) || [];

    if (guestCart.length > 0) {
        guestCart.forEach(guestItem => {
            const existingItem = userCart.find(userItem => userItem.id === guestItem.id);
            if (existingItem) {
                existingItem.quantity += guestItem.quantity;
            } else {
                userCart.push(guestItem);
            }
        });
        localStorage.setItem(userCartKey, JSON.stringify(userCart));
        localStorage.removeItem(guestCartKey);
        console.log('Guest cart merged successfully!');
    }
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    if(signUpButton) signUpButton.addEventListener('click', () => container.classList.add("right-panel-active"));
    if(signInButton) signInButton.addEventListener('click', () => container.classList.remove("right-panel-active"));
    if(signUpLinkMobile) signUpLinkMobile.addEventListener('click', (e) => { e.preventDefault(); container.classList.add("right-panel-active"); });
    if(signInLinkMobile) signInLinkMobile.addEventListener('click', (e) => { e.preventDefault(); container.classList.remove("right-panel-active"); });
    if(loginForm) loginForm.addEventListener('submit', handleLogin);
    if(registerForm) registerForm.addEventListener('submit', handleRegister);
    if(forgotEmailForm) forgotEmailForm.addEventListener('submit', handleForgotPassword);
    if(forgotOtpForm) forgotOtpForm.addEventListener('submit', handleVerifyOtp);
    if(forgotResetForm) forgotResetForm.addEventListener('submit', handleResetPassword);
    if(forgotPasswordLink) forgotPasswordLink.addEventListener('click', openForgotPasswordModal);
    closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
    if(goToSignInBtn) goToSignInBtn.addEventListener('click', () => { closeModal(); container.classList.remove("right-panel-active"); });
    if(modalBackdrop) modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
    
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail && document.getElementById('login-email')) {
        document.getElementById('login-email').value = rememberedEmail;
        rememberMeCheckbox.checked = true;
    }
    eyeIcons.forEach(icon => icon.addEventListener('click', togglePasswordVisibility));
    
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
            client_id: "693578900678-80k0dke8nmvhnf8b6tc7k6h3tdhdfqkr.apps.googleusercontent.com",
            callback: handleGoogleSignIn
        });
        const googleLoginBtn = document.getElementById('google-signin-btn-login');
        const googleRegisterBtn = document.getElementById('google-signin-btn-register');
        if(googleLoginBtn) google.accounts.id.renderButton(googleLoginBtn, { theme: "outline", size: "large", type: "standard", width: "278" });
        if(googleRegisterBtn) google.accounts.id.renderButton(googleRegisterBtn, { theme: "outline", size: "large", type: "standard", width: "278" });
    }
});

function togglePasswordVisibility(e) {
    const targetInput = document.getElementById(e.target.getAttribute('data-target'));
    if (!targetInput) return;
    if (targetInput.type === 'password') {
        targetInput.type = 'text';
        e.target.classList.replace('fa-eye-slash', 'fa-eye');
    } else {
        targetInput.type = 'password';
        e.target.classList.replace('fa-eye', 'fa-eye-slash');
    }
}

function openModal(modal) { if(modalBackdrop) modalBackdrop.style.display = 'flex'; if(modal) modal.style.display = 'block'; }
function closeModal() { if(modalBackdrop) modalBackdrop.style.display = 'none'; if(alreadyExistsModal) alreadyExistsModal.style.display = 'none'; if(forgotPasswordModal) forgotPasswordModal.style.display = 'none'; if(emailStep) emailStep.style.display = 'block'; if(otpStep) otpStep.style.display = 'none'; if(resetStep) resetStep.style.display = 'none'; }
function openForgotPasswordModal(e) { e.preventDefault(); openModal(forgotPasswordModal); }


// HANDLE LOGIN (IDHA THAAN MAATHIRUKOM)
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (rememberMeCheckbox.checked) { localStorage.setItem('rememberedEmail', email); } else { localStorage.removeItem('rememberedEmail'); }
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
        const result = await response.json();

        // Role ah check panni redirect panrom
        if (result.role === 'admin') {
            sessionStorage.setItem('adminProfile', JSON.stringify(result.user)); // sessionStorage use panrom
            showToast('Admin login successful! Redirecting...', true);
            setTimeout(() => { window.location.href = 'admin_dashboard.html'; }, 1500);
        } else {
            localStorage.setItem('userProfile', JSON.stringify(result.user));
            await mergeGuestCart(result.user.email);
            showToast('Login successful! Redirecting...', true);
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        }

    } catch (error) { showToast(error.message || 'Login failed.'); }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (password !== confirmPassword) { return showToast("Passwords do not match!"); }
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });
        const result = await response.json();
        if (!response.ok) {
            if (response.status === 409) { openModal(alreadyExistsModal); } else { throw new Error(result.message); }
        } else {
            localStorage.setItem('userProfile', JSON.stringify(result.user));
            await mergeGuestCart(result.user.email);
            showToast('Account created! Redirecting...', true);
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        }
    } catch (error) { showToast(error.message || 'Registration failed.'); }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    userEmailForReset = document.getElementById('forgot-email').value;
    showToast('Sending OTP...', false);
    try {
        const res = await fetch(`${API_BASE_URL}/api/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmailForReset }) });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);
        showToast(result.message, true);
        emailStep.style.display = 'none'; otpStep.style.display = 'block';
    } catch (error) { showToast(error.message || "Could not send OTP."); }
}

async function handleVerifyOtp(e) {
    e.preventDefault();
    const otp = document.getElementById('forgot-otp').value;
    try {
        const res = await fetch(`${API_BASE_URL}/api/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmailForReset, otp }) });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);
        showToast(result.message, true);
        otpStep.style.display = 'none'; resetStep.style.display = 'block';
    } catch (error) { showToast(error.message || "Invalid OTP."); }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    if (newPassword !== confirmNewPassword) { return showToast("Passwords do not match!"); }
    try {
        const res = await fetch(`${API_BASE_URL}/api/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmailForReset, password: newPassword }) });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);
        localStorage.setItem('userProfile', JSON.stringify(result.user));
        showToast('Password reset! Redirecting...', true);
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    } catch (error) { showToast(error.message || "Could not reset password."); }
}

async function handleGoogleSignIn(response) {
  const userProfile = JSON.parse(atob(response.credential.split('.')[1]));
  const standardizedProfile = { name: userProfile.name, email: userProfile.email, picture: userProfile.picture };
  localStorage.setItem('userProfile', JSON.stringify(standardizedProfile));
  await mergeGuestCart(standardizedProfile.email);
  showToast('Google Sign-In successful! Redirecting...', true);
  setTimeout(() => { window.location.href = 'index.html'; }, 1500);
}

function showToast(message, isSuccess = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${isSuccess ? 'success' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);
    toast.style.animation = 'slideIn 0.5s forwards, fadeOut 0.5s 4.5s forwards';
    setTimeout(() => toast.remove(), 5000);
}

