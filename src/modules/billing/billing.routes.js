const express = require("express");
const controller = require("./billing.controller");
const router = express.Router();

router.post("/create-ticket", controller.create);
router.post("/checkout", controller.create);
router.post("/preview", controller.create);
router.post("/confirm", controller.create);
router.post("/cancel", controller.create);
router.get("/", controller.list);
router.post("/", controller.create);
router.post("/bulk", controller.bulk);
router.get("/:id", controller.get);
router.put("/:id", controller.update);
router.patch("/:id/status", controller.status);
router.delete("/:id", controller.remove);
module.exports = router;
