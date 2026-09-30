const bcrypt = require("bcryptjs");
const sql = require("../config/db");
const { sendOtpEmail, sendResetEmail } = require("../utils/emailUtils");
const { generateCode, hashCode, codesMatch } = require("../utils/otpUtils");

const OTP_TTL = 10 * 60 * 1000;
const RESET_TTL = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const normalizeEmail = (e) => String(e || "").trim().toLowerCase();
const validPassword = (p) => typeof p === "string" && p.length >= 8;

// 1. REGISTER
exports.register = async (req, res) => {
  try {
    const full_name = String(req.body.full_name || "").trim();
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
    if (!validPassword(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // SECURITY: everyone registers as student. Promote admins manually in the DB.
    const [newUser] = await sql`
      INSERT INTO users (full_name, email, password, role)
      VALUES (${full_name}, ${email}, ${hashedPassword}, 'student')
      RETURNING id, full_name, email, role;
    `;

    res.status(201).json({ message: "Registration successful!", user: newUser });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error during registration" });
  }
};

// 2. LOGIN STEP 1: check password, then send OTP
exports.loginStep1 = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const users = await sql`SELECT id, email, password FROM users WHERE email = ${email}`;
    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const otp = generateCode();
    await sql`
      UPDATE users
      SET otp_code = ${hashCode(otp)},
          otp_expires_at = ${new Date(Date.now() + OTP_TTL)},
          otp_attempts = 0
      WHERE id = ${user.id}
    `;

    // Wait for the email so we never claim success when it failed
    try {
      await sendOtpEmail(user.email, otp);
    } catch (emailErr) {
      console.error("OTP email failed:", emailErr.code, emailErr.message);
      return res.status(500).json({
        error: "We couldn't send the verification email. Please try again shortly.",
      });
    }

    res.status(200).json({ message: "OTP sent successfully to your email." });
  } catch (err) {
    console.error("Login Step 1 error:", err);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
};

// 3. LOGIN STEP 2: verify OTP, create session
exports.verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP code are required" });
    }

    const users = await sql`
      SELECT id, full_name, email, role, otp_code, otp_expires_at, otp_attempts
      FROM users WHERE email = ${email}
    `;
    const user = users[0];

    if (!user || !user.otp_code) {
      return res.status(400).json({ error: "Invalid or expired OTP. Please log in again." });
    }

    if (new Date() > new Date(user.otp_expires_at) || user.otp_attempts >= MAX_ATTEMPTS) {
      await sql`UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = ${user.id}`;
      return res.status(400).json({ error: "OTP expired or too many attempts. Please log in again." });
    }

    if (!codesMatch(otp, user.otp_code)) {
      await sql`UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = ${user.id}`;
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    await sql`UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = ${user.id}`;

    // New session ID on login prevents session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate error:", err);
        return res.status(500).json({ error: "Could not create session" });
      }
      req.session.user = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      };
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return res.status(500).json({ error: "Could not save session" });
        }
        res.status(200).json({
          message: "Authentication successful!",
          redirectUrl: "/dashboard.html",
        });
      });
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Internal server error during OTP verification" });
  }
};

// 4. FORGOT PASSWORD: send reset code (same response whether or not the email exists)
exports.forgotPassword = async (req, res) => {
  const generic = { message: "If that email is registered, a reset code has been sent." };
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ error: "Email is required" });

    const users = await sql`SELECT id, email FROM users WHERE email = ${email}`;
    if (users.length > 0) {
      const code = generateCode();
      await sql`
        UPDATE users
        SET reset_code_hash = ${hashCode(code)},
            reset_expires_at = ${new Date(Date.now() + RESET_TTL)},
            reset_attempts = 0
        WHERE id = ${users[0].id}
      `;
      try {
        await sendResetEmail(users[0].email, code);
      } catch (emailErr) {
        console.error("Reset email failed:", emailErr.code, emailErr.message);
      }
    }
    res.status(200).json(generic);
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};

// 5. RESET PASSWORD: verify code and set new password
exports.resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    const { newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Email, code and new password are required" });
    }
    if (!validPassword(newPassword)) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const users = await sql`
      SELECT id, reset_code_hash, reset_expires_at, reset_attempts
      FROM users WHERE email = ${email}
    `;
    const user = users[0];
    const invalid = { error: "Invalid or expired reset code" };

    if (!user || !user.reset_code_hash) return res.status(400).json(invalid);

    if (new Date() > new Date(user.reset_expires_at) || user.reset_attempts >= MAX_ATTEMPTS) {
      await sql`UPDATE users SET reset_code_hash = NULL, reset_expires_at = NULL, reset_attempts = 0 WHERE id = ${user.id}`;
      return res.status(400).json(invalid);
    }

    if (!codesMatch(code, user.reset_code_hash)) {
      await sql`UPDATE users SET reset_attempts = reset_attempts + 1 WHERE id = ${user.id}`;
      return res.status(400).json(invalid);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await sql`
      UPDATE users
      SET password = ${hashed},
          reset_code_hash = NULL, reset_expires_at = NULL, reset_attempts = 0,
          otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0
      WHERE id = ${user.id}
    `;

    res.status(200).json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Could not reset password" });
  }
};

// 6. LOGOUT
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

// 7. DASHBOARD DATA
exports.getDashboardData = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Unauthorized access. Please log in." });
    }

    const [user] = await sql`
      SELECT id, full_name, email, role, created_at FROM users WHERE id = ${req.session.user.id}
    `;

    if (!user) {
      return req.session.destroy(() => {
        res.status(401).json({ error: "User session invalid or expired." });
      });
    }

    res.status(200).json({ message: "Authorized", user });
  } catch (err) {
    console.error("Dashboard authorization error:", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
};
