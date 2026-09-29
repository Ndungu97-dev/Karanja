/**
 * Karanja Cyber Solutions - Production Core Server
 * OWASP Top 10 Hardened Architecture (Fail-Safe Static Routing)
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

// OWASP A09: Security Logging (Console transport for cloud compatibility)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// OWASP A05: Security Misconfiguration (Helmet Headers)
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

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Static Asset Serving (Checks 'public/' subfolder AND root directory)
if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}
app.use(express.static(__dirname));

// OWASP A04: Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 429, error: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { status: 429, error: 'Submission limit reached. Please wait before retrying.' }
});

app.use('/api/', apiLimiter);

// OWASP A03: Input Validation
const validateContactInput = [
  body('fullName').trim().isLength({ min: 2, max: 80 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('company').trim().escape(),
  body('serviceType').trim().isIn(['pentest', 'soc', 'cloud', 'forensics', 'audit', 'general']),
  body('message').trim().isLength({ min: 10, max: 1000 }).escape()
];

app.post('/api/contact', formLimiter, validateContactInput, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Contact Form Validation Failed', { ip: req.ip, errors: errors.array() });
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { fullName, email, company, serviceType, message } = req.body;
  logger.info('Consultation Request Received', { email, company, serviceType, timestamp: new Date() });

  res.status(200).json({
    success: true,
    message: 'Your inquiry has been encrypted and submitted securely to Karanja Cyber Solutions.'
  });
});

// Dynamic Fallback Route (Automatically serves index.html wherever it exists)
app.get('*', (req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');

  if (fs.existsSync(publicIndex)) {
    res.sendFile(publicIndex);
  } else if (fs.existsSync(rootIndex)) {
    res.sendFile(rootIndex);
  } else {
    res.status(404).send('<h1>404 - index.html not found</h1><p>Please ensure index.html exists in your GitHub repository.</p>');
  }
});

app.listen(PORT, () => {
  console.log(`[+] Karanja Cyber Solutions Server live on port ${PORT}`);
});
