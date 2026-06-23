const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.get("/", controller.getDashboard);
router.get("/summary", controller.getSummary);
router.get("/sessions", controller.getSessions);
router.get("/cashier-performance", controller.getCashierPerformance);
router.patch("/sessions/:sessionId/resolve", controller.resolveException);
router.post("/store-day-close", controller.closeStoreDay);

module.exports = router;
