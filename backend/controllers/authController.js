const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sql = require("../config/db");

// In-memory OTP store (temporary storage)
const otpStore = new Map();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(email, otp) {
  try {
    // Check if SMTP credentials are configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || "noreply@karanja.local";

    // If no SMTP config, log to console for testing
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.log(`\n🔐 [OTP DEBUG MODE] Email: ${email} | OTP: ${otp}\n`);
      return true;
    }

    // Create transporter with SMTP credentials
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Send email
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: "Your Karanja Verification Code",
      text: `Your Karanja verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nDo not share this code with anyone.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #06b6d4;">Karanja Cyber Academy</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #06b6d4; font-size: 48px; letter-spacing: 10px; text-align: center;">${otp}</h1>
          <p style="color: #666;">This code expires in 5 minutes.</p>
          <p style="color: #999; font-size: 12px;">Do not share this code with anyone.</p>
        </div>
      `,
    });

    console.log(`✉️  OTP sent to: ${email}`);
    return true;
  } catch (err) {
    console.error("Email sending error:", err);
    throw new Error("Failed to send OTP email");
  }
}

// 1. REGISTER USER
exports.register = async (req, res) => {
  try {
    let { full_name, email, password } = req.body;

    // Normalize inputs
    full_name = String(full_name || "").trim();
    email = normalizeEmail(email);
    password = String(password || "").trim();

    // Validate fields
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required. Please fill in your name, email, and password.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE LOWER(email) = ${email}
    `;

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered. Please log in instead.",
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert into database
    const result = await sql`
      INSERT INTO users (full_name, email, password, role)
      VALUES (${full_name}, ${email}, ${hashedPassword}, 'student')
      RETURNING id, full_name, email, role, created_at;
    `;

    const newUser = result[0];

    res.status(201).json({
      success: true,
      message: "Registration successful! Please log in.",
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during registration. Please try again later.",
    });
  }
};

// 2. LOGIN USER - Generate and send OTP
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // Normalize inputs
    email = normalizeEmail(email);
    password = String(password || "").trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find user
    const users = await sql`
      SELECT id, full_name, email, password, role FROM users WHERE LOWER(email) = ${email}
    `;

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate OTP
    const otp = generateOtp();

    // Store OTP with expiration (5 minutes)
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      userId: user.id,
      userEmail: user.email,
      userName: user.full_name,
    });

    // Send OTP email
    try {
      await sendOtpEmail(email, otp);
    } catch (emailErr) {
      console.error("OTP email error:", emailErr);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please check email configuration.",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent to your email. Please check your inbox.",
      requiresOtp: true,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during login. Please try again later.",
    });
  }
};

// 3. VERIFY OTP - Validate OTP and create session
exports.verifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;

    email = normalizeEmail(email);
    otp = String(otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    // Check if OTP exists
    const otpEntry = otpStore.get(email);

    if (!otpEntry) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please log in again.",
      });
    }

    // Check if OTP expired
    if (Date.now() > otpEntry.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please log in again.",
      });
    }

    // Verify OTP matches
    if (String(otpEntry.otp) !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // OTP verified - create session
    req.session.user = {
      id: otpEntry.userId,
      full_name: otpEntry.userName,
      email: otpEntry.userEmail,
      role: "student",
    };

    // Delete OTP from store
    otpStore.delete(email);

    res.status(200).json({
      success: true,
      message: "Authentication successful!",
      redirectUrl: "/dashboard.html",
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during OTP verification.",
    });
  }
};

// 4. LOGOUT USER
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        success: false,
        message: "Could not log out. Please try again.",
      });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  });
};

// 5. GET USER PROFILE (Protected Route)
exports.getProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Please log in.",
      });
    }

    const result = await sql`
      SELECT id, full_name, email, role, created_at FROM users WHERE id = ${req.session.user.id}
    `;

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result[0];

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load profile data",
    });
  }
};

// 6. GET DASHBOARD DATA (Protected Route)
exports.getDashboardData = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Please log in.",
      });
    }

    const result = await sql`
      SELECT id, full_name, email, role, created_at FROM users WHERE id = ${req.session.user.id}
    `;

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result[0];

    res.status(200).json({
      success: true,
      message: "Welcome to your secure dashboard",
      user,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
    });
  }
};
