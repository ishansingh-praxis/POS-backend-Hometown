const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.post("/issue", controller.issue);
router.get("/", controller.list);
router.get("/customer/:phone", controller.byCustomer);
router.post("/send-otp", controller.sendOtp);
router.post("/verify-otp", controller.verifyOtp);
router.post("/redeem", controller.redeem);
router.get("/:creditNoteId", controller.get);

module.exports = router;
