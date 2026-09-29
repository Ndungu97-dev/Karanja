const express = require('express');
const { initiateMpesaStkPush, initiatePayoneerPayment } = require('../controllers/paymentController');
const router = express.Router();

router.post('/mpesa-stk', initiateMpesaStkPush);
router.post('/payoneer', initiatePayoneerPayment);

module.exports = router;
