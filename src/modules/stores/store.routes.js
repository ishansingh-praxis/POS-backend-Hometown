const express = require("express");
const controller = require("./store.controller");
const router = express.Router();

router.get("/", controller.list);
router.get("/cashier-summary", controller.cashierSummary);
router.get("/:storeCode", controller.get);
router.post("/", controller.create);
router.put("/:storeCode", controller.update);
router.delete("/:storeCode", controller.remove);

module.exports = router;
