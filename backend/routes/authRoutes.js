const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Check that these exact functions exist in authController.js:
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/dashboard-data", authController.getDashboardData);

module.exports = router;
