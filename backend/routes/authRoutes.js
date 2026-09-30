const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Register a new user
router.post("/register", authController.register);

// Step 1: Validate email/password & trigger OTP
router.post("/login-step1", authController.loginStep1);

// Step 2: Verify OTP and log user in
router.post("/verify-otp", authController.verifyOtp);

// Logout user and destroy session
router.post("/logout", authController.logout);

// Fetch protected user profile/dashboard data
router.get("/dashboard-data", authController.getDashboardData);

module.exports = router;
