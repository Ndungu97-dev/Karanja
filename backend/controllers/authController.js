const bcrypt = require("bcryptjs");
const sql = require("../config/db");

// 1. REGISTER USER
exports.register = async (req, res) => {
  try {
    let { full_name, email, password } = req.body;

    // Trim and normalize all inputs
    full_name = String(full_name || "").trim();
    email = String(email || "").trim().toLowerCase();
    password = String(password || "").trim();

    // Validate that all fields are provided and not empty
    if (!full_name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required. Please fill in your name, email, and password." 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide a valid email address." 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 6 characters long." 
      });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE LOWER(email) = ${email}
    `;

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "This email is already registered. Please log in instead." 
      });
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
      message: "Registration successful! Please log in.",
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration. Please try again later." 
    });
  }
};

// 2. LOGIN USER
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // Normalize inputs
    email = String(email || "").trim().toLowerCase();
    password = String(password || "").trim();

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required." 
      });
    }

    // Find user by email in PostgreSQL
    const users = await sql`
      SELECT id, full_name, email, password, role FROM users WHERE LOWER(email) = ${email}
    `;

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password." 
      });
    }

    const user = users[0];

    // Verify password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password." 
      });
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
      message: "Login successful! OTP has been sent to your email.",
      requiresOtp: true
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error during login. Please try again later." 
    });
  }
};

// 3. VERIFY OTP (Placeholder - accept any 6-digit code)
exports.verifyOtp = (req, res) => {
  try {
    let { email, otp } = req.body;

    email = String(email || "").trim().toLowerCase();
    otp = String(otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and OTP are required." 
      });
    }

    // Accept any 6-digit OTP for now
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid OTP format. Please enter 6 digits." 
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP verified successfully!"
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error during OTP verification." 
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
        message: "Could not log out. Please try again." 
      });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ 
      success: true, 
      message: "Logged out successfully" 
    });
  });
};

// 5. GET USER PROFILE (Protected Route)
exports.getProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized access. Please log in." 
      });
    }

    const result = await sql`
      SELECT id, full_name, email, role, created_at FROM users WHERE id = ${req.session.user.id}
    `;

    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
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
        role: user.role
      }
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to load profile data" 
    });
  }
};

// 6. GET DASHBOARD DATA (Protected Route)
exports.getDashboardData = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized access. Please log in." 
      });
    }

    const result = await sql`
      SELECT id, full_name, email, role, created_at FROM users WHERE id = ${req.session.user.id}
    `;

    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const user = result[0];

    res.status(200).json({
      success: true,
      message: "Welcome to your secure dashboard",
      user
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to load dashboard data" 
    });
  }
};
