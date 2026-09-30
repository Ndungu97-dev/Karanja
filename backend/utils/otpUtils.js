const crypto = require("crypto");

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashCode(code) {
  return crypto
    .createHmac("sha256", process.env.OTP_SECRET)
    .update(String(code))
    .digest("hex");
}

function codesMatch(plain, storedHash) {
  if (!storedHash) return false;
  const a = Buffer.from(hashCode(plain));
  const b = Buffer.from(storedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { generateCode, hashCode, codesMatch };
