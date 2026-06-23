const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.post("/", controller.create);
router.get("/", controller.list);
router.post("/validate", controller.validate);
router.post("/redeem", controller.redeem);

module.exports = router;
