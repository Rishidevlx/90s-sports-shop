// --- REQUIRED PACKAGES ---
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- APP INITIALIZATION ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// --- SERVE FRONTEND STATIC FILES ---
// NOTE: All your frontend files (HTML, CSS, JS, Assets) must be inside a 'public' folder for deployment.
app.use(express.static(path.join(__dirname, 'public')));


// --- DATABASE CONNECTION POOL ---
const dbConfig = {
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: {
        ca: process.env.DB_SSL_CA_PATH ? fs.readFileSync(process.env.DB_SSL_CA_PATH) : null
    }
};

const db = mysql.createPool(dbConfig);
console.log('MySQL Database Connection Pool Created.');


// --- SENDGRID EMAIL SETUP ---
const options = {
    auth: {
        api_key: process.env.SENDGRID_API_KEY
    }
}
const transporter = nodemailer.createTransport(sgTransport(options));
console.log('Nodemailer transporter configured for SendGrid.');

// ===================================
// ========== API ROUTES =============
// ===================================

// --- USER & AUTHENTICATION API's ---
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const [existingUsers] = await db.query('SELECT email FROM users WHERE email = ? OR phone = ?', [email, phone]);
        if (existingUsers.length > 0) return res.status(409).json({ message: 'Account with this email or phone already exists.' });
        
        const hashedPassword = await bcrypt.hash(password, 8);
        await db.query('INSERT INTO users SET ?', { name, email, phone, password: hashedPassword, role: 'user' });
        res.status(201).json({ message: 'User registered successfully!', user: { name, email, picture: null } });
    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({ message: 'Database error during registration.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ message: 'Incorrect email or password.' });
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Incorrect email or password.' });
        
        res.json({ 
            message: 'Login successful', 
            user: { name: user.name, email: user.email },
            role: user.role
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

app.get('/api/user', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    try {
        const [users] = await db.query('SELECT name, email, phone, dob FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch user details' });
    }
});

app.put('/api/user', async (req, res) => {
    const { name, phone, dob, originalEmail } = req.body;
    let newDob = dob;
    if (dob === '' || dob === null) {
        newDob = null;
    }
    try {
        await db.query('UPDATE users SET name = ?, phone = ?, dob = ? WHERE email = ?', [name, phone, newDob, originalEmail]);
        const updatedUser = { name, email: originalEmail, phone, dob };
        res.json({ message: 'Profile updated successfully!', user: updatedUser });
    } catch (error) {
        console.error("PROFILE UPDATE ERROR:", error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});


app.post('/api/change-password', async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;
    try {
        const [users] = await db.query('SELECT password FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        
        const user = users[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Incorrect current password.' });

        const hashedNewPassword = await bcrypt.hash(newPassword, 8);
        await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedNewPassword, email]);
        res.json({ message: 'Password changed successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to change password' });
    }
});


// --- ADMIN API's ---
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [revenueResult] = await db.query("SELECT SUM(total_amount) AS totalRevenue FROM orders WHERE status = 'Delivered'");
        const [ordersResult] = await db.query("SELECT COUNT(*) AS totalOrders FROM orders");
        const [productsResult] = await db.query("SELECT COUNT(*) AS totalProducts FROM products");

        res.json({
            totalRevenue: revenueResult[0].totalRevenue || 0,
            totalOrders: ordersResult[0].totalOrders || 0,
            totalProducts: productsResult[0].totalProducts || 0
        });
    } catch (error) {
        console.error("STATS FETCH ERROR:", error);
        res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
});


app.get('/api/admin/products', async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch products for admin' });
    }
});

app.get('/api/admin/orders', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT 
                o.id, o.user_email, o.customer_name, o.user_phone, o.shipping_address, 
                o.total_amount, o.payment_method, o.status, o.created_at
            FROM orders o 
            ORDER BY o.created_at DESC
        `);
        res.json(orders);
    } catch (error) {
        console.error("ADMIN ORDERS FETCH ERROR:", error);
        res.status(500).json({ message: 'Failed to fetch orders for admin' });
    }
});

app.put('/api/admin/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: `Order #${id} status updated to ${status}` });
    } catch (error) {
        console.error(`Error updating status for order ${id}:`, error);
        res.status(500).json({ message: 'Failed to update order status' });
    }
});

