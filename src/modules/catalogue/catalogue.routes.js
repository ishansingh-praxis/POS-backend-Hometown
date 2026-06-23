const express = require("express");
const controller = require("./catalogue.controller");
const router = express.Router();

router.get("/summary", controller.summary);
router.get("/full", controller.full);
router.get("/search", controller.search);
router.get("/store/:storeCode", controller.byStore);
router.get("/product/:sku", controller.byProduct);
module.exports = router;
