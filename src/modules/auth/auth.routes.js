const express = require("express");
const controller = require("./auth.controller");
const { protect } = require("../../middleware/authMiddleware");
const router = express.Router();

router.post("/login", controller.login);
router.get("/me", protect, controller.me);

router.get("/logins", protect, controller.getAllLogins);
router.get("/logins/role/:role", protect, controller.getLoginsByRole);

module.exports = router;
