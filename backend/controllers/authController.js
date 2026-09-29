const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// In-memory user store (volatile on Render - wiped on server restart)
const users = [];

// Configure Email Transporter (Using Gmail as an example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- 1. USER REGISTRATION (Non-blocking Email Dispatch) ---
exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { 
      fullName, 
      email, 
      password: hashedPassword, 
      role: 'student', 
      otp: null, 
      otpExpiry: null 
    };
    users.push(newUser);

    // Non-blocking email try/catch block so SMTP issues don't crash registration
    try {
      await transporter.sendMail({
        from: `"Karanja Cyber Academy" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to Karanja Cyber Solutions & Academy',
        html: `
          <div style="font-family: monospace; background: #020617; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #1e293b;">
            <h2 style="color: #06b6d4;">Welcome, ${fullName}!</h2>
            <p>Your account has been successfully created on Karanja Cyber Solutions & Academy.</p>
            <p>You can now log in using your credentials.</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('SMTP Email dispatch failed (Account created anyway):', emailErr.message);
    }

    return res.status(200).json({ success: true, message: 'Registration successful! You can now log in.' });
  } catch (err) {
    console.error('Registration critical error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// --- 2. LOGIN STEP 1 (Verify Password & Dispatch Email OTP) ---
exports.loginStepOne = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // Valid for 10 minutes

    // Dispatch OTP Email
    try {
      await transporter.sendMail({
        from: `"Karanja Cyber Academy Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Login Security OTP Code',
        html: `
          <div style="font-family: monospace; background: #020617; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #1e293b;">
            <h3 style="color: #06b6d4;">Authentication Verification</h3>
            <p>Your 6-digit login OTP code is:</p>
            <div style="font-size: 24px; font-weight: bold; color: #06b6d4; background: #0f172a; padding: 12px; text-align: center; border-radius: 8px; letter-spacing: 4px; margin: 16px 0;">
              ${otp}
            </div>
            <p>This security code will expire in 10 minutes.</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('OTP Email dispatch failed:', emailErr.message);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Check email credentials.' });
    }

    return res.status(200).json({ success: true, message: 'Password verified. 6-digit OTP sent to your email.' });
  } catch (err) {
    console.error('Login Step 1 error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// --- 3. LOGIN STEP 2 (Verify OTP & Initialize Session) ---
exports.verifyOtpAndLogin = (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || user.otp !== otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
    }

    user.otp = null;
    user.otpExpiry = null;

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

// --- 5. GET USER PROFILE ---
exports.getUserProfile = (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized session.' });
  return res.status(200).json({ success: true, user: req.session.user });
};

// --- 6. DELETE ACCOUNT ---
exports.deleteAccount = (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const userEmail = req.session.user.email;
    const index = users.findIndex(u => u.email === userEmail);
    if (index !== -1) users.splice(index, 1);

    req.session.destroy(err => {
      res.clearCookie('connect.sid');
      return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error during deletion.' });
  }
};
