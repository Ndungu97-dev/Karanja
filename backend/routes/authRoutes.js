const express = require('express');
const { 
  registerUser, 
  verifyEmail, 
  loginStepOne, 
  verifyOtpAndLogin, 
  logoutUser, 
  getUserProfile 
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.get('/verify-email', verifyEmail);
router.post('/login', loginStepOne);
router.post('/verify-otp', verifyOtpAndLogin);
router.post('/logout', logoutUser);
router.get('/profile', getUserProfile);

module.exports = router;
