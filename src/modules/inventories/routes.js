const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.get("/", controller.list);
router.get("/summary", controller.summary);
router.get("/low-stock", controller.lowStock);
router.get("/out-of-stock", controller.outOfStock);
router.get("/replenishment-suggestions", controller.replenishmentSuggestions);

router.post("/bulk", controller.bulk);

router.get("/:id", controller.get);

router.patch("/:id/adjust", controller.adjust);
router.patch("/:id/reserve", controller.reserve);
router.patch("/:id/release-reserve", controller.releaseReserve);

module.exports = router;
