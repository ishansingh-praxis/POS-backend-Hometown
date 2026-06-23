const express = require("express");
const controller = require("./dashboard.controller");
const { protect } = require("../../middleware/authMiddleware");
const router = express.Router();

router.get("/me", protect, controller.getMyDashboard);

router.get("/admin", controller.list);
router.get("/store/:storeCode", controller.list);
router.get("/admin/sales-summary", controller.list);
router.get("/admin/payment-summary", controller.list);
router.get("/admin/online-vs-offline", controller.list);
router.get("/", controller.list);
router.post("/", controller.create);
router.post("/bulk", controller.bulk);
router.get("/:id", controller.get);
router.put("/:id", controller.update);
router.patch("/:id/status", controller.status);
router.delete("/:id", controller.remove);
module.exports = router;
