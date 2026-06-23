const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.get("/", controller.getCouponCodes);
router.get("/summary", controller.getSummary);
router.get("/campaigns", controller.getCampaigns);

router.get("/analytics/advanced", controller.getAdvancedAnalytics);
router.get("/analytics/store-wise", controller.getStoreWiseCouponUsage);
router.get("/analytics/campaign-performance", controller.getCampaignPerformance);
router.get("/analytics/failed-attempts", controller.getFailedAttemptAnalytics);
router.get("/analytics/burn-rate", controller.getCouponBurnRate);
router.get("/analytics/alerts", controller.getCouponInsightAlerts);

router.get("/code/:offerCode", controller.getCouponByCode);

router.post("/validate", controller.validateCoupon);

router.patch("/:offerCode/mark-availed", controller.markAvailed);
router.patch("/:offerCode/release", controller.releaseCoupon);

module.exports = router;
