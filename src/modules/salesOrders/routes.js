const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:salesOrderId", controller.get);
router.patch("/:salesOrderId/status", controller.updateStatus);
router.post("/:salesOrderId/payment", controller.addPayment);
router.post("/:salesOrderId/delivery-schedule", controller.setDeliverySchedule);

module.exports = router;
