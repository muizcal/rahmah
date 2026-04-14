// ============================================================
// J-FAB PERFUMES — BACKEND SERVER
// Node.js + Express + MongoDB
// ============================================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();

// Trust Railway's reverse proxy so express-rate-limit reads the real client IP
app.set('trust proxy', 1);

// ─── Ensure upload directories exist ────────────────────────────────────────
['uploads', 'uploads/requests'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS — allow your frontend URLs
// Build allowed origins from env — add FRONTEND_URL or CUSTOM_DOMAIN in Railway vars
const allowedOrigins = [
  'https://j-fab.vercel.app',
  'https://j-fab-git-main.vercel.app',
  'https://www.j-fabperfumes.com',
  'https://j-fabperfumes.com',
  process.env.FRONTEND_URL,   // e.g. https://yourdomain.com
  process.env.CUSTOM_DOMAIN,  // any extra domain
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman, curl, mobile
    // Allow any origin matching env vars, vercel previews, or custom domain
    const allowed = allowedOrigins.some(o => origin === o) ||
                    origin.endsWith('.vercel.app') ||
                    (process.env.CUSTOM_DOMAIN && origin.includes(process.env.CUSTOM_DOMAIN));
    if (allowed) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200  // Some browsers (IE11) choke on 204
};

app.use(cors(corsOptions));

// Handle OPTIONS preflight for ALL routes explicitly
app.options('*', cors(corsOptions));

// Rate limiting — 200 requests per 15 min per IP
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later' }
}));

// Stricter rate limit on auth routes
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, try again in 15 minutes' }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static files (uploaded images) ─────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/requests',      require('./routes/requests'));
app.use('/api/config',        require('./routes/config'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/promos',        require('./routes/promos'));

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'J-Fab Perfumes API is running 🌹',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ─── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred'
  });
});

// ─── Connect to MongoDB then start server ────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`\n🌹 J-Fab Perfumes API running on port ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health\n`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
