const express = require("express");
const controller = require("./sap.controller");
const router = express.Router();

router.get("/summary", controller.summary);
router.get("/sync-logs", controller.list);
router.post("/sync", controller.queueSync);
router.post("/sync/unsynced-invoices", controller.queueUnsyncedInvoices);
router.post("/retry/:id", controller.retry);
router.patch("/:id/sync-status", controller.markSyncStatus);
router.get("/", controller.list);
router.post("/", controller.create);
router.post("/bulk", controller.bulk);
router.get("/:id", controller.get);
router.put("/:id", controller.update);
router.patch("/:id/status", controller.status);
router.delete("/:id", controller.remove);
module.exports = router;
