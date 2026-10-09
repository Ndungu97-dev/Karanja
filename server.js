require("dotenv").config();
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const path = require("path");

const authRoutes = require("./backend/routes/authRoutes");
const shopRoutes = require("./backend/routes/shopRoutes");
const sql = require("./backend/config/db");

const app = express();
const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.get("/api/health", async (req, res) => {
  try {
    const result = await sql`SELECT NOW()`;
    res.status(200).json({ status: "healthy", db_time: result[0].now });
  } catch (err) {
    res.status(500).json({ status: "unhealthy", error: "Database unavailable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/shop", shopRoutes);

app.get("/dashboard.html", (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/login.html");
  }
  next();
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Karanja server running on port ${PORT}`);
});
