const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// In-memory user store (or connect to your database)
const users = []; // Temporary mock storage if not using DB yet

// Configure Nodemailer transporter (e.g., using Gmail or SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or use host/port for custom SMTP
  auth: {
    user: process.env.EMAIL_USER, // Your email address in environment variables
    pass: process.env.EMAIL_PASS  // Your email app password
  }
});

// --- REGISTRATION ---
exports.registerUser = async (req, res) => {
  const { fullName, email, password } = req.body;
  
  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email is already registered.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { fullName, email, password: hashedPassword, role: 'student', otp: null, otpExpiry: null };
  users.push(newUser);

  // Send Welcome Email
  try {
    await transporter.sendMail({
      from: `"Karanja Cyber Academy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Karanja Cyber Solutions & Academy',
      html: `<h3>Hello ${fullName},</h3><p>Your account has been successfully created. Welcome to our cloud & cybersecurity academy platform!</p>`
    });
  } catch (mailErr) {
    console.error('Welcome email failed to send:', mailErr.message);
  }

  return res.status(200).json({ success: true, message: 'Registration successful! Welcome email sent.' });
};

// --- LOGIN STEP 1 (Generate & Email OTP) ---
exports.loginStepOne = async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ success: false, message: 'Invalid email or password.' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpiry = Date.now() + 10 * 60 * 1000; // Valid for 10 minutes

  // Send OTP Email
  try {
    await transporter.sendMail({
      from: `"Karanja Cyber Academy Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Login Security OTP Code',
      html: `<h3>Authentication Verification</h3><p>Your 6-digit login OTP code is: <b style="font-size: 18px; color: #06b6d4;">${otp}</b></p><p>This code expires in 10 minutes.</p>`
    });
  } catch (mailErr) {
    console.error('OTP email failed to send:', mailErr.message);
    return res.status(500).json({ success: false, message: 'Failed to dispatch OTP email.' });
  }

  return res.status(200).json({ success: true, message: 'Password verified. 6-digit OTP sent to your email.' });
};

// --- LOGIN STEP 2 (Verify OTP & Start Session) ---
exports.verifyOtpAndLogin = (req, res) => {
  const { email, otp } = req.body;
  const user = users.find(u => u.email === email);

  if (!user || user.otp !== otp || Date.now() > user.otpExpiry) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
  }

  // Clear OTP and set session
  user.otp = null;
  user.otpExpiry = null;
  req.session.user = { fullName: user.fullName, email: user.email, role: user.role };

  return res.status(200).json({ success: true, message: 'Login verified successfully!' });
};

// --- LOGOUT ---
exports.logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: 'Could not log out.' });
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  });
};

// --- USER PROFILE ---
exports.getUserProfile = (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized session.' });
  }
  return res.status(200).json({ success: true, user: req.session.user });
};

// Add or verify this function exists and is exported in authController.js:
exports.verifyEmail = (req, res) => {
  const { token } = req.query;
  return res.status(200).json({ 
    success: true, 
    message: 'Email verification endpoint active.' 
  });
};
