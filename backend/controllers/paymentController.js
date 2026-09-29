// Simulated Payment Controller (No API keys required yet)

exports.initiateMpesaStkPush = async (req, res) => {
  const { phoneNumber, amount } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Please provide a valid phone number.' });
  }

  // Simulate a realistic backend network delay
  setTimeout(() => {
    return res.status(200).json({
      success: true,
      message: `Simulated M-Pesa STK push sent to ${phoneNumber} for KSh ${amount}. Enter PIN on your phone to complete!`
    });
  }, 1000);
};

exports.initiatePayoneerPayment = async (req, res) => {
  const { amount } = req.body;

  setTimeout(() => {
    return res.status(200).json({
      success: true,
      redirectUrl: `/shop.html?payment=success&ref=SIM-${Date.now()}&amount=${amount}`,
      message: 'Simulated Payoneer session created. Redirecting...'
    });
  }, 1000);
};
