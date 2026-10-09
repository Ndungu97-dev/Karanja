const bcrypt = require("bcryptjs");
const sql = require("../config/db");
const { sendOtpEmail, sendResetEmail } = require("../utils/emailUtils");
const { generateCode, hashCode, codesMatch } = require("../utils/otpUtils");

const OTP_TTL = 10 * 60 * 1000;
const RESET_TTL = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const normalizeEmail = (e) => String(e || "").trim().toLowerCase();
const validPassword = (p) => typeof p === "string" && p.length >= 8;

exports.register = async (req, res) => {
  try {
    const full_name = String(req.body.full_name || "").trim();
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, error: "All fields required" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Invalid email" });
    }
    if (!validPassword(password)) {
      return res.status(400).json({ success: false, error: "Password must be 8+ chars" });
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await sql`
      INSERT INTO users (full_name, email, password, role)
      VALUES (${full_name}, ${email}, ${hashedPassword}, 'student')
      RETURNING id, full_name, email, role
    `;

    res.status(201).json({ success: true, message: "Registration successful", user: newUser });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
};

exports.loginStep1 = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password required" });
    }

    const users = await sql`SELECT id, email, password FROM users WHERE email = ${email}`;
    if (users.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const otp = generateCode();
    await sql`
      UPDATE users
      SET otp_code = ${hashCode(otp)}, otp_expires_at = ${new Date(Date.now() + OTP_TTL)}, otp_attempts = 0
      WHERE id = ${user.id}
    `;

    try {
      await sendOtpEmail(user.email, otp);
      res.status(200).json({ success: true, message: "OTP sent to email" });
    } catch (emailErr) {
      console.error("Email send error:", emailErr.message);
      res.status(500).json({ success: false, error: "Could not send OTP. Check SMTP config." });
    }
  } catch (err) {
    console.error("Login step1 error:", err.message);
    res.status(500).json({ success: false, error: "Login failed" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: "Email and OTP required" });
    }

    const users = await sql`
      SELECT id, full_name, email, role, otp_code, otp_expires_at, otp_attempts
      FROM users WHERE email = ${email}
    `;
    if (users.length === 0) {
      return res.status(400).json({ success: false, error: "User not found" });
    }

    const user = users[0];
    if (!user.otp_code) {
      return res.status(400).json({ success: false, error: "No OTP request found" });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      await sql`UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ${user.id}`;
      return res.status(400).json({ success: false, error: "OTP expired" });
    }

    if (user.otp_attempts >= MAX_ATTEMPTS) {
      await sql`UPDATE users SET otp_code = NULL, otp_attempts = 0 WHERE id = ${user.id}`;
      return res.status(400).json({ success: false, error: "Too many attempts" });
    }

    if (!codesMatch(otp, user.otp_code)) {
      await sql`UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = ${user.id}`;
      return res.status(400).json({ success: false, error: "Invalid OTP" });
    }

    await sql`UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = ${user.id}`;

    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    };

    req.session.save((err) => {
      if (err) {
        console.error("Session error:", err.message);
        return res.status(500).json({ success: false, error: "Session error" });
      }
      res.status(200).json({ success: true, message: "Login successful", redirectUrl: "/dashboard.html" });
    });
  } catch (err) {
    console.error("OTP verify error:", err.message);
    res.status(500).json({ success: false, error: "Verification failed" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ success: false, error: "Email required" });

    const users = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (users.length > 0) {
      const code = generateCode();
      await sql`
        UPDATE users
        SET reset_code_hash = ${hashCode(code)}, reset_expires_at = ${new Date(Date.now() + RESET_TTL)}, reset_attempts = 0
        WHERE id = ${users[0].id}
      `;
      try {
        await sendResetEmail(users[0].email, code);
      } catch (e) {
        console.error("Reset email error:", e.message);
      }
    }
    res.status(200).json({ success: true, message: "If email exists, reset code sent" });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ success: false, error: "Error processing request" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    const { newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, error: "All fields required" });
    }
    if (!validPassword(newPassword)) {
      return res.status(400).json({ success: false, error: "Password must be 8+ chars" });
    }

    const users = await sql`
      SELECT id, reset_code_hash, reset_expires_at, reset_attempts
      FROM users WHERE email = ${email}
    `;
    if (users.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid reset code" });
    }

    const user = users[0];
    if (!user.reset_code_hash) {
      return res.status(400).json({ success: false, error: "Invalid reset code" });
    }

    if (new Date() > new Date(user.reset_expires_at) || user.reset_attempts >= MAX_ATTEMPTS) {
      await sql`UPDATE users SET reset_code_hash = NULL, reset_expires_at = NULL WHERE id = ${user.id}`;
      return res.status(400).json({ success: false, error: "Reset code expired" });
    }

    if (!codesMatch(code, user.reset_code_hash)) {
      await sql`UPDATE users SET reset_attempts = reset_attempts + 1 WHERE id = ${user.id}`;
      return res.status(400).json({ success: false, error: "Invalid reset code" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await sql`
      UPDATE users
      SET password = ${hashed}, reset_code_hash = NULL, reset_expires_at = NULL, otp_code = NULL
      WHERE id = ${user.id}
    `;

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ success: false, error: "Reset failed" });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ success: true, message: "Logged out" });
  });
};

exports.getDashboardData = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const [user] = await sql`
      SELECT id, full_name, email, role, created_at FROM users WHERE id = ${req.session.user.id}
    `;

    if (!user) {
      return req.session.destroy(() => {
        res.status(401).json({ success: false, error: "Session invalid" });
      });
    }

    res.status(200).json({ success: true, message: "Authorized", user });
  } catch (err) {
    console.error("Dashboard error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load data" });
  }
};
