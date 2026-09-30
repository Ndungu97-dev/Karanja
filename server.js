require("dotenv").config();
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const path = require("path");

const authRoutes = require("./backend/routes/authRoutes");
const shopRoutes = require("./backend/routes/shopRoutes");
const sql = require("./backend/config/db");

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not set");
}
if (!process.env.OTP_SECRET) {
  throw new Error("OTP_SECRET is not set");
}

const app = express();
const isProd = process.env.NODE_ENV === "production";

// Render sits behind a proxy; needed so secure cookies work
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend files (before sessions so they don't trigger DB lookups)
app.use(express.static(path.join(__dirname, "public")));

// Single session configuration, stored in Postgres
app.use(
  session({
    store: new pgSession({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isProd ? { rejectUnauthorized: false } : false,
      }),
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// Database health check
app.get("/api/health", async (req, res) => {
  try {
    const result = await sql`SELECT NOW()`;
    res.status(200).json({ status: "healthy", db_time: result[0].now });
  } catch (err) {
    console.error("Database health check error:", err);
    res.status(500).json({ status: "unhealthy", error: "Database unavailable" });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/shop", shopRoutes);

// Protect dashboard page
app.get("/dashboard.html", (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/login.html");
  }
  next();
});

// Fallback to index.html (works on Express 4 and 5)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Karanja Cyber Academy server running on port ${PORT}`);
});
