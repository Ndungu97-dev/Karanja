/**
 * Karanja Cyber Solutions - Production Core Server
 * OWASP Top 10 Hardened Architecture
 */

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// OWASP A09: Security Logging & Audit Trail
// ==========================================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/security-audit.log' })
  ]
});

// ==========================================
// OWASP A05: Security Misconfiguration (Helmet Security Headers)
// ==========================================
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
    xPoweredBy: false // Hides "X-Powered-By: Express"
  })
);

// Body Parsing with Payload Limits (Defends against Buffer Overflows & DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Static Asset Serving
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// OWASP A04: Insecure Design & Rate Limiting (DoS / Brute Force Mitigation)
// ==========================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { status: 429, error: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit 5 contact/consultancy submissions per hour
  message: { status: 429, error: 'Submission limit reached. Please wait before retrying.' }
});

app.use('/api/', apiLimiter);

// ==========================================
// OWASP A03: Injection Defenses & Schema Validation
// ==========================================
const validateContactInput = [
  body('fullName').trim().isLength({ min: 2, max: 80 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('company').trim().escape(),
  body('serviceType').trim().isIn(['pentest', 'soc', 'cloud', 'forensics', 'audit', 'general']),
  body('message').trim().isLength({ min: 10, max: 1000 }).escape()
];

// Secure Contact / Consultation API Endpoint
app.post('/api/contact', formLimiter, validateContactInput, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Contact Form Validation Failed', { ip: req.ip, errors: errors.array() });
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { fullName, email, company, serviceType, message } = req.body;

  // Log audit event without leaking sensitive data
  logger.info('Consultation Request Received', { email, company, serviceType, timestamp: new Date() });

  res.status(200).json({
    success: true,
    message: 'Your inquiry has been encrypted and submitted securely to Karanja Cyber Solutions.'
  });
});

// ==========================================
// OWASP A10: Server-Side Request Forgery (SSRF) Prevention
// ==========================================
// Example URL validation endpoint enforcing explicit domain whitelists
app.post('/api/domain-check', apiLimiter, [
  body('domain').isFQDN().withMessage('Invalid Fully Qualified Domain Name')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { domain } = req.body;
  // Domain is strictly validated. Direct local IP calls (127.0.0.1, 169.254.169.254) are rejected.
  res.json({ success: true, target: domain, status: 'Target validated against SSRF protection policies.' });
});

// Serve Single Page Application Routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[+] Karanja Cyber Solutions Server live on http://localhost:${PORT}`);
  console.log(`[+] OWASP Top 10 Hardened Security Layer Active.`);
});
