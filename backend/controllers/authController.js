const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// In-memory user store (or swap this out for your database connection later)
const users = [];

// Configure Outlook SMTP Transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    ciphers: 'SSLv3'
  }
});

// --- 1. USER REGISTRATION ---
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

    // Dispatch Welcome Email
    await transporter.sendMail({
      from: `"Karanja Cyber Academy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Karanja Cyber Solutions & Academy',
      html: `
        <div style="font-family: monospace; background: #020617; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #1e293b;">
          <h2 style="color: #06b6d4;">Welcome, ${fullName}!</h2>
          <p>Your account has been successfully created on Karanja Cyber Solutions & Academy.</p>
          <p>You can now log in, explore our cloud infrastructure modules, and access simulation labs.</p>
          <hr style="border-color: #1e293b; margin: 20px 0;">
          <p style="font-size: 11px; color: #64748b;">Secure Cloud & Cyber Operations Platform • 2026</p>
        </div>
      `
    });

    return res.status(200).json({ success: true, message: 'Registration successful! Welcome email sent.' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// --- 2. LOGIN STEP 1 (Verify Password & Dispatch OTP Email) ---
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
          <hr style="border-color: #1e293b; margin: 20px 0;">
          <p style="font-size: 11px; color: #64748b;">If you did not request this login, please secure your account immediately.</p>
        </div>
      `
    });

    return res.status(200).json({ success: true, message: 'Password verified. 6-digit OTP sent to your email.' });
  } catch (err) {
    console.error('Login Step 1 error:', err);
    return res.status(500).json({ success: false, message: 'Failed to dispatch OTP email. Check SMTP settings.' });
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

    // Clear OTP state after successful validation
    user.otp = null;
    user.otpExpiry = null;

    // Establish secure session
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
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  });
};

// --- 5. GET USER PROFILE (Session Check) ---
exports.getUserProfile = (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized session.' });
  }
  return res.status(200).json({ success: true, user: req.session.user });
};

// --- 6. EMAIL VERIFICATION STUB ---
exports.verifyEmail = (req, res) => {
  return res.status(200).json({ success: true, message: 'Email verification route active.' });
};
