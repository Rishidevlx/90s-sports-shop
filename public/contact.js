document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submit-btn');

            // Form la irundhu data va edukrom
            const formData = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                phone: document.getElementById('contact-phone').value,
                subject: document.getElementById('contact-subject').value,
                message: document.getElementById('contact-message').value
            };

            // Simple validation
            if (!formData.name || !formData.email || !formData.subject || !formData.message) {
                showToast("Please fill in all required fields.", false);
                return;
            }
            
            // Button ah disable panni, text ah maathurom
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            try {
                // Localhost ah illaya nu check panrom
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const API_BASE_URL = isLocalhost ? 'http://localhost:3000' : '';

                // Backend ku data va anupurom
                const response = await fetch(`${API_BASE_URL}/api/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    showToast(result.message, true);
                    contactForm.reset(); // Form ah clear panrom
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                showToast(error.message || 'An error occurred. Please try again.', false);
            } finally {
                // Button ah marubadiyum enable panrom
                submitBtn.textContent = 'Send Message';
                submitBtn.disabled = false;
            }
        });
    }
});

// Toast notification function (idhu auth.js la irundhu varum nu nambrom)
// Oru vela `auth.js` illadha page la use panna, ingayum antha function ah define pannanum.
// Aana namma contact.html la auth.js already iruku.
