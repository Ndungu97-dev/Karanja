const sql = require("../config/db");
const bcrypt = require("bcryptjs");

// Register User
exports.register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    // Validate fields
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "Please fill in all required fields." });
    }

    // Check if user already exists
    const existingUser = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user into PostgreSQL and return public user details
    const newUsers = await sql`
      INSERT INTO users (full_name, email, password)
      VALUES (${full_name}, ${email}, ${hashedPassword})
      RETURNING id, full_name, email, role, created_at;
    `;

    res.status(201).json({
      message: "User registered successfully",
      user: newUsers[0]
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please provide email and password." });
    }

    // Find user by email
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (users.length === 0) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const user = users[0];

    // Check password validity
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Save user session
    req.session.userId = user.id;
    req.session.role = user.role;

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
};
