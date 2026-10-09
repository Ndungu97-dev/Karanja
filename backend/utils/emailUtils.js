const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 5000,
  socketTimeout: 5000,
});

// Test connection
transporter.verify((err, success) => {
  if (err) {
    console.error("SMTP Error:", err.code);
  } else {
    console.log("SMTP Ready");
  }
});

const template = (title, intro, code, note) => `
  <div style="font-family:Arial,sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
    <h2 style="text-align:center;color:#0891b2;margin-top:0">${title}</h2>
    <p style="text-align:center;color:#475569">${intro}</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;background:#f1f5f9;padding:16px;border-radius:8px">${code}</div>
    <p style="font-size:12px;color:#64748b;text-align:center">${note}</p>
  </div>`;

async function send(to, subject, html, text) {
  try {
    const info = await transporter.sendMail({
      from: `"Karanja" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email error:", error.code, error.message);
    throw error;
  }
}

exports.sendOtpEmail = (to, otp) =>
  send(
    to,
    "Your login verification code",
    template("Security Verification", "Use this code to complete your login:", otp,
      "Valid for 10 minutes. Never share this code."),
    `Login code: ${otp}`
  );

exports.sendResetEmail = (to, code) =>
  send(
    to,
    "Password reset code",
    template("Reset Your Password", "Use this code to reset your password:", code,
      "Valid for 15 minutes. If you didn't request this, ignore this email."),
    `Reset code: ${code}`
  );
