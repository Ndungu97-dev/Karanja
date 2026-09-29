const express = require('express');
const router = express.Router();

// Import every controller explicitly with exact naming match
const {
  registerUser,
  loginStepOne,
  verifyOtpAndLogin,
  logoutUser,
  getUserProfile,
  deleteAccount
} = require('../controllers/authController');

// Define API endpoints
router.post('/register', registerUser);
router.post('/login-step-one', loginStepOne);
router.post('/verify-otp', verifyOtpAndLogin);
router.post('/logout', logoutUser);
router.get('/profile', getUserProfile);
router.delete('/account', deleteAccount);

module.exports = router;
