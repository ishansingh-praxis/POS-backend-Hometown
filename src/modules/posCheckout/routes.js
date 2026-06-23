const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.post("/calculate", controller.calculateCart);
router.post("/upi-qr", controller.createUpiQr);
router.post("/checkout", controller.createPosSale);

module.exports = router;
