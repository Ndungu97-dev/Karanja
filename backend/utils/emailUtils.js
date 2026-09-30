const nodemailer = require("nodemailer");

// Strictly use environment variables set on Render
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Connection Verification Failed:", error);
  } else {
    console.log("✅ SMTP Server connected successfully!");
  }
});

exports.sendOtpEmail = async (toEmail, otp) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("❌ CRITICAL: SMTP environment variables are not defined!");
    throw new Error("Missing SMTP credentials");
  }

  const mailOptions = {
    // Uses strictly the SMTP_USER environment variable as the sender address
    from: process.env.SMTP_USER,
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
    console.log("📧 OTP Email successfully sent to:", toEmail, info.response);
    return info;
  } catch (err) {
    console.error("❌ Error during transporter.sendMail:", err);
    throw err;
  }
};
