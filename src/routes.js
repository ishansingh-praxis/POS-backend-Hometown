const express = require("express");
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/user.routes");
const managerRoutes = require("./modules/managers/manager.routes");
const cashierRoutes = require("./modules/cashiers/cashier.routes");
const storeRoutes = require("./modules/stores/store.routes");
const { protect } = require("./middleware/authMiddleware");

const router = express.Router();

router.get("/health", (req, res) => res.json({ success: true, message: "HomeTown POS login backend running" }));

router.use("/auth", authRoutes);
router.use("/users", protect, userRoutes);
router.use("/managers", protect, managerRoutes);
router.use("/cashiers", protect, cashierRoutes);
router.use("/stores", protect, storeRoutes);

module.exports = router;
