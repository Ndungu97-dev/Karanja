const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const authController = require("../controllers/authController");

const limiter = (max) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests" },
    skip: (req, res) => process.env.NODE_ENV !== "production",
  });

router.post("/register", limiter(20), authController.register);
router.post("/login-step1", limiter(10), authController.loginStep1);
router.post("/verify-otp", limiter(15), authController.verifyOtp);
router.post("/forgot-password", limiter(5), authController.forgotPassword);
router.post("/reset-password", limiter(10), authController.resetPassword);
router.post("/logout", authController.logout);
router.get("/dashboard-data", authController.getDashboardData);

module.exports = router;
