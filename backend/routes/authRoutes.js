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
const { deleteAccount } = require('../controllers/authController');

// Route for a logged-in user to delete their own account
router.delete('/account', deleteAccount);

module.exports = router;
