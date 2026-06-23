const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.get("/", controller.list);
router.post("/bulk", controller.bulk);
router.get("/:id", controller.get);

module.exports = router;
