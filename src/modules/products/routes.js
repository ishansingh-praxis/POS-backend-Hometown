const express = require("express");
const controller = require("./controller");
const legacyController = require("./products.controller");

const router = express.Router();

// New SAP ATP-aware endpoints
router.get("/", controller.list);
router.get("/image-summary", controller.imageSummary);
router.post("/bulk", controller.bulk);

// Legacy endpoints, preserved so existing CRUD/detail behavior keeps working
router.post("/", legacyController.create);
router.get("/detail/:sku", legacyController.detailBySku);
router.put("/:id", legacyController.update);
router.patch("/:id/status", legacyController.status);
router.delete("/:id", legacyController.remove);

router.get("/:id", controller.get);

module.exports = router;
