exports.initiateCheckout = async (req, res) => {
  const { amount, phoneOrCard, cartItems } = req.body;
  try {
    // Generate secure gateway redirect URL (e.g., integration point for M-Pesa Daraja or Stripe)
    const redirectUrl = `https://checkout.gateway.com/pay?ref=KARANJA-${Date.now()}&amount=${amount}`;
    return res.status(200).json({ success: true, redirectUrl, message: 'Redirecting to payment gateway...' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Payment gateway initialization failed.' });
  }
};
