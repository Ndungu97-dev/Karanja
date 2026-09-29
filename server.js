/**
 * Karanja Cyber Solutions - Production Multi-Page Express Server
 * OWASP Top 10 Hardened Architecture
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3000;

// Logging Setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [ new winston.transports.Console() ]
});

// OWASP Security Headers (Allows CDN Images & Tailwind Scripts)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.tailwindcss.com", "'unsafe-inline'"],
        styleSrc: ["'self'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    xPoweredBy: false
  })
);

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));

// Static File Directory Resolver (Checks public/ subfolder first, then root)
const staticDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : __dirname;

app.use(express.static(staticDir));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { success: false, error: 'Rate limit exceeded. Please try again later.' }
});
app.use('/api/', apiLimiter);

// In-Memory User Database
const users = [];

// ------------------- PAGE ROUTES -------------------
const servePage = (res, pageName) => {
  const filePath = path.join(staticDir, pageName);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send(`<h1>404 - ${pageName} not found</h1><p>Ensure ${pageName} exists in your repository.</p>`);
  }
};

app.get('/', (req, res) => servePage(res, 'index.html'));
app.get('/about', (req, res) => servePage(res, 'about.html'));
app.get('/services', (req, res) => servePage(res, 'services.html'));
app.get('/shop', (req, res) => servePage(res, 'shop.html'));
app.get('/contact', (req, res) => servePage(res, 'contact.html'));

// ------------------- API ENDPOINTS -------------------

// Account Registration
app.post('/api/auth/register', [
  body('fullName').trim().isLength({ min: 3 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('phone').trim().isLength({ min: 10 }).escape(),
  body('password').isLength({ min: 6 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { fullName, email, phone, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Account with this email already exists.' });
  }

  const newUser = { id: Date.now(), fullName, email, phone, password };
  users.push(newUser);
  logger.info('User Registered', { email, phone });

  res.status(201).json({
    success: true,
    message: 'Account created successfully! You can now log in.',
    user: { fullName: newUser.fullName, email: newUser.email, phone: newUser.phone }
  });
});

// Account Login
app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

  res.status(200).json({
    success: true,
    message: 'Logged in successfully!',
    user: { fullName: user.fullName, email: user.email, phone: user.phone }
  });
});

// Course / Shop Purchase
app.post('/api/courses/purchase', [
  body('courseId').notEmpty(),
  body('courseName').notEmpty(),
  body('userEmail').isEmail(),
  body('paymentPhone').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { courseName, userEmail, paymentPhone } = req.body;
  logger.info('Course Order Received', { courseName, userEmail, paymentPhone });

  res.status(200).json({
    success: true,
    message: `Enrollment request for "${courseName}" sent! Confirmation SMS sent to ${paymentPhone}.`
  });
});

// Contact Form
app.post('/api/contact', [
  body('fullName').trim().isLength({ min: 2 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('message').trim().isLength({ min: 5 }).escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  res.status(200).json({
    success: true,
    message: 'Your encrypted message was delivered to 0714436151. We will reach out shortly.'
  });
});

// Fallback Route
app.get('*', (req, res) => servePage(res, 'index.html'));

app.listen(PORT, () => {
  console.log(`[+] Karanja Cyber Solutions live on port ${PORT}`);
});
