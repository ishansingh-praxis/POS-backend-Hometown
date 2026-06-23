const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:holdId", controller.get);
router.post("/:holdId/recall", controller.recall);
router.patch("/:holdId/void", controller.voidHeld);

module.exports = router;
