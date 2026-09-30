require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./backend/routes/authRoutes");
const sql = require("./backend/config/db");

const app = express();

// CRITICAL FOR RENDER / HTTPS: Tells Express to trust proxy headers so session cookies persist
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "karanja_academy_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // True in production on Render (HTTPS)
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
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

// Fallback to index.html for frontend routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Karanja Cyber Academy server running on port ${PORT}`);
});
