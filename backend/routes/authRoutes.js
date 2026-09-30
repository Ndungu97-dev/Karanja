const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Check that these exact functions exist in authController.js:
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/dashboard-data", authController.getDashboardData);
router.post("/login-step1", authController.loginStep1);
router.post("/verify-otp", authController.verifyOtp);

module.exports = router;
