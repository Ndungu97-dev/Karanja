require("dotenv").config();
const express = require("express");
const session = require("express-session");

// Pointing correctly to the backend folder
const authRoutes = require("./backend/routes/authRoutes");
const sql = require("./backend/config/db");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "karanja_academy_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" }
  })
);

// Database Health-Check Route
app.get("/api/health", async (req, res) => {
  try {
    const result = await sql`SELECT NOW()`;
    res.status(200).json({ status: "healthy", db_time: result[0].now });
  } catch (err) {
    console.error("Database health check error:", err);
    res.status(500).json({ status: "unhealthy", error: err.message });
  }
});

// API Routes
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Karanja Cyber Academy server running on port ${PORT}`);
});
