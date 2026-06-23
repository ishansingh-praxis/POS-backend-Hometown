const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.get("/", controller.getDashboard);
router.get("/overview", controller.getOverview);
router.get("/store-performance", controller.getStorePerformance);

module.exports = router;
