const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// In-Memory Database (Replace with MongoDB/PostgreSQL in production)
const users = []; // { id, email, passwordHash, fullName, createdAt }
const activeSessions = new Map(); // sessionId -> { userId, email, loginTime, ip }

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'karanja_cyber_secure_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// --- AUTHENTICATION API ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      fullName,
      email,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    
    // Auto login after register
    req.session.userId = newUser.id;
    req.session.email = newUser.email;
    activeSessions.set(req.sessionID, { userId: newUser.id, email: newUser.email, loginTime: new Date(), ip: req.ip });

    res.json({ success: true, message: 'Registration successful!', user: { fullName: newUser.fullName, email: newUser.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    req.session.userId = user.id;
    req.session.email = user.email;
    activeSessions.set(req.sessionID, { userId: user.id, email: user.email, loginTime: new Date(), ip: req.ip });

    res.json({ success: true, message: 'Login successful!', user: { fullName: user.fullName, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  activeSessions.delete(req.sessionID);
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: 'Could not log out.' });
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// Current User State Check
app.get('/api/auth/session', (req, res) => {
  if (!req.session.userId) {
    return res.json({ loggedIn: false });
  }
  const user = users.find(u => u.id === req.session.userId);
  res.json({ loggedIn: true, user: user ? { fullName: user.fullName, email: user.email } : null });
});

// Active Sessions List (For dashboard / session management)
app.get('/api/auth/sessions', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const userSessions = Array.from(activeSessions.entries())
    .filter(([sid, sess]) => sess.userId === req.session.userId)
    .map(([sid, sess]) => ({
      sessionId: sid.substring(0, 8) + '...',
      loginTime: sess.loginTime,
      ip: sess.ip,
      current: sid === req.sessionID
    }));
  res.json({ success: true, sessions: userSessions });
});

// Contact Form Handler
app.post('/api/contact', (req, res) => {
  const { fullName, email, message } = req.body;
  console.log(`[CONTACT] From ${fullName} (${email}): ${message}`);
  res.json({ success: true, message: 'Thank you! Your message has been received. We will contact you shortly.' });
});

// Checkout Handler
app.post('/api/checkout', (req, res) => {
  const { cart, total } = req.body;
  if (!cart || cart.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty.' });
  }
  console.log(`[CHECKOUT] Order total: KSh ${total}, Items: ${cart.length}`);
  res.json({ success: true, message: 'Order placed successfully! Our team will reach out via 0714436151 for completion.' });
});

// Fallback HTML routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Karanja Cyber Solutions server running on http://localhost:${PORT}`);
});
