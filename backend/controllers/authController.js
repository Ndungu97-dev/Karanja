const bcrypt = require("bcryptjs");
const sql = require("../config/db");
const { sendOtpEmail } = require("../utils/emailUtils");

// 1. REGISTER USER
exports.register = async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userRole = role === "admin" ? "admin" : "student";

    const [newUser] = await sql`
      INSERT INTO users (full_name, email, password, role)
      VALUES (${full_name}, ${email}, ${hashedPassword}, ${userRole})
      RETURNING id, full_name, email, role, created_at;
    `;

    res.status(201).json({
      message: "Registration successful!",
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error during registration" });
  }
};

// 2. LOGIN STEP 1: VALIDATE PASSWORD & SEND REAL EMAIL OTP
exports.loginStep1 = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const users = await sql`SELECT id, full_name, email, password, role FROM users WHERE email = ${email}`;
    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate random 6-digit OTP code & 10-minute expiration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP to database
    await sql`
      UPDATE users 
      SET otp_code = ${otp}, otp_expires_at = ${expiresAt} 
      WHERE id = ${user.id}
    `;

    // 🚀 Dispatch real email using Render environment variables
    await sendOtpEmail(email, otp);

    res.status(200).json({ message: "OTP sent successfully to your email." });
  } catch (err) {
    console.error("Login Step 1 email dispatch error:", err);
    res.status(500).json({ error: "Failed to send OTP email. Please check your server environment variables." });
  }
};

// 3. LOGIN STEP 2: VERIFY OTP AND ESTABLISH SESSION
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP code are required" });
    }

    const users = await sql`
      SELECT id, full_name, email, role, otp_code, otp_expires_at 
      FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = users[0];

    if (!user.otp_code || user.otp_code !== otp.trim()) {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: "OTP code has expired. Please log in again." });
    }

    // Clear OTP so it can't be reused
    await sql`
      UPDATE users 
      SET otp_code = NULL, otp_expires_at = NULL 
      WHERE id = ${user.id}
    `;

    // Establish secure session
    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };

    res.status(200).json({
      message: "Authentication successful!",
      redirectUrl: "/dashboard.html"
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Internal server error during OTP verification" });
  }
};

// 4. LOGOUT USER
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Could not log out, please try again" });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logged out successfully" });
  });
};

// 5. GET PROTECTED DASHBOARD DATA
exports.getDashboardData = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Unauthorized access. Please log in." });
    }

    const [user] = await sql`
      SELECT id, full_name, email, role, created_at FROM users WHERE id = ${req.session.user.id}
    `;

    if (!user) {
      return res.session.destroy(() => {
        res.status(401).json({ error: "User session invalid or expired." });
      });
    }

    res.status(200).json({
      message: "Authorized",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error("Dashboard authorization error:", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
};
