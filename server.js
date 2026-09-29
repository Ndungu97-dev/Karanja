require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./backend/routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// CRITICAL for Render / HTTPS proxy handling
app.set('trust proxy', 1);

// Middleware to parse incoming JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'karanja_default_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true on Render (HTTPS)
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 60 * 1000 // 30 minutes session life
  }
}));

// Serve Static Frontend Assets from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/api/auth', authRoutes);

// Fallback route for SPA or root navigation if needed
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Karanja Cyber Academy server running on port ${PORT}`);
});
