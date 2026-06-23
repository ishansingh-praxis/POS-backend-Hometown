const express = require("express");
const controller = require("./controller");
const legacyController = require("./categories.controller");

const router = express.Router();

// New SAP ATP LOB/Merc. Category hierarchy endpoints
router.get("/", controller.list);
router.post("/generate-from-inventory", controller.generate);
router.patch("/:id", controller.update);

// Legacy endpoints, preserved so existing CRUD behavior keeps working
router.post("/", legacyController.create);
router.post("/bulk", legacyController.bulk);
router.put("/:id", legacyController.update);
router.patch("/:id/status", legacyController.status);
router.delete("/:id", legacyController.remove);

router.get("/:id", controller.get);

module.exports = router;
