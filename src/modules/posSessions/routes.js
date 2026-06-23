const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.get("/", controller.list);
router.get("/current", controller.current);
router.get("/store-day-status", controller.storeDayStatus);
router.post("/store-day-close", controller.closeStoreDay);
router.post("/start", controller.start);
router.post("/close", controller.closeCurrent);
router.patch("/:sessionId/close", controller.close);
router.patch("/:sessionId/resolve-exception", controller.resolveException);
router.get("/:sessionId", controller.get);

module.exports = router;
