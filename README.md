90s Sports Shop - Fullstack E-Commerce Platform
Welcome to the official repository for the 90s Sports Shop, a complete, production-ready e-commerce web application. This project is built from the ground up using modern web technologies, providing a seamless and secure shopping experience for users and a powerful management dashboard for administrators.

The vision is inspired by the 90s, encouraging today’s generation to experience the joy of real-life sports.

Live Demo: https://ninetiessportsshop.onrender.com/

Table of Contents
Key Features

Tech Stack

Project Structure

Getting Started

API Endpoints

Screenshots

Key Features
🛍️ User-Facing (E-Commerce)
Modern & Responsive UI: Clean and intuitive design that works flawlessly on all devices.

Product Catalog & Search: Browse products with filters (category, price) and a powerful search functionality.

User Authentication: Secure user registration and login with password hashing (bcrypt.js), Google Sign-In, and a "Forgot Password" flow using OTP.

Shopping Cart: Persistent user-specific carts that merge guest carts upon login.

Full Checkout Process: A multi-step checkout process with form validation and dynamic shipping cost calculation.

Order Management: Users can view their order history and cancel pending orders.

Wishlist & Reviews: Users can add products to their wishlist and write reviews.

👑 Admin Dashboard
Secure Admin Panel: Separate, role-based access for administrators.

CRUD Operations: Full control to Create, Read, Update, and Delete products.

Order Management: View all orders and update their status (e.g., Pending, Shipped, Delivered).

User & Review Moderation: View all registered users and manage product reviews.

PDF Reporting: Generate and download PDF reports for individual orders, products, users, or a consolidated report of all data.

Tech Stack
Frontend
HTML5

CSS3 (with custom properties and responsive design)

JavaScript (ES6+): Vanilla JS for all frontend logic, DOM manipulation, and API calls (fetch).

Backend
Node.js: Event-driven, non-blocking I/O model.

Express.js: Fast, unopinionated, minimalist web framework for Node.js.

MySQL2: MySQL client for Node.js with focus on performance.

bcrypt.js: For hashing passwords.

SendGrid: For sending automated emails (Order Confirmation, Contact Form).

dotenv: For managing environment variables.

Database
TiDB Cloud: A distributed, cloud-native SQL database.

Deployment
Render: For hosting the Node.js backend and serving the static frontend files.

Project Structure
/
├── public/                 # All frontend static files (HTML, CSS, JS, Assets)
│   ├── index.html
│   ├── shop.html
│   ├── login.html
│   ├── admin_dashboard.html
│   ├── ... (and other .html, .css, .js files)
├── .env                    # Environment variables (DB credentials, API keys)
├── .gitignore              # Files to be ignored by Git
├── package.json            # Project dependencies and scripts
└── server.js               # Main backend server file (Express.js)

Getting Started
Prerequisites
Node.js (v14 or higher)

A running MySQL-compatible database (like TiDB Cloud or a local MySQL server)

Installation & Setup
Clone the repository:

git clone [https://github.com/Rishidevvix/90s-sports-shop.git](https://github.com/Rishidevvix/90s-sports-shop.git)
cd 90s-sports-shop

Install backend dependencies:

npm install

Set up environment variables:
Create a .env file in the root directory and add the following credentials:

DB_HOST=<your_db_host>
DB_USER=<your_db_user>
DB_PASSWORD=<your_db_password>
DB_NAME=<your_db_name>
DB_PORT=<your_db_port>
DB_SSL_CA_PATH=<path_to_your_ssl_ca_file> # Optional, for SSL
SENDGRID_API_KEY=<your_sendgrid_api_key>

Start the server:

npm start

The application will be running on http://localhost:3000.

API Endpoints
A few key API endpoints include:

POST /api/register - User registration

POST /api/login - User login

GET /api/products - Fetch all products

POST /api/place-order - Place a new order

GET /api/admin/stats - Fetch dashboard statistics (Admin only)

PUT /api/admin/orders/:id/status - Update order status (Admin only)

For a full list, please refer to the server.js file.

