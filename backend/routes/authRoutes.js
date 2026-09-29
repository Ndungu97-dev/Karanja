const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Public endpoints
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// Protected endpoint
router.get("/dashboard-data", authController.getDashboardData);

module.exports = router;
