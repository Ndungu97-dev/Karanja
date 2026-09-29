const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const usersDB = []; // Replace with database model (MongoDB/PostgreSQL)

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Registration
exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { fullName, email, password, role = 'student' } = req.body;

  try {
    if (usersDB.find(u => u.email === email)) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    const newUser = {
      id: uuidv4(),
      fullName,
      email,
      password: hashedPassword,
      role,
      isVerified: false,
      verificationToken,
      otpCode: null,
      otpExpires: null
    };

    usersDB.push(newUser);

    const verificationLink = `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`;
    await transporter.sendMail({
      from: '"Karanja Cyber Academy" <no-reply@karanjacyber.com>',
      to: email,
      subject: 'Verify Your Email Address',
      html: `<h2>Welcome, ${fullName}!</h2><p>Click <a href="${verificationLink}">here</a> to activate your account.</p>`
    });

    return res.status(200).json({ success: true, message: 'Registration successful! Check your email to verify.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server registration error.' });
  }
};

// Email Verification
exports.verifyEmail = (req, res) => {
  const { token } = req.query;
  const user = usersDB.find(u => u.verificationToken === token);
  if (!user) return res.status(400).send('Invalid or expired token.');

  user.isVerified = true;
  user.verificationToken = null;
  return res.send('<h2>Email verified successfully! You can now log in.</h2><a href="/login.html">Proceed to Login</a>');
};

// Login Step 1: Password Check & Send OTP
exports.loginStepOne = async (req, res) => {
  const { email, password } = req.body;
  const user = usersDB.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ success: false, message: 'Invalid email or password.' });
  }

  if (!user.isVerified) {
    return res.status(403).json({ success: false, message: 'Please verify your email before logging in.' });
  }

  // Generate 6-digit OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otpCode = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  await transporter.sendMail({
    from: '"Karanja Cyber Academy" <no-reply@karanjacyber.com>',
    to: email,
    subject: 'Your Secure Login OTP Code',
    html: `<h3>Security Verification</h3><p>Your 2FA login code is: <b>${otp}</b></p><p>Valid for 10 minutes.</p>`
  });

  return res.status(200).json({ 
    success: true, 
    requiresOtp: true, 
    email: user.email,
    message: 'Password verified. Enter the 6-digit OTP sent to your email.' 
  });
};

// Login Step 2: Verify OTP & Issue Session
exports.verifyOtpAndLogin = (req, res) => {
  const { email, otp } = req.body;
  const user = usersDB.find(u => u.email === email);

  if (!user || user.otpCode !== otp || Date.now() > user.otpExpires) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
  }

  // Clear OTP token after use
  user.otpCode = null;
  user.otpExpires = null;

  // Create active session
  req.session.user = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role
  };

  return res.status(200).json({ success: true, message: 'Login complete!', user: req.session.user });
};

// Logout
exports.logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: 'Logout failed.' });
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  });
};

// User Profile Check
exports.getUserProfile = (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  return res.status(200).json({ success: true, user: req.session.user });
};
