const bcrypt = require("bcryptjs");
const sql = require("../config/db");
// const { sendOtpEmail } = require("../utils/emailUtils"); // Import your email sender

// STEP 1: VALIDATE PASSWORD & GENERATE/SEND OTP
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

    // Generate 6-digit OTP and set expiration (e.g., 10 minutes from now)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP to database for this user
    await sql`
      UPDATE users 
      SET otp_code = ${otp}, otp_expires_at = ${expiresAt} 
      WHERE id = ${user.id}
    `;

    // TODO: Send OTP via email
    // await sendOtpEmail(email, otp);
    console.log(`[DEV OTP] Generated for ${email}: ${otp}`); // Remove in strict production

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Login Step 1 error:", err);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
};

// STEP 2: VERIFY OTP AND ESTABLISH SESSION
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

    // Check if OTP matches and hasn't expired
    if (!user.otp_code || user.otp_code !== otp.trim()) {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: "OTP code has expired. Please log in again." });
    }

    // Clear OTP from DB so it cannot be reused
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
