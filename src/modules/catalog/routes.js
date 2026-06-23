const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.get("/home", controller.home);
router.get("/filters", controller.filters);
router.get("/", controller.list);
router.get("/:id", controller.get);

module.exports = router;
