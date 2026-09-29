
const { neon } = require("@neondatabase/serverless");

// This automatically reads DATABASE_URL from your environment variables (or Render)
const sql = neon(process.env.DATABASE_URL);

module.exports = sql;
