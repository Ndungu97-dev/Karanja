const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');

// Import modular backend routes (relative to root server.js)
const authRoutes = require('./backend/routes/authRoutes');
const paymentRoutes = require('./backend/routes/paymentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. SECURITY & RATE LIMITING
// ==========================================

// Rate limiter to prevent brute-force attacks on login endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { success: false, message: 'Too many login attempts from this IP, please try again after 15 minutes.' }
});

// ==========================================
// 2. MIDDLEWARE CONFIGURATION
// ==========================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Secure Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'karanja_super_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if deploying with HTTPS enabled in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day session validity
  }
}));

// ==========================================
// 3. API ROUTE MAPPINGS
// ==========================================

// Apply rate limiter specifically to login
app.use('/api/auth/login', loginLimiter);

// Map authentication and payment routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);

// Server status endpoint for health checks
app.get('/api/status', (req, res) => {
  res.json({ success: true, message: 'Karanja Cyber Solutions & Academy API is running online.' });
});

// ==========================================
// 4. STATIC FRONTEND & FALLBACK ROUTING
// ==========================================

// Serve static assets (HTML, CSS, JS, images) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for single-page application support
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// 5. START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`Server is running securely on port ${PORT}`);
});