app.get('/api/admin/reviews', async (req, res) => {
    try {
        const [reviews] = await db.query(`
            SELECT c.id, c.user_name, c.rating, c.comment_text, c.created_at, p.name AS product_name
            FROM comments c
            JOIN products p ON c.product_id = p.id
            ORDER BY c.created_at DESC
        `);
        res.json(reviews);
    } catch (error) {
        console.error("ADMIN REVIEWS FETCH ERROR:", error);
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
});

app.delete('/api/admin/reviews/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM comments WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Review not found.' });
        }
        res.json({ message: 'Review deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting review ${id}:`, error);
        res.status(500).json({ message: 'Failed to delete review.' });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT id, name, email, phone, role, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error("ADMIN USERS FETCH ERROR:", error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});


app.post('/api/admin/products', async (req, res) => {
    try {
        const { name, regularPrice, discountPrice, category, stock, imageUrl, description, brand } = req.body;
        
        if (!name || !discountPrice || !category || !imageUrl) {
            return res.status(400).json({ message: 'Name, Discount Price, Category, and Image URL are required.' });
        }

        const newProduct = { 
            name, 
            regularPrice: regularPrice || null, 
            discountPrice, 
            category, 
            stock: stock || 0,
            imageUrl, 
            description: description || '',
            brand: brand || 'N/A'
        };
        await db.query('INSERT INTO products SET ?', newProduct);
        res.status(201).json({ message: 'Product added successfully!' });
    } catch (error) {
        console.error('ADD PRODUCT ERROR:', error);
        res.status(500).json({ message: 'Failed to add product. Check database constraints.' });
    }
});

app.put('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, regularPrice, discountPrice, category, stock, imageUrl, description, brand } = req.body;

        if (!name || !discountPrice || !category || !imageUrl) {
            return res.status(400).json({ message: 'Name, Discount Price, Category, and Image URL are required.' });
        }
        
        const updatedProduct = { 
            name, 
            regularPrice: regularPrice || null, 
            discountPrice, 
            category, 
            stock: stock || 0,
            imageUrl, 
            description: description || '',
            brand: brand || 'N/A' 
        };
        await db.query('UPDATE products SET ? WHERE id = ?', [updatedProduct, id]);
        res.json({ message: 'Product updated successfully!' });
    } catch (error) {
        console.error('UPDATE PRODUCT ERROR:', error);
        res.status(500).json({ message: 'Failed to update product. Check database constraints.' });
    }
});

app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Product deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete product.' });
    }
});


// --- PUBLIC E-COMMERCE API's ---
app.get('/api/products', async (req, res) => {
    const { search } = req.query;
    let sql = 'SELECT * FROM products';
    if (search) sql += ` WHERE name LIKE ${db.escape('%' + search + '%')}`;
    try {
        const [products] = await db.query(sql);
        res.json(products);
    } catch (error) { res.status(500).json({ message: 'Failed to fetch products' }); }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (results.length === 0) return res.status(404).json({ message: "Product not found" });
        res.json(results[0]);
    } catch (err) { res.status(500).json({ message: "Failed to fetch product" }); }
});

app.get('/api/products/:id/comments', async (req, res) => {
    try {
        const [comments] = await db.query('SELECT * FROM comments WHERE product_id = ? ORDER BY created_at DESC', [req.params.id]);
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch comments" });
    }
});

app.post('/api/products/:id/comments', async (req, res) => {
    try {
        const { userName, userImage, rating, commentText } = req.body;
        const newComment = { product_id: req.params.id, user_name: userName, user_image: userImage, rating, comment_text: commentText };
        await db.query('INSERT INTO comments SET ?', newComment);
        res.status(201).json({ message: 'Comment added successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to submit comment.' });
    }
});

app.get('/api/wishlist', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    try {
        const [wishlist] = await db.query('SELECT p.* FROM wishlist w JOIN products p ON w.product_id = p.id WHERE w.user_email = ?', [email]);
        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch wishlist' });
    }
});

app.post('/api/wishlist', async (req, res) => {
    const { email, productId } = req.body;
    try {
        const [existing] = await db.query('SELECT id FROM wishlist WHERE user_email = ? AND product_id = ?', [email, productId]);
        if (existing.length > 0) {
            await db.query('DELETE FROM wishlist WHERE id = ?', [existing[0].id]);
            res.json({ message: 'Removed from wishlist', added: false });
        } else {
            await db.query('INSERT INTO wishlist SET ?', { user_email: email, product_id: productId });
            res.json({ message: 'Added to wishlist!', added: true });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to update wishlist' });
    }
});

app.get('/api/my-orders', async (req, res) => {
    try {
        const [orders] = await db.query('SELECT * FROM orders WHERE user_email = ? ORDER BY created_at DESC', [req.query.email]);
        res.json(orders);
    } catch(err) {
        res.status(500).json({ message: 'Failed to fetch user orders.' });
    }
});

app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const [order] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (order.length === 0) return res.status(404).json({ message: 'Order not found.' });
        const [items] = await db.query('SELECT oi.*, p.imageUrl FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE order_id = ?', [orderId]);
        res.json({ ...order[0], items });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch order details.' });
    }
});

