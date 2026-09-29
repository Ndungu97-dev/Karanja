// authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const { registerUser, verifyEmail, loginStepOne, verifyOtpAndLogin, logoutUser, getUserProfile } = require('../controllers/authController');
const router = express.Router();

router.post('/register', [
  body('fullName').trim().escape().notEmpty().withMessage('Full name is required.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars.')
], registerUser);

router.get('/verify-email', verifyEmail);
router.post('/login', loginStepOne);
router.post('/verify-otp', verifyOtpAndLogin);
router.post('/logout', logoutUser);
router.get('/profile', getUserProfile);

module.exports = router;

// paymentRoutes.js
const express = require('express');
const { initiateCheckout } = require('../controllers/paymentController');
const router = express.Router();
router.post('/checkout', initiateCheckout);
module.exports = router;
