const bcrypt = require("bcryptjs");
const sql = require("../config/db");

// 1. REGISTER USER
exports.register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email is already registered" });
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

// 2. LOGIN USER
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email in PostgreSQL
    const users = await sql`
      SELECT id, full_name, email, password, role FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];

    // Verify password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Save user info into the session store
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
    res.clearCookie("connect.sid"); // Clear express-session cookie
    res.status(200).json({ message: "Logged out successfully" });
  });
};

// 4. GET DASHBOARD DATA (Protected Route)
exports.getDashboardData = async (req, res) => {
  try {
    // req.session.user comes from active session storage
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    // Optional: Fetch fresh user details from PostgreSQL if needed
    const [user] = await sql`
      SELECT id, full_name, email, role, created_at FROM users WHERE id = ${req.session.user.id}
    `;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "Welcome to your secure dashboard",
      user
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
};