app.put('/api/orders/:orderId/cancel', async (req, res) => {
    const { orderId } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [orders] = await connection.query("SELECT * FROM orders WHERE id = ?", [orderId]);
        if (orders.length === 0) throw new Error('Order not found.');
        if (orders[0].status === 'Cancelled' || orders[0].status === 'Delivered') {
            throw new Error(`Cannot cancel an order that is already ${orders[0].status}.`);
        }

        const [itemsToRestock] = await connection.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId]);

        if (itemsToRestock.length > 0) {
            const stockUpdatePromises = itemsToRestock.map(item => 
                connection.query("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id])
            );
            await Promise.all(stockUpdatePromises);
        }

        await connection.query("UPDATE orders SET status = 'Cancelled' WHERE id = ?", [orderId]);
        
        const emailContent = {
            to: orders[0].user_email,
            from: 'rishiaravindhaoff@gmail.com',
            subject: `Order Cancelled: #${orderId}`,
            html: `<h1>Your Order #${orderId} has been cancelled.</h1><p>We're sorry to see you go. The items from your order have been restocked. If you have any questions, please contact our support. If you have already paid, a refund will be processed within 3-5 business days.</p>`
        };
        await transporter.sendMail(emailContent);
        
        await connection.commit();
        res.json({ message: 'Order has been cancelled and items restocked.' });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message || 'Failed to cancel order.' });
    } finally {
        connection.release();
    }
});


app.get('/api/payment-history', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.id, o.created_at, o.total_amount, o.payment_method, GROUP_CONCAT(oi.product_name SEPARATOR ', ') as products
            FROM orders o JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_email = ? AND o.status != 'Cancelled'
            GROUP BY o.id ORDER BY o.created_at DESC`, [req.query.email]);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch payment history.' });
    }
});

app.post('/api/place-order', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { userDetails, shippingAddress, orderItems, paymentMethod } = req.body;

        const productIds = orderItems.map(item => item.id);
        const [productsInStock] = await connection.query("SELECT id, name, stock FROM products WHERE id IN (?)", [productIds]);
        
        for (const item of orderItems) {
            const product = productsInStock.find(p => p.id === item.id);
            if (!product || product.stock < item.quantity) {
                throw new Error(`Sorry, we don't have enough stock for ${product ? product.name : 'an item'}. Available: ${product ? product.stock : 0}, Requested: ${item.quantity}.`);
            }
        }

        const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingFee = subtotal > 5000 ? 0 : 50;
        const orderData = {
            user_email: userDetails.email, customer_name: `${userDetails.firstName} ${userDetails.lastName}`,
            user_phone: userDetails.phone, shipping_address: `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}`,
            total_amount: subtotal + shippingFee, payment_method: paymentMethod, status: 'Pending'
        };
        const [orderResult] = await connection.query('INSERT INTO orders SET ?', orderData);
        const orderId = orderResult.insertId;
        const orderItemsData = orderItems.map(item => [orderId, item.id, item.name, item.quantity, item.price]);
        await connection.query('INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ?', [orderItemsData]);
        
        const stockUpdatePromises = orderItems.map(item => 
            connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.id])
        );
        await Promise.all(stockUpdatePromises);

        const itemsHtml = orderItems.map(item => `<tr><td>${item.name} (x${item.quantity})</td><td>₹${(item.price * item.quantity).toLocaleString()}</td></tr>`).join('');
        const emailContent = {
            to: userDetails.email, from: 'rishiaravindhaoff@gmail.com', subject: `Order Confirmation #${orderId}`,
            html: `<h1>Thank You For Your Order!</h1><p>Your order #${orderId} has been placed successfully.</p><h3>Order Summary:</h3><table border="1" cellpadding="5" cellspacing="0"><thead><tr><th>Product</th><th>Price</th></tr></thead><tbody>${itemsHtml}</tbody></table><h4>Total: ₹${orderData.total_amount.toLocaleString()}</h4><p>Shipping to: ${orderData.shipping_address}</p>`
        };
        await transporter.sendMail(emailContent);
        
        await connection.commit();
        res.status(201).json({ message: 'Order placed successfully!', orderId: orderId });

    } catch (error) {
        await connection.rollback();
        console.error("PLACE ORDER ERROR:", error);
        res.status(400).json({ message: error.message || 'Failed to save order.' });
    } finally {
        connection.release();
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        
        const mailToAdmin = {
            to: 'rishiaravindhaoff@gmail.com', from: 'rishiaravindhaoff@gmail.com', subject: `New Contact Form Message: ${subject}`,
            html: `<h3>You have a new message from ${name} (${email})</h3><p><b>Phone:</b> ${phone}</p><p><b>Message:</b></p><p>${message}</p>`
        };
        await transporter.sendMail(mailToAdmin);

        const mailToUser = {
            to: email, from: 'rishiaravindhaoff@gmail.com', subject: 'We have received your message!',
            html: `<h3>Hi ${name},</h3><p>Thank you for contacting 90s Sports Shop. We have received your message and will get back to you shortly.</p><p>Best Regards,<br>The 90s Sports Team</p>`
        };
        await transporter.sendMail(mailToUser);

        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send message.' });
    }
});

// --- CATCH-ALL ROUTE FOR FRONTEND (Corrected) ---
// This route must be the LAST route. It handles all non-API GET requests.
// 👇 server.js la bottom side, routes ellathukkum last la add pannunga
app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});



// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});

