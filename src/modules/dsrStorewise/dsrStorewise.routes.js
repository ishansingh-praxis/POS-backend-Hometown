const express = require("express");
const controller = require("./dsrStorewise.controller");

const router = express.Router();

router.get("/", controller.list);
router.get("/summary", controller.summary);
router.get("/channel-summary", controller.channelSummary);
router.get("/top-stores", controller.topStores);
router.get("/store/:storeCode", controller.getByStore);
router.get("/store/:storeCode/breakups", controller.storeBreakups);

module.exports = router;
