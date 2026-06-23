const express = require("express");
const controller = require("./payments.controller");

const router = express.Router();

router.get("/", controller.list);
router.get("/summary", controller.summary);
router.get("/:id", controller.get);

router.post("/", controller.create);
router.post("/bulk", controller.bulk);

router.put("/:id", controller.update);
router.patch("/:id", controller.update);
router.patch("/:id/status", controller.status);
router.patch("/:id/refund", controller.refund);

router.delete("/:id", controller.remove);

module.exports = router;
