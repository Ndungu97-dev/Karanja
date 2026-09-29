const bcrypt = require("bcryptjs");
const sql = require("../config/db");

// 1. REGISTER USER
exports.register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert into PostgreSQL users table
    const result = await sql`
      INSERT INTO users (full_name, email, password, role)
      VALUES (${full_name}, ${email}, ${hashedPassword}, 'student')
      RETURNING id, full_name, email, role, created_at;
    `;

    const newUser = result[0];

    res.status(201).json({
      success: true,
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
    res.status(500).json({ success: false, message: "Internal server error during registration" });
  }
};

// 2. LOGIN USER
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    // Find user by email in PostgreSQL
    const users = await sql`
      SELECT id, full_name, email, password, role FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const user = users[0];

    // Verify password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Save user info into the session store
    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };

    res.status(200).json({
      success: true,
      message: "Login successful!",
      redirectUrl: "/dashboard.html"
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Internal server error during login" });
  }
};

// 3. VERIFY OTP (Placeholder - currently just returns success)
exports.verifyOtp = (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    // TODO: Implement actual OTP verification logic
    // For now, accept any 6-digit OTP for testing purposes
    if (otp.length === 6) {
      res.status(200).json({
        success: true,
        message: "OTP verified successfully!"
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP format" });
    }
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ success: false, message: "Internal server error during OTP verification" });
  }
};

// 4. LOGOUT USER
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ success: false, message: "Could not log out, please try again" });
    }
    res.clearCookie("connect.sid"); // Clear express-session cookie
    res.status(200).json({ success: true, message: "Logged out successfully" });
  });
};

// 5. GET USER PROFILE (Protected Route)
exports.getProfile = async (req, res) => {
  try {
    // req.session.user comes from active session storage
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    // Optional: Fetch fresh user details from PostgreSQL if needed
    const result = await sql`
      SELECT id, full_name, email, role, created_at FROM users WHERE id = ${req.session.user.id}
    `;

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = result[0];

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ success: false, message: "Failed to load profile data" });
  }
};

// 6. GET DASHBOARD DATA (Protected Route - keeping for backward compatibility)
exports.getDashboardData = async (req, res) => {
  try {
    // req.session.user comes from active session storage
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    // Optional: Fetch fresh user details from PostgreSQL if needed
    const result = await sql`
      SELECT id, full_name, email, role, created_at FROM users WHERE id = ${req.session.user.id}
    `;

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = result[0];

    res.status(200).json({
      success: true,
      message: "Welcome to your secure dashboard",
      user
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ success: false, message: "Failed to load dashboard data" });
  }
};
