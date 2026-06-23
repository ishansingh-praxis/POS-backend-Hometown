const express = require("express");
const controller = require("./accounting.controller");
const router = express.Router();

router.get("/summary", controller.getSummary);
router.get("/settlement-batches", controller.getSettlementBatches);
router.post("/settlement-batches/post", controller.postSettlementBatch);
router.get("/gstr1-export", controller.exportGstr1);
router.get("/", controller.list);
router.post("/", controller.create);
router.post("/bulk", controller.bulk);
router.get("/:id", controller.get);
router.put("/:id", controller.update);
router.patch("/:id/status", controller.status);
router.delete("/:id", controller.remove);
module.exports = router;
