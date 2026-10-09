const { neon } = require("@neondatabase/serverless");

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error(
    "❌ DATABASE_URL not set. Set it in Render Environment settings."
  );
  process.exit(1);
}

// Initialize neon database connection
// This automatically reads DATABASE_URL from environment variables
const sql = neon(process.env.DATABASE_URL);

// Test connection on startup
(async () => {
  try {
    const result = await sql`SELECT NOW()`;
    console.log("✅ Database connection successful");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("   Ensure DATABASE_URL is correct in Render environment");
    process.exit(1);
  }
})();

module.exports = sql;
