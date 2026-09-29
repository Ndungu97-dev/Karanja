// authRoutes.js

// paymentRoutes.js
const express = require('express');
const { initiateCheckout } = require('../controllers/paymentController');
const router = express.Router();
router.post('/checkout', initiateCheckout);
module.exports = router;
