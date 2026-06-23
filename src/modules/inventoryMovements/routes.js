const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.get("/", controller.list);
router.get("/summary", controller.summary);

router.post("/", controller.create);
router.post("/bulk", controller.bulk);

module.exports = router;
