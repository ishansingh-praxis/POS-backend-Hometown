const express = require("express");
const controller = require("./dsrSalesFact.controller");

const router = express.Router();

router.get("/facts", controller.list);
router.get("/summary", controller.summary);
router.get("/store-summary", controller.storeSummary);
router.get("/article-summary", controller.articleSummary);
router.get("/category-summary", controller.categorySummary);
router.get("/customer-summary", controller.customerSummary);
router.get("/replenishment-signal", controller.replenishmentSignal);
router.get("/online-orders", controller.onlineOrders);

module.exports = router;
