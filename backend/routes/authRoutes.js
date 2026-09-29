const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Public endpoints
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-otp", authController.verifyOtp);
router.post("/logout", authController.logout);

// Protected endpoints
router.get("/profile", authController.getProfile);
router.get("/dashboard-data", authController.getDashboardData);

module.exports = router;
