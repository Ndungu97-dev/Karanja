const express = require("express");
const router = express.Router();
const shopController = require("../controllers/shopController");

router.get("/courses", shopController.getCourses);
router.get("/cart", shopController.getCart);
router.post("/cart/add", shopController.addToCart);
router.delete("/cart/remove/:course_id", shopController.removeFromCart);
router.post("/checkout", shopController.checkout);

module.exports = router;
