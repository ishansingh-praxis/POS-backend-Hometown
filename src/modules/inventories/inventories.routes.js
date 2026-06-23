const express = require("express");
const controller = require("./inventories.controller");
const router = express.Router();

router.post("/stock-in", controller.create);
router.post("/stock-out", controller.create);
router.post("/adjust", controller.create);
router.post("/reserve", controller.create);
router.post("/release", controller.create);
router.get("/", controller.list);
router.post("/", controller.create);
router.post("/bulk", controller.bulk);
router.get("/:id", controller.get);
router.put("/:id", controller.update);
router.patch("/:id/status", controller.status);
router.delete("/:id", controller.remove);
module.exports = router;
