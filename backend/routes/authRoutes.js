const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login-step1", authController.loginStep1);
router.post("/verify-otp", authController.verifyOtp);
router.post("/logout", authController.logout);
router.get("/dashboard-data", authController.getDashboardData);

module.exports = router;
