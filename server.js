require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');

const authRoutes = require('./backend/routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render deployment sessions
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 60 * 1000
  }
}));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Connect to MongoDB Atlas first, then start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected successfully to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`Karanja Cyber Academy server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection failure:', err);
  });
