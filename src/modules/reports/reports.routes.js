const express = require("express");
const controller = require("./reports.controller");
const router = express.Router();

router.get("/sales/daily", controller.list);
router.get("/sales/monthly", controller.list);
router.get("/sales/store-wise", controller.list);
router.get("/payments", controller.list);
router.get("/inventory", controller.list);
router.get("/gst", controller.list);
router.get("/online-vs-offline", controller.list);
router.get("/", controller.list);
router.post("/", controller.create);
router.post("/bulk", controller.bulk);
router.get("/:id", controller.get);
router.put("/:id", controller.update);
router.patch("/:id/status", controller.status);
router.delete("/:id", controller.remove);
module.exports = router;
