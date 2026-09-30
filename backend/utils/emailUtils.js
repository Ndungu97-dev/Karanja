const nodemailer = require("nodemailer");

// Resolve environment variables securely
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for 587
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

// Verify connection on startup to log any credential misconfigurations immediately
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Connection Error:", error);
  } else {
    console.log("✅ SMTP Server connected successfully using user:", smtpUser);
  }
});

exports.sendOtpEmail = async (toEmail, otp) => {
  const mailOptions = {
    // Ensures sender is 100% identical to the authenticated SMTP user
    from: `"Karanja Cyber Academy" <${smtpUser}>`,
    to: toEmail,
    subject: "Your Login Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #090d16; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 400px; margin: auto;">
        <h2 style="color: #06b6d4; margin-top: 0; text-align: center;">Security Verification</h2>
        <p style="text-align: center; color: #94a3b8;">Use the verification code below to complete your login:</p>
        <div style="background-color: #111827; border: 1px solid #1f2937; padding: 16px; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #38bdf8; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #64748b; text-align: center;">This code is valid for 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📧 OTP Email successfully dispatched to:", toEmail, info.response);
    return info;
  } catch (err) {
    console.error("❌ Error sending OTP email:", err);
    throw err;
  }
};
