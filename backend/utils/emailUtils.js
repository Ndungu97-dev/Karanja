const nodemailer = require("nodemailer");

// Reads your Render environment variables automatically
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587),
  secure: false, // true for 465, false for other ports (587)
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
  },
});

exports.sendOtpEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@karanjacaps.com",
    to: toEmail,
    subject: "Your Login OTP Code - Karanja Cyber Solutions",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #090d16; color: #f8fafc; padding: 24px; border-radius: 12px;">
        <h2 style="color: #06b6d4; margin-top: 0;">Security Verification</h2>
        <p>You requested to log in to your portal. Use the verification code below:</p>
        <div style="background-color: #111827; border: 1px solid #1f2937; padding: 16px; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; color: #38bdf8; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #94a3b8;">This code is valid for 10 minutes. If you did not request this, please secure your account.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
