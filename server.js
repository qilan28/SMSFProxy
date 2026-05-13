require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDB } = require('./config/database');

// Initialize database
initDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/services', require('./routes/services'));
app.use('/api/admin', require('./routes/admin'));

// Frontend pages - User
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'user', 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'user', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'user', 'register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'user', 'dashboard.html')));
app.get('/recharge', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'user', 'recharge.html')));

// Frontend pages - Admin
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'admin', 'login.html')));
app.get('/admin/login', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'admin', 'login.html')));
app.get('/admin/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'admin', 'dashboard.html')));
app.get('/admin/services', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'admin', 'services.html')));
app.get('/admin/cards', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'admin', 'cards.html')));
app.get('/admin/users', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'admin', 'users.html')));
app.get('/admin/orders', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'admin', 'orders.html')));

// 404 handler
app.use((req, res) => res.status(404).json({ code: 404, msg: 'Not Found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: 500, msg: '服务器内部错误' });
});

const Order = require('./models/Order');

const AUTO_CLEANUP_DAYS = parseInt(process.env.AUTO_CLEANUP_DAYS, 10) || 7;
const AUTO_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

if (AUTO_CLEANUP_DAYS > 0) {
  setInterval(() => {
    try {
      const deleted = Order.deleteOldOrders(AUTO_CLEANUP_DAYS);
      if (deleted > 0) {
        console.log(`[AutoCleanup] Deleted ${deleted} old orders (older than ${AUTO_CLEANUP_DAYS} days)`);
      }
    } catch (e) {
      console.error('[AutoCleanup] Error:', e.message);
    }
  }, AUTO_CLEANUP_INTERVAL);
  console.log(`Auto-cleanup enabled: deleting terminal orders older than ${AUTO_CLEANUP_DAYS} days (checked hourly)`);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SMSF Proxy Server running at http://localhost:${PORT}`);
  console.log(`User page: http://localhost:${PORT}/login`);
  console.log(`Admin page: http://localhost:${PORT}/admin`);
});
