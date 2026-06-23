const express = require("express");
const controller = require("./import-export.controller");
const router = express.Router();

router.post("/import", controller.create);
router.get("/export", controller.list);
router.get("/", controller.list);
router.post("/", controller.create);
router.post("/bulk", controller.bulk);
router.get("/:id", controller.get);
router.put("/:id", controller.update);
router.patch("/:id/status", controller.status);
router.delete("/:id", controller.remove);
module.exports = router;
