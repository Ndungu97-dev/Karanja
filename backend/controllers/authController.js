const User = require('../models/User');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- 1. USER REGISTRATION ---
exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword
    });

    await newUser.save();

    try {
      await transporter.sendMail({
        from: `"Karanja Cyber Academy" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to Karanja Cyber Solutions & Academy',
        html: `<div style="font-family: monospace; background: #020617; color: #f8fafc; padding: 24px; border-radius: 12px;"><h2>Welcome, ${fullName}!</h2><p>Your account has been created successfully.</p></div>`
      });
    } catch (emailErr) {
      console.error('Welcome email dispatch failed:', emailErr.message);
    }

    return res.status(200).json({ success: true, message: 'Registration successful! You can now log in.' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// --- 2. LOGIN STEP 1 (Verify Password & Dispatch OTP) ---
exports.loginStepOne = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
      await transporter.sendMail({
        from: `"Karanja Cyber Academy Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Login Security OTP Code',
        html: `<div style="font-family: monospace; background: #020617; color: #f8fafc; padding: 24px; border-radius: 12px;"><h3>Your Login OTP:</h3><h1 style="color: #06b6d4;">${otp}</h1><p>Valid for 10 minutes.</p></div>`
      });
    } catch (emailErr) {
      console.error('OTP email dispatch failed:', emailErr.message);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email.' });
    }

    return res.status(200).json({ success: true, message: 'Password verified. OTP sent to your email.' });
  } catch (err) {
    console.error('Login Step 1 error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// --- 3. LOGIN STEP 2 (Verify OTP & Initialize Session) ---
exports.verifyOtpAndLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
    }

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    req.session.user = { 
      fullName: user.fullName, 
      email: user.email, 
      role: user.role 
    };

    return res.status(200).json({ success: true, message: 'Login verified successfully!' });
  } catch (err) {
    console.error('OTP Verification error:', err);
    return res.status(500).json({ success: false, message: 'Server error during OTP validation.' });
  }
};

// --- 4. LOGOUT ---
exports.logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: 'Could not log out.' });
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  });
};

// --- 5. GET PROFILE ---
exports.getUserProfile = (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized session.' });
  return res.status(200).json({ success: true, user: req.session.user });
};

// --- 6. DELETE ACCOUNT ---
exports.deleteAccount = async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    await User.deleteOne({ email: req.session.user.email });

    req.session.destroy(err => {
      res.clearCookie('connect.sid');
      return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error during deletion.' });
  }
};
