// Global variable to store order details for PDF/Print
let currentOrderDetails = null;

document.addEventListener('DOMContentLoaded', async () => {
    const viewOrderId = localStorage.getItem('viewOrderId');
    const lastOrderId = localStorage.getItem('lastOrderId');
    const orderIdToFetch = viewOrderId || lastOrderId;

    const orderIdDisplay = document.getElementById('order-id-display');
    const downloadBtn = document.getElementById('download-pdf-btn');
    const printBtn = document.getElementById('print-invoice-btn');
    
    if (orderIdToFetch) {
        orderIdDisplay.textContent = `#${orderIdToFetch}`;
        await fetchAndDisplayOrderDetails(orderIdToFetch);
        if (currentOrderDetails) {
            downloadBtn.disabled = false;
            printBtn.disabled = false;
        }
        if (viewOrderId) localStorage.removeItem('viewOrderId');
        if (lastOrderId) localStorage.removeItem('lastOrderId'); 
    } else {
        const container = document.querySelector('.confirmation-container');
        if (container) {
            container.innerHTML = '<h1>No recent order found.</h1><a href="shop.html" class="action-btn continue-btn">Go to Shop</a>';
        }
    }

    downloadBtn.addEventListener('click', () => {
        if (currentOrderDetails) generateInvoicePDF(currentOrderDetails);
    });
    
    printBtn.addEventListener('click', () => {
        if (currentOrderDetails) window.print();
    });

    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => navLinks.classList.toggle("active"));
    }
});

async function fetchAndDisplayOrderDetails(orderId) {
    const itemsContainer = document.getElementById('order-items-container');
    const shippingContainer = document.getElementById('shipping-details-container');
    const header = document.querySelector('.confirmation-header');

    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`);
        if (!response.ok) throw new Error('Order details could not be retrieved.');

        const orderDetails = await response.json();
        currentOrderDetails = orderDetails;

        // CORRECTION 2: Order status ah check panni header ah maathurom
        if (orderDetails.status === 'Cancelled') {
            header.innerHTML = `
                <i class="fas fa-times-circle failure-icon"></i>
                <h1>Order Cancelled</h1>
                <p>Your order <strong id="order-id-display">#${orderId}</strong> was cancelled.</p>
            `;
        } else {
             header.innerHTML = `
                <i class="fas fa-check-circle success-icon"></i>
                <h1>Thank You For Your Order!</h1>
                <p>Your order <strong id="order-id-display">#${orderId}</strong> has been placed successfully.</p>
            `;
        }


        itemsContainer.innerHTML = orderDetails.items.map(item => `
            <div class="order-item">
                <img src="${item.imageUrl || 'https://placehold.co/60x60'}" alt="${item.product_name}">
                <div class="item-details">
                    <span>${item.product_name}</span>
                    <span class="item-qty">Qty: ${item.quantity}</span>
                </div>
                <span class="item-price">₹${(item.price * item.quantity).toLocaleString()}</span>
            </div>
        `).join('');

        const subtotal = orderDetails.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = parseFloat(orderDetails.total_amount) - subtotal;
        document.getElementById('subtotal-amount').textContent = `₹${subtotal.toLocaleString()}`;
        document.getElementById('shipping-amount').textContent = shipping > 0 ? `₹${shipping.toLocaleString()}` : 'FREE';
        document.getElementById('total-amount').textContent = `₹${parseFloat(orderDetails.total_amount).toLocaleString()}`;

        shippingContainer.innerHTML = `
            <p><strong>${orderDetails.customer_name}</strong></p>
            <p>${orderDetails.shipping_address}</p>
            <p><strong>Email:</strong> ${orderDetails.user_email}</p>
            <p><strong>Phone:</strong> ${orderDetails.user_phone}</p>
        `;
    } catch (error) {
        console.error("Failed to fetch order details:", error);
        itemsContainer.innerHTML = `<p class="error-text">Could not load order summary.</p>`;
        shippingContainer.innerHTML = `<p class="error-text">Could not load shipping details.</p>`;
    }
}

function generateInvoicePDF(orderDetails) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    imageToBase64('Asset/logo.png', function(base64Img) {
        const img = new Image();
        img.src = base64Img;
        img.onload = function() {
            const logoWidth = 35;
            const logoHeight = (img.height * logoWidth) / img.width;
            doc.addImage(base64Img, 'PNG', 14, 5, logoWidth, logoHeight); 
            doc.setFontSize(20);
            doc.text("Tax Invoice", 196, 20, { align: 'right' });
            doc.line(14, 35, 196, 35);
            doc.setFontSize(10);
            doc.text(`Order ID: #${orderDetails.id}`, 14, 42);
            const orderDate = new Date(orderDetails.created_at).toLocaleDateString('en-IN');
            doc.text(`Date: ${orderDate}`, 196, 42, { align: 'right' });
            doc.setFontSize(12);
            doc.text("Shipping To:", 14, 55);
            doc.setFontSize(10);
            doc.text(orderDetails.customer_name, 14, 61);
            const addressLines = doc.splitTextToSize(orderDetails.shipping_address, 80);
            doc.text(addressLines, 14, 66);
            const tableColumn = ["Item", "Quantity", "Price", "Total"];
            const tableRows = [];
            orderDetails.items.forEach(item => {
                tableRows.push([
                    item.product_name,
                    item.quantity,
                    `Rs. ${item.price.toLocaleString()}`,
                    `Rs. ${(item.price * item.quantity).toLocaleString()}`
                ]);
            });
            doc.autoTable({
                head: [tableColumn], body: tableRows, startY: 85,
                theme: 'striped', headStyles: { fillColor: [255, 102, 0] }
            });
            const finalY = doc.autoTable.previous.finalY;
            const subtotal = orderDetails.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const shipping = parseFloat(orderDetails.total_amount) - subtotal;
            doc.setFontSize(11);
            doc.text(`Subtotal: Rs. ${subtotal.toLocaleString()}`, 196, finalY + 10, { align: 'right' });
            doc.text(`Shipping: ${shipping > 0 ? `Rs. ${shipping.toLocaleString()}` : 'FREE'}`, 196, finalY + 16, { align: 'right' });
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`Grand Total: Rs. ${parseFloat(orderDetails.total_amount).toLocaleString()}`, 196, finalY + 24, { align: 'right' });
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text("Thank you for shopping at 90s Sports Shop! For any queries, contact ninteessports@gmail.com", 105, 285, { align: 'center' });
            doc.save(`90sSports_Invoice_${orderDetails.id}.pdf`);
        }
    });
}

function imageToBase64(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.onload = function() {
        const reader = new FileReader();
        reader.onloadend = function() { callback(reader.result); }
        reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
}

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost ? 'http://localhost:3000' : '';

