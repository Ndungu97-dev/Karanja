/**
 * Karanja Cyber Solutions - Production Core Server
 * OWASP Top 10 Hardened Architecture + Anti-Scanner Protection
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

// Winston Security Logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [ new winston.transports.Console() ]
});

// 1. OWASP Security Headers & CSP Configuration
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

// 2. Anti-Reconnaissance & Vulnerability Scanner Blocking Middleware
const blockedUserAgents = [/nikto/i, /sqlmap/i, /nuclei/i, /nmap/i, /masscan/i, /dirbuster/i, /gobuster/i, /ffuf/i, /acunetix/i, /netsparker/i];

app.use((req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  for (const pattern of blockedUserAgents) {
    if (pattern.test(userAgent)) {
      logger.warn('Automated Scanner Blocked', { ip: req.ip, userAgent });
      return res.status(403).json({ error: 'Access Denied: Automated reconnaissance tool detected.' });
    }
  }
  next();
});

// 3. Static File Serving (Supports root and public/ subfolder)
const staticDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : __dirname;

app.use(express.static(staticDir));

// 4. Rate Limiting Rules
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 200,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, error: 'Too many login/registration attempts. Account temporarily locked.' }
});

app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);

// In-Memory Database
const users = [];

// 5. Security & Indexing Endpoints
app.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain');
  res.send(`Contact: tel:+254714436151\nContact: mailto:security@karanjacyber.co.ke\nExpires: 2027-12-31T23:59:59.000Z\nPolicy: https://karanja.onrender.com/security-policy\nPreferred-Languages: en, sw`);
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nSitemap: https://karanja.onrender.com/sitemap.xml`);
});

// 6. Page Routes
const sendPage = (res, pageName) => {
  const filePath = path.join(staticDir, pageName);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send(`<h1>404 - ${pageName} not found</h1>`);
};

app.get('/', (req, res) => sendPage(res, 'index.html'));
app.get('/about', (req, res) => sendPage(res, 'about.html'));
app.get('/services', (req, res) => sendPage(res, 'services.html'));
app.get('/shop', (req, res) => sendPage(res, 'shop.html'));
app.get('/contact', (req, res) => sendPage(res, 'contact.html'));

// 7. API Endpoints (Auth, Purchase & Contact)
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
    return res.status(400).json({ success: false, message: 'Account already exists.' });
  }

  const newUser = { id: Date.now(), fullName, email, phone, password };
  users.push(newUser);
  logger.info('User Registered', { email, phone });

  res.status(201).json({ success: true, message: 'Registration successful! You can now login.', user: { fullName, email, phone } });
});

app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

  res.status(200).json({ success: true, message: 'Login successful!', user: { fullName: user.fullName, email: user.email, phone: user.phone } });
});

app.post('/api/courses/purchase', [
  body('courseId').notEmpty(),
  body('courseName').notEmpty(),
  body('userEmail').isEmail(),
  body('paymentPhone').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { courseName, paymentPhone } = req.body;
  res.status(200).json({ success: true, message: `Enrollment initiated for ${courseName}! Confirmation sent to ${paymentPhone}.` });
});

app.post('/api/contact', [
  body('fullName').trim().isLength({ min: 2 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('message').trim().isLength({ min: 5 }).escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  res.status(200).json({ success: true, message: 'Message sent securely to 0714436151.' });
});

app.get('*', (req, res) => sendPage(res, 'index.html'));

app.listen(PORT, () => {
  console.log(`[+] Karanja Cyber Solutions running on port ${PORT}`);
});
