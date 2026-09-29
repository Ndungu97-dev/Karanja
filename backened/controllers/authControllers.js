const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./backend/routes/authRoutes'); // Adjust path if your routes folder is structured differently

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/auth', authRoutes);

// Root route handler for testing server status
app.get('/api/status', (req, res) => {
  res.json({ success: true, message: 'Karanja Cyber Solutions API is running smoothly.' });
});

// Fallback to serve index.html for single-page routing if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`Server is running live on port ${PORT}`);
});
