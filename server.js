require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./backend/routes/authRoutes");
const shopRoutes = require("./backend/routes/shopRoutes");
const sql = require("./backend/config/db");

const app = express();

// CRITICAL FOR RENDER / HTTPS: Trust proxy so session cookies don't drop
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Session configuration (Fixed timeout / persistence)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "karanja_academy_secure_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true on Render (HTTPS)
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 // 24 hours session lifetime
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
app.use("/api/shop", shopRoutes);

// Protected Page Route Middleware (Ensures users can't bypass login to view dashboard.html directly)
app.get("/dashboard.html", (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/login.html");
  }
  next();
});

// Fallback to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Karanja Cyber Academy server running on port ${PORT}`);
});
