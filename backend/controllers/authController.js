const bcrypt = require("bcryptjs");
const sql = require("../config/db");

// 1. REGISTER USER
exports.register = async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if email already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Default to 'student' role unless explicitly specified (e.g. admin creation)
    const userRole = role === "admin" ? "admin" : "student";

    // Insert user into Neon PostgreSQL
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

// 2. LOGIN USER (Optimized for instant click-response)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Fetch user from database
    const users = await sql`
      SELECT id, full_name, email, password, role FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Save session payload immediately
    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };

    res.status(200).json({
      message: "Login successful!",
      redirectUrl: "/dashboard.html"
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
};

// 3. LOGOUT USER
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

// 4. GET PROTECTED DASHBOARD DATA (Strict Access Control)
exports.getDashboardData = async (req, res) => {
  try {
    // Check if session exists and contains user payload
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Unauthorized access. Please log in." });
    }

    // Fetch fresh user data from PostgreSQL database to ensure account wasn't deleted or role changed
    const [user] = await sql`
      SELECT id, full_name, email, role, created_at FROM users WHERE id = ${req.session.user.id}
    `;

    if (!user) {
      // Destroy stale session if user no longer exists in DB
      return req.session.destroy(() => {
        res.status(401).json({ error: "User session invalid or expired." });
      });
    }

    // Double-check role permissions if needed (e.g. restricting certain paths)
    // Here we authorize standard access for valid students/admins
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
